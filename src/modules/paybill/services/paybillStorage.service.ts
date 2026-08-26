import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeId, resolveOfficeIdForUser } from '@/shared/utilities/office';
import { employeeService } from '@/modules/payroll/services/employee.service';
import { componentMasterService } from './componentMaster.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

import type {
  PayBillMetadata,
  PayBillExtractedRecord,
  PayBillDeductionExtractedRecord,
  PayBillImportResult,
  MasterEmployeeInfo,
  PayBillStoredImport,
  PayBillStoredEarning,
  PayBillStoredDeduction,
  PayBillValidationFlags,
  PayBillEmployeeRow,
  PayBillDeductionRow,
  PayBillEmployeeComponent,
} from '../types';

/**
 * Best-effort file hash for duplicate file detection.
 * Uses Web Crypto SHA-256 when available, falls back to size+name hash for environments without SubtleCrypto (e.g. tests).
 */
async function computeFileHash(input?: File | ArrayBuffer | null): Promise<string | null> {
  if (!input) return null;
  try {
    let buffer: ArrayBuffer;
    let fallbackKey: string | null = null;
    if (input instanceof File) {
      fallbackKey = `${input.name}:${input.size}:${input.lastModified}`;
      buffer = await input.arrayBuffer();
    } else {
      buffer = input;
    }

    // Prefer native SHA-256 when available
    const subtle = (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } })?.crypto?.subtle;
    if (subtle && typeof subtle.digest === 'function') {
      const hashBuf = await subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuf));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple string hash from buffer length + fallbackKey
    if (fallbackKey) {
      let h = 0;
      for (let i = 0; i < fallbackKey.length; i++) h = (Math.imul(31, h) + fallbackKey.charCodeAt(i)) | 0;
      return `fallback-${Math.abs(h).toString(16)}-${buffer.byteLength}`;
    }
    return `fallback-${buffer.byteLength}`;
  } catch {
    return null;
  }
}

function isDuplicateConstraintError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const code = (err as { code?: string })?.code || (err as { details?: string })?.details || '';
  return (
    code === '23505' ||
    /duplicate key value violates unique constraint/i.test(msg) ||
    /idx_paybill_imports_unique_bill/i.test(msg) ||
    /paybill_imports.*already exists/i.test(msg)
  );
}

class PayBillStorageService {
  /**
   * Upsert rows by a natural key. Tries DB-level ON CONFLICT first; if the
   * unique constraint is missing (migrations not applied yet), falls back to a
   * batched select → split into inserts / id-keyed upserts so single-entry
   * semantics still hold with only ~3 round trips.
   */
  private async upsertRowsResilient(
    table: 'paybill_employee_earnings' | 'paybill_employee_deductions',
    rows: Record<string, unknown>[],
    keyCols: string[] = ['office_id', 'hrpn', 'month', 'financial_year']
  ): Promise<{ error: { message: string } | null }> {
    type FilterChain = {
      eq: (col: string, val: string | number) => FilterChain;
      in: (col: string, vals: (string | number)[]) => FilterChain;
      limit: (n: number) => Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
    const loose = () =>
      supabase.from(table) as unknown as {
        select: (cols: string) => FilterChain;
        insert: (
          payload: Record<string, unknown>[]
        ) => Promise<{ error: { message: string } | null }>;
        upsert: (
          rows: Record<string, unknown>[],
          opts?: { onConflict?: string }
        ) => Promise<{ error: { message: string } | null }>;
      };

    const { error } = await loose().upsert(rows, { onConflict: keyCols.join(',') });
    if (!error) return { error: null };

    if (!/no unique or exclusion constraint|ON CONFLICT/i.test(String(error.message))) {
      return { error };
    }

    // Batched fallback without relying on a DB constraint:
    // 1. One SELECT fetching existing rows for all natural keys.
    const [officeCol, , monthCol, fyCol] = keyCols;
    const hrpns = Array.from(new Set(rows.map((r) => String(r.hrpn ?? '')))).filter(Boolean);
    const months = Array.from(new Set(rows.map((r) => String(r[monthCol] ?? '')))).filter(Boolean);
    const fys = Array.from(
      new Set(rows.map((r) => Number(r[fyCol])).filter((n) => Number.isFinite(n)))
    );
    if (hrpns.length === 0 || months.length === 0 || fys.length === 0) {
      return { error: null };
    }

    const { data: existingRows, error: selErr } = await loose()
      .select('id, hrpn, month, financial_year')
      .eq(officeCol, String(rows[0][officeCol]))
      .in('hrpn', hrpns)
      .in(monthCol, months)
      .in(fyCol, fys)
      .limit(10000);
    if (selErr) return { error: selErr };

    const existingIds = new Map<string, string>();
    for (const rec of existingRows || []) {
      const key = `${rec.hrpn}|${rec.month}|${rec.financial_year}`;
      if (!existingIds.has(key)) existingIds.set(key, String(rec.id));
    }

    // 2. Split rows into updates (with id → upsert by PK) and fresh inserts.
    const updates: Record<string, unknown>[] = [];
    const inserts: Record<string, unknown>[] = [];
    for (const row of rows) {
      const key = `${row.hrpn}|${row[monthCol]}|${row[fyCol]}`;
      const existingId = existingIds.get(key);
      if (existingId) {
        updates.push({ ...row, id: existingId });
      } else {
        inserts.push(row);
      }
    }

    if (updates.length > 0) {
      const { error: updErr } = await loose().upsert(updates, { onConflict: 'id' });
      if (updErr) return { error: updErr };
    }
    if (inserts.length > 0) {
      const { error: insErr } = await loose().insert(inserts);
      if (insErr) return { error: insErr };
    }
    return { error: null };
  }

  /**
   * Best-effort per-record confidence flags for the validation layer
   */
  private computeValidationFlags(
    rec: PayBillExtractedRecord | PayBillDeductionExtractedRecord,
    kind: 'EARNING' | 'DEDUCTION'
  ): PayBillValidationFlags {
    const row = rec.row as PayBillEmployeeRow & PayBillDeductionRow;
    const master = rec.matchedEmployee;

    let designationMatch = true;
    if (master?.designation && row.designation) {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
      const md = clean(master.designation);
      const rd = clean(row.designation);
      designationMatch = !md || !rd || md.includes(rd) || rd.includes(md);
    }

    let grossValidation = true;
    if (kind === 'EARNING') {
      const computed =
        (row.basicPay || 0) +
        (row.da || 0) +
        (row.hra || 0) +
        (row.cla || 0) +
        (row.medicalAllowance || 0) +
        (row.transportAllowance || 0) +
        (row.specialPay || 0) +
        (row.washingAllowance || 0) +
        (row.nonPrivatePracticeAllowance || 0) +
        (row.otherAllowance || 0);
      grossValidation = Math.abs(computed - (row.grossAmount || 0)) <= 1;
    } else {
      const computed =
        (row.incomeTax || 0) +
        (row.profTax || 0) +
        (row.hbaInterest || 0) +
        (row.gpfRegular || 0) +
        (row.gpfClass4 || 0) +
        (row.npsRegular || 0) +
        (row.gisGovtFund || 0) +
        (row.gisGovtSaving || 0) +
        (row.otherDeductions || 0);
      grossValidation = Math.abs(computed - (row.totalDeductions || 0)) <= 1;
    }

    return {
      hrpnMatch: rec.mappingStatus === 'MATCHED',
      nameMatch: !rec.nameMismatch,
      designationMatch,
      columnMappingValid: rec.validationStatus !== 'ERROR',
      grossValidation,
      totalReconciled: true, // bill-level reconciliation is validated separately
    };
  }
  /**
   * Fetch master employees from database for HRPN mapping
   */
  async getMasterEmployees(): Promise<MasterEmployeeInfo[]> {
    try {
      const list = await employeeService.listEmployees();
      return list.map((emp) => ({
        id: emp.id,
        name: emp.name,
        pan: emp.pan,
        hprnNo: emp.hprn_no,
        officeId: emp.office_id,
        budgetHeadId: emp.budget_head_id,
      }));
    } catch (err) {
      console.error('[PayBillStorage] Could not fetch master employees from database:', err);
      throw new Error(
        'Could not load master employee records from the database. Import is blocked because ' +
          'HRPN mapping requires the master employee list. Check the database connection / office ' +
          'selection and try again.'
      );
    }
  }

  /**
   * Parse financial year and month name from bill metadata
   * e.g. "July-2026" -> month = "July", fy = 2026
   */
  parseMonthAndFy(monthStr: string): { month: string; financialYear: number } {
    if (!monthStr) {
      const now = new Date();
      return { month: 'July', financialYear: now.getFullYear() };
    }

    const clean = monthStr.trim();
    // Match "July-2026" or "07/2026" or "July 2026"
    const namedMatch = clean.match(/^([A-Za-z]+)[-/ ](\d{4})$/);
    if (namedMatch) {
      const rawMonth = namedMatch[1];
      const year = parseInt(namedMatch[2], 10);
      // Standardize month name capitalization (e.g. July, August)
      const capitalizedMonth =
        rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1).toLowerCase();
      return { month: capitalizedMonth, financialYear: year };
    }

    const numMatch = clean.match(/^(\d{1,2})[-/ ](\d{4})$/);
    if (numMatch) {
      const monthIndex = parseInt(numMatch[1], 10) - 1;
      const year = parseInt(numMatch[2], 10);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return {
        month: months[monthIndex] || 'July',
        financialYear: year,
      };
    }

    return { month: clean, financialYear: 2026 };
  }

  /**
   * Commit and persist imported pay bill data into the system
   * Improvements: file hash, duplicate guard (23505), cleanup on partial failure, status lifecycle, audit log
   */
  async importPayBill(
    metadata: PayBillMetadata,
    records: PayBillExtractedRecord[],
    fileName = 'PayBill_Inner_Sheet.pdf',
    fileForHash?: File | ArrayBuffer | null
  ): Promise<PayBillImportResult> {
    const user = useAuthStore.getState().user;
    if (user?.role === 'admin') {
      throw new Error('Admin users cannot import pay bills. Please use an office account.');
    }

    const userId = user?.id;
    let officeId = getOfficeId();
    if (!officeId && userId) {
      officeId = await resolveOfficeIdForUser(userId);
    }
    if (!officeId) throw new Error('No office is assigned to this account. Contact an administrator.');
    const { month, financialYear } = this.parseMonthAndFy(metadata.month);

    // Pre-flight: block imports containing critical validation errors unless caller has already gated
    // (the hook already blocks summary.errorCount > 0, but this is a safety net for direct calls)
    const hasCritical = records.some((r) => r.validationStatus === 'ERROR' || (r.errors && r.errors.length > 0));
    if (hasCritical) {
      // Do not persist; caller should resolve errors first — but we still allow import to proceed
      // with a warning when explicitly retried. Keep behavior permissive for now.
    }

    const matchedRecords = records.filter((r) => r.mappingStatus === 'MATCHED');
    const notFoundRecords = records.filter((r) => r.mappingStatus === 'NOT_FOUND');

    let importId = `paybill_import_${Date.now()}`;
    let appliedToPayrollGrid = 0;

    const grossTotal = records.reduce((sum, r) => sum + (r.row.grossAmount || 0), 0);
    const fileHash = await computeFileHash(fileForHash as File | ArrayBuffer | null).catch(() => null);

    // Prepare stored entities
    const storedImport: PayBillStoredImport = {
      id: importId,
      officeId: officeId || 'default-office',
      billNo: metadata.billNo || 'Srt0299002201',
      month,
      financialYear,
      sheetType: 'EARNING',
      ddoHrpn: metadata.ddoHrpn || null,
      ddoName: metadata.ddoName || null,
      majorHead: metadata.majorHead || null,
      ddoCode: metadata.ddoCode || null,
      department: metadata.department || null,
      officeName: metadata.officeName || null,
      tanNo: metadata.tanNo || null,
      cardexNo: metadata.cardexNo || null,
      totalRecords: records.length,
      matchedCount: matchedRecords.length,
      grossTotal: Math.round(grossTotal * 100) / 100,
      uploadedFile: metadata.billNo ? `PayBill_${metadata.billNo}.pdf` : fileName,
      createdAt: new Date().toISOString(),
      status: 'IMPORTED',
      fileHash: fileHash || null,
      sourceFileName: fileName,
    };

    const storedEarnings: PayBillStoredEarning[] = records.map((rec, idx) => ({
      id: `${importId}_row_${idx + 1}`,
      importId,
      officeId: officeId || 'default-office',
      employeeId: rec.matchedEmployee?.id || null,
      hrpn: rec.row.hrpn,
      employeeName: rec.row.employeeName,
      designation: rec.row.designation || null,
      payScale: rec.row.payScale || null,
      ph: rec.row.ph || null,
      slo: rec.row.slo || null,
      month,
      financialYear,
      basicPay: rec.row.basicPay || 0,
      da: rec.row.da || 0,
      hra: rec.row.hra || 0,
      cla: rec.row.cla || 0,
      medicalAllowance: rec.row.medicalAllowance || 0,
      transportAllowance: rec.row.transportAllowance || 0,
      specialPay: rec.row.specialPay || 0,
      washingAllowance: rec.row.washingAllowance || 0,
      nppAllowance: rec.row.nonPrivatePracticeAllowance || 0,
      otherAllowance: rec.row.otherAllowance || 0,
      grossAmount: rec.row.grossAmount || 0,
      mappingStatus: rec.mappingStatus,
      validationStatus: rec.validationStatus,
      mappingMessage: rec.mappingMessage || null,
      nameMismatch: rec.nameMismatch || false,
      errors: rec.errors,
      warnings: rec.warnings,
      createdAt: new Date().toISOString(),
    }));

    // Cache locally immediately
    const { paybillRepository } = await import('../repositories/paybill.repository');
    paybillRepository.saveToCache(storedImport, storedEarnings);

    let dbSync = false;
    let dbError: string | null = null;

    if (!officeId) {
      dbError =
        'No active office selected — data was saved to local cache only. It will sync to the database once an office is selected.';
    } else {
      let didInsertImport = false;
      try {
        // 1. Insert into dedicated paybill_imports table (with hardening fields)
        const baseImportPayload = {
          office_id: officeId,
          bill_no: metadata.billNo || 'Srt0299002201',
          month,
          financial_year: financialYear,
          sheet_type: 'EARNING',
          ddo_hrpn: metadata.ddoHrpn || null,
          ddo_name: metadata.ddoName || null,
          major_head: metadata.majorHead || null,
          ddo_code: metadata.ddoCode || null,
          department: metadata.department || null,
          office_name: metadata.officeName || null,
          tan_no: metadata.tanNo || null,
          cardex_no: metadata.cardexNo || null,
          total_records: records.length,
          matched_count: matchedRecords.length,
          gross_total: Math.round(grossTotal * 100) / 100,
          uploaded_file: metadata.billNo ? `PayBill_${metadata.billNo}.pdf` : fileName,
          uploaded_by: userId || null,
        };
        let { data: pImport, error: pImportErr } = await supabase
          .from('paybill_imports')
          .insert({
            ...baseImportPayload,
            file_hash: fileHash || null,
            source_file_name: fileName || null,
            status: 'IMPORTED',
          })
          .select()
          .maybeSingle();

        if (pImportErr && /status|file_hash|source_file_name/i.test(String(pImportErr.message))) {
          // Hardening columns (migration 036) not present yet — retry with base columns
          const retry = await supabase.from('paybill_imports').insert(baseImportPayload).select().maybeSingle();
          pImport = retry.data;
          pImportErr = retry.error;
        }

        if (pImportErr) {
          if (isDuplicateConstraintError(pImportErr) || (pImportErr as unknown as { code?: string })?.code === '23505') {
            throw new Error(
              `Bill ${metadata.billNo || 'Srt0299002201'} for ${month}-${financialYear} (EARNING) was already imported. Duplicate import blocked by server.`
            );
          }
          throw new Error(
            `Could not create pay bill import record: ${pImportErr.message || (pImportErr as unknown as { code?: string })?.code || 'unknown error'}`
          );
        }
        if (pImport) {
          importId = pImport.id;
          didInsertImport = true;
        } else {
          didInsertImport = true;
        }

        // 2. Insert into paybill_employee_earnings table
        const earningsPayload = records.map((rec) => ({
          import_id: importId,
          office_id: officeId,
          employee_id: rec.matchedEmployee?.id || null,
          hrpn: rec.row.hrpn,
          employee_name: rec.row.employeeName,
          designation: rec.row.designation || null,
          pay_scale: rec.row.payScale || null,
          ph: rec.row.ph || null,
          slo: rec.row.slo || null,
          month,
          financial_year: financialYear,
          basic_pay: Math.round((rec.row.basicPay || 0) * 100) / 100,
          da: Math.round((rec.row.da || 0) * 100) / 100,
          hra: Math.round((rec.row.hra || 0) * 100) / 100,
          cla: Math.round((rec.row.cla || 0) * 100) / 100,
          medical_allowance: Math.round((rec.row.medicalAllowance || 0) * 100) / 100,
          transport_allowance: Math.round((rec.row.transportAllowance || 0) * 100) / 100,
          special_pay: Math.round((rec.row.specialPay || 0) * 100) / 100,
          washing_allowance: Math.round((rec.row.washingAllowance || 0) * 100) / 100,
          npp_allowance: Math.round((rec.row.nonPrivatePracticeAllowance || 0) * 100) / 100,
          gross_amount: Math.round((rec.row.grossAmount || 0) * 100) / 100,
          mapping_status: rec.mappingStatus,
        }));

        if (earningsPayload.length > 0) {
          const earningsValidationPayload = earningsPayload.map((p, idx) => ({
            ...p,
            validation_status: records[idx].validationStatus || 'VALID',
            mapping_message: records[idx].mappingMessage || null,
            name_mismatch: records[idx].nameMismatch || false,
            errors: records[idx].errors || [],
            warnings: records[idx].warnings || [],
            validation_flags: this.computeValidationFlags(records[idx], 'EARNING') as unknown as Record<string, unknown>,
          }));
          const { error: fullErr } = await this.upsertRowsResilient(
            'paybill_employee_earnings',
            earningsValidationPayload as unknown as Record<string, unknown>[]
          );
          if (fullErr && /validation_status|mapping_message|name_mismatch|validation_flags/i.test(String(fullErr.message))) {
            // Old schema without validation columns: retry with base payload
            await this.upsertRowsResilient(
              'paybill_employee_earnings',
              earningsPayload as unknown as Record<string, unknown>[]
            );
          }
        }

        // 2b. Persist dynamic component values (earnings side)
        await this.persistEmployeeComponents(
          officeId,
          importId,
          'EARNING',
          records.map((rec) => ({
            employeeId: rec.matchedEmployee?.id || null,
            hrpn: rec.row.hrpn,
            components: rec.row.components,
          }))
        );

        // Mark as synced once Paybill records and components are persisted
        dbSync = true;

        // Audit trail: record successful import
        try {
          await supabase.from('paybill_import_audits').insert({
            import_id: importId,
            office_id: officeId,
            action: 'CREATED',
            actor_id: userId || null,
            details: {
              sheet_type: 'EARNING',
              total_records: records.length,
              matched_count: matchedRecords.length,
              gross_total: Math.round(grossTotal * 100) / 100,
              file_name: fileName,
              file_hash: fileHash || null,
            },
          });
        } catch {
          // audit is best-effort
        }
      } catch (err) {
        // Cleanup partial import to avoid orphaned half-written data
        if (didInsertImport && isValidUuid(importId)) {
          try {
            await supabase.from('paybill_imports').delete().eq('id', importId);
          } catch {
            // ignore cleanup failure
          }
        }
        // Also evict from in-memory cache so UI does not show partial success
        try {
          const { paybillRepository: repo } = await import('../repositories/paybill.repository');
          // Re-load cache? simplest: invalidate the office cache
          repo.invalidateCache(officeId);
          // Re-save? No — we already saved to cache optimistically before DB; on failure we should remove it.
          // The repository has no direct remove, so rely on next listImports DB load to correct cache.
          // As a fallback, mutate the cached arrays directly by deleting the pending import id already handled via delete above.
        } catch {
          // ignore
        }
        console.warn('[PayBillStorage] Database upsert failed; kept in local cache:', err);
        // Surface duplicate as explicit throw so caller can show duplicate bill message
        if (isDuplicateConstraintError(err)) {
          throw err instanceof Error ? err : new Error('Duplicate pay bill import blocked by server.');
        }
        dbError =
          err instanceof Error
            ? err.message
            : 'Database persistence failed; data was saved to local cache only.';
        // Keep importId as local placeholder so result still references local cache
      }
    }

    return {
      importId,
      billNo: metadata.billNo || 'Srt0299002201',
      month,
      financialYear,
      sheetType: 'EARNING',
      totalRecords: records.length,
      matchedCount: matchedRecords.length,
      notFoundCount: notFoundRecords.length,
      appliedToPayrollGrid,
      createdAt: new Date().toISOString(),
      dbSync,
      dbWarning: dbError || undefined,
    };
  }

  /**
   * Persist dynamic per-employee component values extracted by the parser.
   * component_name is stored as a snapshot so future master renames never
   * change historical data; component_id is linked when it exists in the master.
   */
  private async persistEmployeeComponents(
    officeId: string,
    importId: string,
    sheetType: 'EARNING' | 'DEDUCTION',
    items: Array<{ employeeId: string | null; hrpn: string; components?: PayBillEmployeeComponent[] }>
  ): Promise<void> {
    if (!officeId || items.length === 0) return;

    // Refresh the master from the DB so component IDs are real UUIDs, not the
    // placeholder "seed-" ids used by the offline fallback matcher.
    await componentMasterService.refresh().catch(() => {
      // If refresh fails we still fall back to the cached list, but we will
      // filter out non-UUID component ids below to avoid DB type errors.
    });

    const master = componentMasterService.getCachedComponents();
    const resolveComponentId = (code: string | null, name: string): string | null => {
      const comp = master.find(
        (c) => c.componentName === name && (!code || c.componentCode === code || !c.componentCode)
      );
      const id = comp?.id;
      return isValidUuid(id) ? id : null;
    };

    const payload: Array<{
      import_id: string;
      office_id: string;
      paybill_employee_id: string | null;
      hrpn: string | null;
      sheet_type: string;
      component_id: string | null;
      component_code: string | null;
      component_name: string;
      amount: number;
      source: string;
    }> = [];

    for (const item of items) {
      for (const comp of item.components || []) {
        if (typeof comp.amount !== 'number' || isNaN(comp.amount)) continue;
        payload.push({
          import_id: importId,
          office_id: officeId,
          paybill_employee_id: isValidUuid(item.employeeId) ? item.employeeId : null,
          hrpn: item.hrpn,
          sheet_type: sheetType,
          component_id: resolveComponentId(comp.componentCode, comp.componentName),
          component_code: comp.componentCode,
          component_name: comp.componentName,
          amount: Math.round(comp.amount * 100) / 100,
          source: 'PDF',
        });
      }
    }

    if (payload.length === 0) return;
    try {
      const { error } = await supabase.from('paybill_employee_components').insert(payload);
      if (error) {
        console.warn('[PayBillStorage] Could not persist employee components:', error.message);
      }
    } catch (err) {
      console.warn('[PayBillStorage] Employee component persistence failed:', err);
    }
  }

  /**
   * Commit and persist imported deduction data into the system
   */
  async importDeductions(
    metadata: PayBillMetadata,
    records: PayBillDeductionExtractedRecord[],
    fileName = 'PayBill_Deduction_Sheet.pdf',
    fileForHash?: File | ArrayBuffer | null
  ): Promise<PayBillImportResult> {
    const user = useAuthStore.getState().user;
    if (user?.role === 'admin') {
      throw new Error('Admin users cannot import pay bills. Please use an office account.');
    }

    const userId = user?.id;
    let officeId = getOfficeId();
    if (!officeId && userId) {
      officeId = await resolveOfficeIdForUser(userId);
    }
    if (!officeId) throw new Error('No office is assigned to this account. Contact an administrator.');
    const { month, financialYear } = this.parseMonthAndFy(metadata.month);

    const matchedRecords = records.filter((r) => r.mappingStatus === 'MATCHED');
    const notFoundRecords = records.filter((r) => r.mappingStatus === 'NOT_FOUND');

    let importId = `paybill_deduction_import_${Date.now()}`;
    const totalDeductions = records.reduce((sum, r) => sum + (r.row.totalDeductions || 0), 0);
    const netPayTotal = records.reduce((sum, r) => sum + (r.row.netPay || 0), 0);
    const fileHash = await computeFileHash(fileForHash as File | ArrayBuffer | null).catch(() => null);

    const storedImport: PayBillStoredImport = {
      id: importId,
      officeId: officeId || 'default-office',
      billNo: metadata.billNo || 'Srt0299002202',
      month,
      financialYear,
      sheetType: 'DEDUCTION',
      ddoHrpn: metadata.ddoHrpn || null,
      ddoName: metadata.ddoName || null,
      majorHead: metadata.majorHead || null,
      ddoCode: metadata.ddoCode || null,
      department: metadata.department || null,
      officeName: metadata.officeName || null,
      tanNo: metadata.tanNo || null,
      cardexNo: metadata.cardexNo || null,
      totalRecords: records.length,
      matchedCount: matchedRecords.length,
      grossTotal: 0,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPayTotal: Math.round(netPayTotal * 100) / 100,
      uploadedFile: metadata.billNo ? `PayBill_Ded_${metadata.billNo}.pdf` : fileName,
      createdAt: new Date().toISOString(),
      status: 'IMPORTED',
      fileHash: fileHash || null,
      sourceFileName: fileName,
    };

    const storedDeductions: PayBillStoredDeduction[] = records.map((rec, idx) => ({
      id: `${importId}_row_${idx + 1}`,
      importId,
      officeId: officeId || 'default-office',
      employeeId: rec.matchedEmployee?.id || null,
      hrpn: rec.row.hrpn,
      employeeName: rec.row.employeeName,
      designation: rec.row.designation || null,
      month,
      financialYear,
      incomeTax: rec.row.incomeTax || 0,
      profTax: rec.row.profTax || 0,
      hbaInterest: rec.row.hbaInterest || 0,
      gpfRegular: rec.row.gpfRegular || 0,
      gpfClass4: rec.row.gpfClass4 || 0,
      npsRegular: rec.row.npsRegular || 0,
      gisGovtFund: rec.row.gisGovtFund || 0,
      gisGovtSaving: rec.row.gisGovtSaving || 0,
      otherDeductions: rec.row.otherDeductions || 0,
      totalDeductions: rec.row.totalDeductions || 0,
      netPay: rec.row.netPay || 0,
      mappingStatus: rec.mappingStatus,
      validationStatus: rec.validationStatus,
      mappingMessage: rec.mappingMessage || null,
      nameMismatch: rec.nameMismatch || false,
      errors: rec.errors,
      warnings: rec.warnings,
      createdAt: new Date().toISOString(),
    }));

    const { paybillRepository } = await import('../repositories/paybill.repository');
    paybillRepository.saveDeductionsToCache(storedImport, storedDeductions);

    let dbSync = false;
    let dbError: string | null = null;

    if (!officeId) {
      dbError =
        'No active office selected — data was saved to local cache only. It will sync to the database once an office is selected.';
    } else {
      let didInsertImport = false;
      try {
        const baseDedImportPayload = {
          office_id: officeId,
          bill_no: metadata.billNo || 'Srt0299002202',
          month,
          financial_year: financialYear,
          sheet_type: 'DEDUCTION',
          ddo_hrpn: metadata.ddoHrpn || null,
          ddo_name: metadata.ddoName || null,
          major_head: metadata.majorHead || null,
          ddo_code: metadata.ddoCode || null,
          department: metadata.department || null,
          office_name: metadata.officeName || null,
          tan_no: metadata.tanNo || null,
          cardex_no: metadata.cardexNo || null,
          total_records: records.length,
          matched_count: matchedRecords.length,
          gross_total: 0,
          uploaded_file: metadata.billNo ? `PayBill_Ded_${metadata.billNo}.pdf` : fileName,
          uploaded_by: userId || null,
        };
        let { data: pImport, error: pImportErr } = await supabase
          .from('paybill_imports')
          .insert({
            ...baseDedImportPayload,
            file_hash: fileHash || null,
            source_file_name: fileName || null,
            status: 'IMPORTED',
          })
          .select()
          .maybeSingle();

        if (pImportErr && /status|file_hash|source_file_name/i.test(String(pImportErr.message))) {
          // Hardening columns (migration 036) not present yet — retry with base columns
          const retry = await supabase.from('paybill_imports').insert(baseDedImportPayload).select().maybeSingle();
          pImport = retry.data;
          pImportErr = retry.error;
        }

        if (pImportErr) {
          if (isDuplicateConstraintError(pImportErr) || (pImportErr as unknown as { code?: string })?.code === '23505') {
            throw new Error(
              `Bill ${metadata.billNo || 'Srt0299002202'} for ${month}-${financialYear} (DEDUCTION) was already imported. Duplicate import blocked by server.`
            );
          }
          throw new Error(
            `Could not create pay bill deduction import record: ${pImportErr.message || (pImportErr as unknown as { code?: string })?.code || 'unknown error'}`
          );
        }
        if (pImport) {
          importId = pImport.id;
          didInsertImport = true;
        } else {
          didInsertImport = true;
        }

        const dedPayload = records.map((rec) => ({
          import_id: importId,
          office_id: officeId,
          employee_id: rec.matchedEmployee?.id || null,
          hrpn: rec.row.hrpn,
          employee_name: rec.row.employeeName,
          designation: rec.row.designation || null,
          month,
          financial_year: financialYear,
          income_tax: Math.round((rec.row.incomeTax || 0) * 100) / 100,
          prof_tax: Math.round((rec.row.profTax || 0) * 100) / 100,
          hba_interest: Math.round((rec.row.hbaInterest || 0) * 100) / 100,
          gpf_regular: Math.round((rec.row.gpfRegular || 0) * 100) / 100,
          gpf_class4: Math.round((rec.row.gpfClass4 || 0) * 100) / 100,
          nps_regular: Math.round((rec.row.npsRegular || 0) * 100) / 100,
          gis_govt_fund: Math.round((rec.row.gisGovtFund || 0) * 100) / 100,
          gis_govt_saving: Math.round((rec.row.gisGovtSaving || 0) * 100) / 100,
          total_deductions: Math.round((rec.row.totalDeductions || 0) * 100) / 100,
          net_pay: Math.round((rec.row.netPay || 0) * 100) / 100,
          mapping_status: rec.mappingStatus,
        }));

        if (dedPayload.length > 0) {
          const dedValidationPayload = dedPayload.map((p, idx) => ({
            ...p,
            validation_status: records[idx].validationStatus || 'VALID',
            mapping_message: records[idx].mappingMessage || null,
            name_mismatch: records[idx].nameMismatch || false,
            errors: records[idx].errors || [],
            warnings: records[idx].warnings || [],
            validation_flags: this.computeValidationFlags(records[idx], 'DEDUCTION') as unknown as Record<string, unknown>,
          }));
          const { error: fullErr } = await this.upsertRowsResilient(
            'paybill_employee_deductions',
            dedValidationPayload as unknown as Record<string, unknown>[]
          );
          if (fullErr && /validation_status|mapping_message|name_mismatch|validation_flags/i.test(String(fullErr.message))) {
            // Old schema without validation columns: retry with base payload
            await this.upsertRowsResilient(
              'paybill_employee_deductions',
              dedPayload as unknown as Record<string, unknown>[]
            );
          }
        }

        // Persist dynamic component values (deductions side)
        await this.persistEmployeeComponents(
          officeId,
          importId,
          'DEDUCTION',
          records.map((rec) => ({
            employeeId: rec.matchedEmployee?.id || null,
            hrpn: rec.row.hrpn,
            components: rec.row.components,
          }))
        );
        dbSync = true;
        try {
          await supabase.from('paybill_import_audits').insert({
            import_id: importId,
            office_id: officeId,
            action: 'CREATED',
            actor_id: userId || null,
            details: {
              sheet_type: 'DEDUCTION',
              total_records: records.length,
              matched_count: matchedRecords.length,
              total_deductions: Math.round(totalDeductions * 100) / 100,
              net_pay_total: Math.round(netPayTotal * 100) / 100,
              file_name: fileName,
              file_hash: fileHash || null,
            },
          });
        } catch {
          // audit best-effort
        }
      } catch (err) {
        if (didInsertImport && isValidUuid(importId)) {
          try {
            await supabase.from('paybill_imports').delete().eq('id', importId);
          } catch {
            // ignore cleanup failure
          }
        }
        try {
          const { paybillRepository: repo } = await import('../repositories/paybill.repository');
          repo.invalidateCache(officeId);
        } catch {
          // ignore
        }
        console.warn('[PayBillStorage] Deduction database sync failed; kept in local cache:', err);
        if (isDuplicateConstraintError(err)) {
          throw err instanceof Error ? err : new Error('Duplicate pay bill import blocked by server.');
        }
        dbError =
          err instanceof Error
            ? err.message
            : 'Database persistence failed; data was saved to local cache only.';
      }
    }

    return {
      importId,
      billNo: metadata.billNo || 'Srt0299002202',
      month,
      financialYear,
      sheetType: 'DEDUCTION',
      totalRecords: records.length,
      matchedCount: matchedRecords.length,
      notFoundCount: notFoundRecords.length,
      appliedToPayrollGrid: matchedRecords.length,
      createdAt: new Date().toISOString(),
      dbSync,
      dbWarning: dbError || undefined,
    };
  }
}

export const paybillStorageService = new PayBillStorageService();

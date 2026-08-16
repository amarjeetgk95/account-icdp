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

export class PayBillStorageService {
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
   */
  async importPayBill(
    metadata: PayBillMetadata,
    records: PayBillExtractedRecord[],
    fileName = 'PayBill_Inner_Sheet.pdf'
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

    let importId = `paybill_import_${Date.now()}`;
    let appliedToPayrollGrid = 0;

    const grossTotal = records.reduce((sum, r) => sum + (r.row.grossAmount || 0), 0);

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
      try {
        // 1. Insert into dedicated paybill_imports table
        const { data: pImport, error: pImportErr } = await supabase
          .from('paybill_imports')
          .insert({
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
          })
          .select()
          .maybeSingle();

        if (pImportErr) {
          throw new Error(
            `Could not create pay bill import record: ${pImportErr.message || pImportErr.code || 'unknown error'}`
          );
        }
        if (pImport) {
          importId = pImport.id;
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
          const { error: fullErr } = await supabase
            .from('paybill_employee_earnings')
            .upsert(earningsValidationPayload);
          if (fullErr && /validation_status|mapping_message|name_mismatch|validation_flags/i.test(String(fullErr.message))) {
            // Old schema without validation columns: retry with base payload
            await supabase.from('paybill_employee_earnings').upsert(earningsPayload);
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

        // 3. Create a record in salary_imports for backward compatibility
        const { data: importRecord } = await supabase
          .from('salary_imports')
          .insert({
            office_id: officeId,
            excel_filename: metadata.billNo ? `PayBill_${metadata.billNo}.pdf` : fileName,
            financial_year: financialYear,
            total_records: records.length,
            matched_count: matchedRecords.length,
            uploaded_by: userId || null,
          })
          .select()
          .single();

        const legacyImportId = importRecord?.id || importId;

        // 4. Upsert employee_salary rows
        const salaryRows = records.map((rec) => {
          let statusStr: 'matched' | 'unmatched' | 'duplicate' | 'not_detected' = 'unmatched';
          if (rec.mappingStatus === 'MATCHED') statusStr = 'matched';
          else if (rec.mappingStatus === 'DUPLICATE') statusStr = 'duplicate';

          return {
            salary_import_id: legacyImportId,
            employee_id: rec.matchedEmployee?.id || null,
            hprn_no: rec.row.hrpn,
            office_id: officeId,
            name: rec.row.employeeName,
            month: month,
            financial_year: financialYear,
            gross_salary: Math.round(rec.row.grossAmount * 100) / 100,
            income_tax: 0,
            status: statusStr,
          };
        });

        if (salaryRows.length > 0) {
          await supabase.from('employee_salary').upsert(salaryRows, {
            onConflict: 'salary_import_id,hprn_no,month',
          });
        }

        // 5. Upsert to employee_salaries for matched records
        const payrollGridRows = matchedRecords
          .filter((r) => r.matchedEmployee?.id)
          .map((r) => ({
            employee_id: r.matchedEmployee!.id,
            office_id: officeId,
            financial_year: financialYear,
            month: month,
            gross: Math.round(r.row.grossAmount * 100) / 100,
            da: Math.round(r.row.da * 100) / 100,
            tax: 0,
          }));

        if (payrollGridRows.length > 0) {
          const { error: gridError } = await supabase
            .from('employee_salaries')
            .upsert(payrollGridRows, {
              onConflict: 'employee_id,financial_year,month',
            });

          if (!gridError) {
            appliedToPayrollGrid = payrollGridRows.length;
          }
          dbSync = true;
        }
      } catch (err) {
        console.warn('[PayBillStorage] Database upsert failed; kept in local cache:', err);
        dbError =
          err instanceof Error
            ? err.message
            : 'Database persistence failed; data was saved to local cache only.';
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
    fileName = 'PayBill_Deduction_Sheet.pdf'
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
      try {
        const { data: pImport, error: pImportErr } = await supabase
          .from('paybill_imports')
          .insert({
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
          })
          .select()
          .maybeSingle();

        if (pImportErr) {
          throw new Error(
            `Could not create pay bill deduction import record: ${pImportErr.message || pImportErr.code || 'unknown error'}`
          );
        }
        if (pImport) {
          importId = pImport.id;
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
          const { error: fullErr } = await supabase
            .from('paybill_employee_deductions')
            .upsert(dedValidationPayload);
          if (fullErr && /validation_status|mapping_message|name_mismatch|validation_flags/i.test(String(fullErr.message))) {
            // Old schema without validation columns: retry with base payload
            await supabase.from('paybill_employee_deductions').upsert(dedPayload);
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
      } catch (err) {
        console.warn('[PayBillStorage] Deduction database sync failed; kept in local cache:', err);
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

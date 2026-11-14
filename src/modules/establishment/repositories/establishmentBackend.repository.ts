import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { EstablishmentEmployee } from '../types';
import { establishmentListDbSchema } from '../validation/establishment.schema';

/**
 * HRPN No. is the single source of truth: the DB carries a unique index on
 * hrpn_no, so a 23505 is always a duplicate-HRPN attempt. Surface it as a
 * human-readable error instead of a raw Postgres message.
 */
function toFriendlyHrpnError(err: unknown, hrpn = ''): Error {
  const code = (err as { code?: string })?.code;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const isUniqueViolation =
    code === '23505' ||
    /duplicate key value violates unique constraint/i.test(msg) ||
    /establishment.*hrpn/i.test(msg);
  if (isUniqueViolation) {
    return new Error(
      hrpn
        ? `Duplicate HRPN No. "${hrpn}" — Establishment directory already contains this HRPN. HRPN No. must be unique.`
        : 'Duplicate HRPN No. — Establishment directory already contains this HRPN. HRPN No. must be unique.'
    );
  }
  return err instanceof Error ? err : new Error(msg || 'Failed to save employee');
}

export interface SaveEmployeeOptions {
  /**
   * Pay history is not edited by the employee form. When unchanged, skip the
   * SELECT + DELETE + UPSERT round-trips against establishment_pay_entries.
   */
  syncPayEntries?: boolean;
}

class EstablishmentBackendRepository {
  async listEmployees(): Promise<EstablishmentEmployee[] | null> {
    try {
      // 1. Fetch employees (manual sequence order first, NULL display_order last) and
      // their pay history in parallel — both are full-register reads.
      const [empResult, payResult] = await Promise.all([
        supabase
          .from('establishment_employees')
          .select('*')
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('name'),
        supabase
          .from('establishment_pay_entries')
          .select('*')
          .order('effective_date'),
      ]);

      const { data: empRows, error: empErr } = empResult;
      if (empErr) {
        console.warn('[EstablishmentBackend] listEmployees error:', empErr);
        return null;
      }

      if (!empRows || empRows.length === 0) {
        return [];
      }

      const { data: payRows, error: payErr } = payResult;
      if (payErr) {
        console.warn('[EstablishmentBackend] pay_entries error:', payErr);
      }

      const payEntriesByEmp = new Map<string, Array<{
        id: string;
        effectiveDate: string;
        basicPay: number;
        payScale?: string;
        levelCell?: string;
        notes?: string;
      }>>();

      for (const pe of (payRows || []) as Array<Record<string, unknown>>) {
        const empId = String(pe.employee_id);
        if (!payEntriesByEmp.has(empId)) {
          payEntriesByEmp.set(empId, []);
        }
        payEntriesByEmp.get(empId)!.push({
          id: String(pe.id),
          effectiveDate: String(pe.effective_date || ''),
          basicPay: Number(pe.basic_pay) || 0,
          payScale: pe.pay_scale ? String(pe.pay_scale) : undefined,
          levelCell: pe.level_cell ? String(pe.level_cell) : undefined,
          notes: pe.notes ? String(pe.notes) : undefined,
        });
      }

      const employees: EstablishmentEmployee[] = (empRows as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        hrpnNo: String(r.hrpn_no || ''),
        name: String(r.name || ''),
        nameGu: r.name_gu ? String(r.name_gu) : undefined,
        mobileNo: r.mobile_no ? String(r.mobile_no) : undefined,
        designation: r.designation ? String(r.designation) : undefined,
        designationGu: r.designation_gu ? String(r.designation_gu) : undefined,
        cadreClass: r.cadre_class ? String(r.cadre_class) : undefined,
        pan: r.pan ? String(r.pan) : undefined,
        payScale: r.pay_scale ? String(r.pay_scale) : undefined,
        gradePay: r.grade_pay ? String(r.grade_pay) : undefined,
        payLevel: r.pay_level ? String(r.pay_level) : undefined,
        payCell: r.pay_cell ? String(r.pay_cell) : undefined,
        ppaNo: r.ppa_no ? String(r.ppa_no) : undefined,
        joinDate: r.join_date ? String(r.join_date) : undefined,
        transferDate: r.transfer_date ? String(r.transfer_date) : undefined,
        headquarter: r.headquarter ? String(r.headquarter) : undefined,
        budgetHeadId: r.budget_head_id ? String(r.budget_head_id) : undefined,
        displayOrder:
          r.display_order === null || r.display_order === undefined || r.display_order === ''
            ? null
            : Number(r.display_order),
        active: Boolean(r.active ?? true),
        quartersAddress: r.quarters_address ? String(r.quarters_address) : undefined,
        gisGroup: r.gis_group ? String(r.gis_group) : undefined,
        allowances: (r.allowances as EstablishmentEmployee['allowances']) || {},
        deductions: (r.deductions as EstablishmentEmployee['deductions']) || {},
        payEntries: payEntriesByEmp.get(String(r.id)) || [],
      }));

      const parsed = establishmentListDbSchema.safeParse(employees);
      if (parsed.success) {
        return parsed.data;
      }
      return employees;
    } catch (err) {
      console.warn('[EstablishmentBackend] listEmployees caught error:', err);
      return null;
    }
  }

  async saveEmployee(
    employee: EstablishmentEmployee,
    options: SaveEmployeeOptions = {}
  ): Promise<EstablishmentEmployee> {
    try {
      const empId = employee.id || crypto.randomUUID();
      const syncPayEntries = options.syncPayEntries ?? true;
      const canonicalHrpn = typeof employee.hrpnNo === 'string' ? employee.hrpnNo.trim().toUpperCase() : '';
      const budgetHeadId =
        employee.budgetHeadId === null || employee.budgetHeadId === undefined
          ? ''
          : String(employee.budgetHeadId).trim();
      const displayOrder =
        typeof employee.displayOrder === 'number' && Number.isFinite(employee.displayOrder)
          ? Math.trunc(employee.displayOrder)
          : null;
      const empPayload = {
        id: empId,
        name: employee.name || '',
        name_gu: employee.nameGu ? employee.nameGu.trim() || null : null,
        mobile_no: employee.mobileNo ? employee.mobileNo.trim() || null : null,
        hrpn_no: canonicalHrpn || null,
        designation: employee.designation ? employee.designation.trim() || null : null,
        designation_gu: employee.designationGu ? employee.designationGu.trim() || null : null,
        cadre_class: employee.cadreClass ? employee.cadreClass.trim() || null : null,
        pan: employee.pan ? employee.pan.trim() || null : null,
        pay_scale: employee.payScale ? employee.payScale.trim() || null : null,
        grade_pay: employee.gradePay ? employee.gradePay.trim() || null : null,
        pay_level: employee.payLevel ? employee.payLevel.trim() || null : null,
        pay_cell: employee.payCell ? employee.payCell.trim() || null : null,
        ppa_no: employee.ppaNo ? employee.ppaNo.trim() || null : null,
        join_date: employee.joinDate ? employee.joinDate.trim() || null : null,
        transfer_date: employee.transferDate ? employee.transferDate.trim() || null : null,
        headquarter: employee.headquarter ? employee.headquarter.trim() || null : null,
        budget_head_id: budgetHeadId || null,
        display_order: displayOrder,
        active: employee.active ?? true,
        quarters_address: employee.quartersAddress ? employee.quartersAddress.trim() || null : null,
        gis_group: employee.gisGroup ? employee.gisGroup.trim() || null : null,
        allowances: (employee.allowances || {}) as unknown as Json,
        deductions: (employee.deductions || {}) as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      // Start the pay-history read alongside the employee upsert so it does
      // not add another serial round-trip.
      const existingPayIdsPromise: PromiseLike<string[]> =
        syncPayEntries && employee.id
          ? supabase
              .from('establishment_pay_entries')
              .select('id')
              .eq('employee_id', empId)
              .then(({ data }) => (data || []).map((p: { id: string }) => String(p.id)))
          : Promise.resolve([]);

      const { error: empErr } = await supabase.from('establishment_employees').upsert(empPayload);
      if (empErr) {
        console.error('[EstablishmentBackend] saveEmployee error:', empErr);
        throw toFriendlyHrpnError(empErr, canonicalHrpn);
      }

      let savedPayEntries = employee.payEntries || [];
      if (syncPayEntries && Array.isArray(employee.payEntries)) {
        const existingPeIds = await existingPayIdsPromise;
        const incomingPeIds = new Set(employee.payEntries.map((p) => p.id).filter(Boolean));
        const peToDelete = existingPeIds.filter((id) => !incomingPeIds.has(id));

        if (peToDelete.length > 0) {
          await supabase.from('establishment_pay_entries').delete().in('id', peToDelete);
        }

        if (employee.payEntries.length > 0) {
          const pePayloads = employee.payEntries.map((pe) => ({
            id: pe.id || crypto.randomUUID(),
            employee_id: empId,
            effective_date: pe.effectiveDate && pe.effectiveDate.trim() ? pe.effectiveDate.trim() : new Date().toISOString().split('T')[0],
            basic_pay: Number(pe.basicPay) || 0,
            pay_scale: pe.payScale ? pe.payScale.trim() || null : null,
            level_cell: pe.levelCell ? pe.levelCell.trim() || null : null,
            notes: pe.notes ? pe.notes.trim() || null : null,
            updated_at: new Date().toISOString(),
          }));

          const { error: peErr } = await supabase.from('establishment_pay_entries').upsert(pePayloads);
          if (peErr) {
            console.warn('[EstablishmentBackend] saveEmployee pay_entries error:', peErr);
          }
          savedPayEntries = pePayloads.map((p) => ({
            id: p.id,
            effectiveDate: p.effective_date,
            basicPay: p.basic_pay,
            payScale: p.pay_scale ?? undefined,
            levelCell: p.level_cell ?? undefined,
            notes: p.notes ?? undefined,
          }));
        } else {
          savedPayEntries = [];
        }
      }

      return {
        ...employee,
        id: empId,
        hrpnNo: canonicalHrpn,
        payEntries: savedPayEntries,
      };
    } catch (err) {
      console.error('[EstablishmentBackend] saveEmployee caught error:', err);
      throw toFriendlyHrpnError(err, typeof employee.hrpnNo === 'string' ? employee.hrpnNo.trim().toUpperCase() : '');
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('establishment_employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[EstablishmentBackend] deleteEmployee error:', error);
        throw error;
      }
    } catch (err) {
      console.error('[EstablishmentBackend] deleteEmployee caught error:', err);
      throw err;
    }
  }

  async replaceEmployees(employees: EstablishmentEmployee[]): Promise<EstablishmentEmployee[] | null> {
    try {
      const incomingIds = new Set(employees.map((e) => e.id).filter(Boolean));

      // 1. Delete removed employees
      const { data: existing } = await supabase.from('establishment_employees').select('id');
      const toDelete = (existing || [])
        .map((e) => String(e.id))
        .filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        await supabase.from('establishment_employees').delete().in('id', toDelete);
      }

      // 2. Batch upsert employees (single call, not sequential loop)
      const empPayloads = employees.map((emp) => {
        const empId = emp.id || crypto.randomUUID();
        const canonicalHrpn = typeof emp.hrpnNo === 'string' ? emp.hrpnNo.trim().toUpperCase() : '';
        const budgetHeadId =
          emp.budgetHeadId === null || emp.budgetHeadId === undefined
            ? ''
            : String(emp.budgetHeadId).trim();
        return {
          id: empId,
          name: emp.name || '',
          name_gu: emp.nameGu ? emp.nameGu.trim() || null : null,
          mobile_no: emp.mobileNo ? emp.mobileNo.trim() || null : null,
          hrpn_no: canonicalHrpn || null,
          designation: emp.designation ? emp.designation.trim() || null : null,
          designation_gu: emp.designationGu ? emp.designationGu.trim() || null : null,
          cadre_class: emp.cadreClass ? emp.cadreClass.trim() || null : null,
          pan: emp.pan ? emp.pan.trim() || null : null,
          pay_scale: emp.payScale ? emp.payScale.trim() || null : null,
          grade_pay: emp.gradePay ? emp.gradePay.trim() || null : null,
          pay_level: emp.payLevel ? emp.payLevel.trim() || null : null,
          pay_cell: emp.payCell ? emp.payCell.trim() || null : null,
          ppa_no: emp.ppaNo ? emp.ppaNo.trim() || null : null,
          join_date: emp.joinDate ? emp.joinDate.trim() || null : null,
          transfer_date: emp.transferDate ? emp.transferDate.trim() || null : null,
          headquarter: emp.headquarter ? emp.headquarter.trim() || null : null,
          budget_head_id: budgetHeadId || null,
          display_order:
            typeof emp.displayOrder === 'number' && Number.isFinite(emp.displayOrder)
              ? Math.trunc(emp.displayOrder)
              : null,
          active: emp.active ?? true,
          quarters_address: emp.quartersAddress ? emp.quartersAddress.trim() || null : null,
          gis_group: emp.gisGroup ? emp.gisGroup.trim() || null : null,
          allowances: (emp.allowances || {}) as unknown as Json,
          deductions: (emp.deductions || {}) as unknown as Json,
          updated_at: new Date().toISOString(),
        };
      });

      if (empPayloads.length > 0) {
        const { error: empErr } = await supabase.from('establishment_employees').upsert(empPayloads);
        if (empErr) throw toFriendlyHrpnError(empErr);
      }

      // 3. Batch upsert pay entries for all employees
      const allIncomingPeIds = new Set<string>();
      const allPayEntries: Array<{
        id: string;
        employee_id: string;
        effective_date: string;
        basic_pay: number;
        pay_scale: string | null;
        level_cell: string | null;
        notes: string | null;
        updated_at: string;
      }> = [];

      for (const emp of employees) {
        if (emp.payEntries && emp.payEntries.length > 0) {
          for (const pe of emp.payEntries) {
            const peId = pe.id || crypto.randomUUID();
            allIncomingPeIds.add(peId);
            allPayEntries.push({
              id: peId,
              employee_id: emp.id,
              effective_date: pe.effectiveDate && pe.effectiveDate.trim() ? pe.effectiveDate.trim() : new Date().toISOString().split('T')[0],
              basic_pay: Number(pe.basicPay) || 0,
              pay_scale: pe.payScale ? pe.payScale.trim() || null : null,
              level_cell: pe.levelCell ? pe.levelCell.trim() || null : null,
              notes: pe.notes ? pe.notes.trim() || null : null,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      const { data: existingPes } = await supabase.from('establishment_pay_entries').select('id');
      const peToDelete = (existingPes || [])
        .map((p) => String(p.id))
        .filter((id) => !allIncomingPeIds.has(id));

      if (peToDelete.length > 0) {
        await supabase.from('establishment_pay_entries').delete().in('id', peToDelete);
      }

      if (allPayEntries.length > 0) {
        const { error: peErr } = await supabase.from('establishment_pay_entries').upsert(allPayEntries);
        if (peErr) {
          console.warn('[EstablishmentBackend] replaceEmployees pay_entries error:', peErr);
        }
      }

      return this.listEmployees();
    } catch (err) {
      console.error('[EstablishmentBackend] replaceEmployees error:', err);
      throw toFriendlyHrpnError(err);
    }
  }

  /**
   * Persist manual sequence: writes 1..N display_order for the given id order.
   * Missing display_order column (migration 062 not applied) surfaces as a
   * friendly error instead of a raw Postgres message.
   */
  async reorderEmployees(orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        const { error } = await supabase
          .from('establishment_employees')
          .update({ display_order: i + 1, updated_at: new Date().toISOString() })
          .eq('id', orderedIds[i]);
        if (error) throw error;
      }
    } catch (err) {
      const msg = `${(err as { message?: string })?.message || ''} ${(err as { code?: string })?.code || ''}`.toLowerCase();
      if (msg.includes('display_order') || (err as { code?: string })?.code === '42703') {
        throw new Error(
          'Sequential order could not be saved: this server is missing the ordering column (migration 062). Please contact your administrator.'
        );
      }
      console.error('[EstablishmentBackend] reorderEmployees error:', err);
      throw err instanceof Error ? err : new Error('Failed to save employee order');
    }
  }

}

export const establishmentBackendRepository = new EstablishmentBackendRepository();

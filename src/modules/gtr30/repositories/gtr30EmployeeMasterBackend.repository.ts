import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';
import { gtr30EmployeeMasterDbSchema } from '../validation/gtr30EmployeeMaster.schema';
import { z } from 'zod';

function validateEmployeeMasterArray(raw: unknown): GTR30EmployeeMaster[] | null {
  const result = z.array(gtr30EmployeeMasterDbSchema).safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30EmployeeMasterBackend] validation failed:', result.error.flatten());
    return null;
  }
  return result.data as unknown as GTR30EmployeeMaster[];
}

function mapRowToEmployee(r: Record<string, unknown>): GTR30EmployeeMaster {
  return {
    id: String(r.id),
    srNo: Number(r.sr_no) || 0,
    name: String(r.name || ''),
    designation: String(r.designation || ''),
    designationGujarati: r.designation_gujarati ? String(r.designation_gujarati) : undefined,
    cadreClass: r.cadre_class ? String(r.cadre_class) : undefined,
    payScale: String(r.pay_scale || ''),
    gradePay: r.grade_pay ? String(r.grade_pay) : undefined,
    payLevelCell: r.pay_level_cell ? String(r.pay_level_cell) : undefined,
    ppaNo: r.ppa_no ? String(r.ppa_no) : undefined,
    currentPay: Number(r.current_pay) || 0,
    currentPayDate: r.current_pay_date ? String(r.current_pay_date) : undefined,
    hrpnNo: r.hrpn_no ? String(r.hrpn_no) : undefined,
    billCode: r.bill_code ? String(r.bill_code) : undefined,
    quarterAddress: r.quarter_address ? String(r.quarter_address) : undefined,
    insuranceGroup: r.insurance_group ? String(r.insurance_group) : undefined,
    insuranceType: (r.insurance_type as GTR30EmployeeMaster['insuranceType']) || undefined,
    hraPercent: Number(r.hra_percent) || 0,
    da: r.da !== undefined && r.da !== null ? Number(r.da) : undefined,
    transportAllowance: Number(r.transport_allowance) || 0,
    medicalAllowance: Number(r.medical_allowance) || 0,
    claAllowance: Number(r.cla_allowance) || 0,
    rentOfBuilding: r.rent_of_building !== undefined && r.rent_of_building !== null ? Number(r.rent_of_building) : undefined,
    professionalTax: r.professional_tax !== undefined && r.professional_tax !== null ? Number(r.professional_tax) : undefined,
    gis1981Insurance:
      r.gis1981_insurance !== undefined && r.gis1981_insurance !== null
        ? Number(r.gis1981_insurance)
        : r.gis_1981_insurance !== undefined && r.gis_1981_insurance !== null
        ? Number(r.gis_1981_insurance)
        : undefined,
    gis1981Savings:
      r.gis1981_savings !== undefined && r.gis1981_savings !== null
        ? Number(r.gis1981_savings)
        : r.gis_1981_savings !== undefined && r.gis_1981_savings !== null
        ? Number(r.gis_1981_savings)
        : undefined,
    npsPension: r.nps_pension !== undefined && r.nps_pension !== null ? Number(r.nps_pension) : undefined,
    societyDeduction: r.society_deduction !== undefined && r.society_deduction !== null ? Number(r.society_deduction) : undefined,
    remarks: r.remarks ? String(r.remarks) : undefined,
    payEntries: Array.isArray(r.pay_entries) ? r.pay_entries : [],
  };
}

class Gtr30EmployeeMasterBackendRepository {
  async listGroups(): Promise<GTR30MasterGroup[] | null> {
    try {
      const { data, error } = await supabase
        .from('gtr30_employee_master')
        .select('*')
        .order('sr_no');

      if (error) {
        console.warn('[GTR30Backend] list_gtr30_employee_master failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      const groupMap = new Map<string, { monthKey: string; billCode: string; employees: GTR30EmployeeMaster[] }>();

      for (const row of data as Array<Record<string, unknown>>) {
        const monthKey = String(row.month_key || '');
        const billCode = String(row.bill_code || '');
        const groupKey = `${monthKey.trim().toLowerCase()}::${billCode.trim().toLowerCase()}`;

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, { monthKey, billCode, employees: [] });
        }

        groupMap.get(groupKey)!.employees.push(mapRowToEmployee(row));
      }

      return Array.from(groupMap.values());
    } catch (err) {
      console.warn('[GTR30EmployeeMasterBackend] listGroups error:', err);
      return [];
    }
  }

  async getGroup(
    monthKey: string,
    billCode: string
  ): Promise<GTR30EmployeeMaster[] | null> {
    try {
      // Case-insensitive exact match via ilike (no wildcards) — mirrors local repo lower() key
      const { data, error } = await supabase
        .from('gtr30_employee_master')
        .select('*')
        .ilike('month_key', monthKey)
        .ilike('bill_code', billCode)
        .order('sr_no');

      if (error) {
        console.warn('[GTR30Backend] get_gtr30_employee_master failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];
      const employees = (data as Array<Record<string, unknown>>).map(mapRowToEmployee);
      return validateEmployeeMasterArray(employees) || employees;
    } catch (err) {
      console.warn('[GTR30EmployeeMasterBackend] getGroup error:', err);
      return [];
    }
  }

  async replaceGroup(
    monthKey: string,
    billCode: string,
    employees: GTR30EmployeeMaster[]
  ): Promise<GTR30EmployeeMaster[] | null> {
    try {
      // Prefer atomic RPC (single transaction) when available — mirrors
      // gtr30BillCodeMappings backend which tries RPC first. Falls back to
      // delete+per-row inserts if RPC not deployed.
      try {
        const { error: rpcErr } = await supabase.rpc('upsert_gtr30_employee_master' as never, {
          p_month_key: monthKey,
          p_bill_code: billCode,
          p_employees: employees as unknown as Json,
        } as never);
        if (!rpcErr) {
          return this.getGroup(monthKey, billCode);
        }
        console.warn('[GTR30Backend] RPC upsert_gtr30_employee_master failed, fallback to per-row:', rpcErr);
      } catch (rpcEx) {
        console.warn('[GTR30Backend] RPC not available, fallback:', rpcEx);
      }

      // Fallback 1. Delete existing for this monthKey + billCode (case-insensitive to match local lower key)
      const { error: deleteErr } = await supabase
        .from('gtr30_employee_master')
        .delete()
        .ilike('month_key', monthKey)
        .ilike('bill_code', billCode);
      if (deleteErr) throw deleteErr;

      // 2. Single batch insert (one round-trip, not N). A failure throws so
      // the caller marks error+retry while the local cache stays intact —
      // unlike the old per-row loop, which silently kept partial rosters.
      // Still non-atomic vs the RPC path above; prefer the RPC when deployed.
      const rows = employees.map((emp) => ({
        id: emp.id || crypto.randomUUID(),
        month_key: monthKey,
        bill_code: billCode,
        sr_no: emp.srNo || 0,
        name: emp.name || '',
        designation: emp.designation || null,
        designation_gujarati: emp.designationGujarati || null,
        cadre_class: emp.cadreClass || null,
        pay_scale: emp.payScale || null,
        grade_pay: emp.gradePay || null,
        pay_level_cell: emp.payLevelCell || null,
        ppa_no: emp.ppaNo || null,
        current_pay: emp.currentPay || 0,
        current_pay_date: emp.currentPayDate || null,
        quarter_address: emp.quarterAddress || null,
        insurance_group: emp.insuranceGroup || null,
        insurance_type: emp.insuranceType || null,
        hra_percent: emp.hraPercent ?? 0,
        da: emp.da ?? null,
        transport_allowance: emp.transportAllowance ?? 0,
        medical_allowance: emp.medicalAllowance ?? 0,
        cla_allowance: emp.claAllowance ?? 0,
        rent_of_building: emp.rentOfBuilding ?? null,
        professional_tax: emp.professionalTax ?? null,
        gis_1981_insurance: emp.gis1981Insurance ?? null,
        gis_1981_savings: emp.gis1981Savings ?? null,
        nps_pension: emp.npsPension ?? null,
        society_deduction: emp.societyDeduction ?? null,
        remarks: emp.remarks || null,
        hrpn_no: emp.hrpnNo || null,
        pay_entries: (emp.payEntries || []) as unknown as Json,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error: insertErr } = await supabase.from('gtr30_employee_master').insert(rows);
        if (insertErr) throw insertErr;
      }

      return this.getGroup(monthKey, billCode);
    } catch (err) {
      console.error('[GTR30EmployeeMasterBackend] replaceGroup error:', err);
      throw err;
    }
  }
}

export const gtr30EmployeeMasterBackendRepository = new Gtr30EmployeeMasterBackendRepository();

import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import type { Database } from '@/shared/database.types';
import type { Json } from '@/shared/json.types';
import { assessmentYearFor, setActiveTaxRulesConfig } from '../services/form16Calculation.service';
import type {
  Form16Certificate,
  Form16Status,
  Form16PartA,
  Form16PartB,
  Form16EmployerSnapshot,
  Form16EmployeeSnapshot,
  Form16Signatory,
  Form16ComputedTotals,
  Form16DeductorDefaults,
  Form16Office24QSettings,
  Form16TaxRulesSettings,
  TaxRegime,
} from '../types/form16';
import {
  EMPTY_FORM16_DEDUCTOR_DEFAULTS,
  EMPTY_FORM16_24Q_SETTINGS,
  DEFAULT_TAX_RULES_CONFIG,
} from '../types/form16';

interface Form16DbRow {
  id: string;
  office_id: string;
  employee_id: string | null;
  hrpn: string;
  financial_year: number;
  assessment_year: number;
  certificate_number: string;
  certificate_last_updated: string;
  status: string;
  tax_regime: string;
  employer_snapshot: Partial<Form16EmployerSnapshot> | null;
  employee_snapshot: Partial<Form16EmployeeSnapshot> | null;
  signatory_snapshot: Partial<Form16Signatory> | null;
  part_a: Partial<Form16PartA> | null;
  part_b: Partial<Form16PartB> | null;
  computed_totals: Form16ComputedTotals | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(r: Form16DbRow): Form16Certificate {
  return {
    id: r.id,
    officeId: String(r.office_id),
    employeeId: r.employee_id ?? null,
    hrpn: r.hrpn,
    financialYear: r.financial_year,
    assessmentYear: r.assessment_year,
    certificateNumber: r.certificate_number || '',
    certificateLastUpdated: r.certificate_last_updated || '',
    status: (r.status as Form16Status) || 'DRAFT',
    taxRegime: (r.tax_regime as TaxRegime) || 'NEW',
    employer: {
      name: '',
      address: '',
      pan: '',
      tan: '',
      ...(r.employer_snapshot || {}),
    },
    employee: {
      name: '',
      designation: '',
      pan: '',
      hrpn: r.hrpn,
      address: '',
      ...(r.employee_snapshot || {}),
    },
    signatory: {
      name: '',
      designation: '',
      place: '',
      date: '',
      ...(r.signatory_snapshot || {}),
    },
    partA: {
      citTds: '',
      periodFrom: `01-Apr-${r.financial_year}`,
      periodTo: `31-Mar-${r.financial_year + 1}`,
      quarters: [],
      ...(r.part_a || {}),
    },
    partB: {
      perquisites17_2: 0,
      profitsInLieu17_3: 0,
      otherEmployerSalary: 0,
      housePropertyIncome: 0,
      otherSourcesIncome: 0,
      nps80CCD2: 0,
      agnipath80CCH: 0,
      relief89: 0,
      taxCollectedAtSource: 0,
      ...(r.part_b || {}),
    },
    computedTotals: r.computed_totals ?? null,
    issuedAt: r.issued_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function getUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

const FORM16_DEFAULTS_KEY = 'form16_deductor_defaults';

/** Office id without throwing — used by read-only defaults lookup. */
async function resolveOfficeIdSafe(): Promise<string | null> {
  const scope = getOfficeScope();
  if (scope.all) return null;
  return scope.officeId || null;
}

const STORAGE_PREFIX = 'form16_cert_v1';

function localCacheKey(officeId: string, financialYear: number, hrpn: string): string {
  return `${STORAGE_PREFIX}_${officeId}_${financialYear}_${hrpn.trim().toLowerCase()}`;
}

function saveToLocalCache(cert: Form16Certificate): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = localCacheKey(cert.officeId || 'default', cert.financialYear, cert.hrpn);
    localStorage.setItem(key, JSON.stringify(cert));
  } catch (err) {
    console.warn('[Form16Repository] local storage write failed:', err);
  }
}

function loadFromLocalCache(officeId: string, financialYear: number, hrpn: string): Form16Certificate | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const key = localCacheKey(officeId || 'default', financialYear, hrpn);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Form16Certificate;
  } catch {
    return null;
  }
}

function listFromLocalCache(officeId?: string | null, financialYear?: number): Form16Certificate[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const list: Form16Certificate[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as Form16Certificate;
          if (
            (!officeId || parsed.officeId === officeId) &&
            (financialYear == null || parsed.financialYear === financialYear)
          ) {
            list.push(parsed);
          }
        }
      }
    }
    return list;
  } catch {
    return [];
  }
}

export const form16Repository = {
  async getCertificate(financialYear: number, hrpn: string): Promise<Form16Certificate | null> {
    const scope = getOfficeScope();
    const officeId = scope.officeId || 'default';

    try {
      let q = supabase
        .from('form16_certificates')
        .select('*')
        .eq('financial_year', financialYear)
        .ilike('hrpn', hrpn.trim())
        .limit(1);
      if (!scope.all && scope.officeId) q = q.eq('office_id', scope.officeId);

      const { data, error } = await q.maybeSingle();
      if (!error && data) {
        const mapped = mapRow(data as Form16DbRow);
        saveToLocalCache(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Form16Repository] getCertificate DB error; checking local fallback:', err);
    }

    return loadFromLocalCache(officeId, financialYear, hrpn);
  },

  async getCertificateById(id: string): Promise<Form16Certificate | null> {
    const scope = getOfficeScope();
    try {
      let q = supabase.from('form16_certificates').select('*').eq('id', id).limit(1);
      if (!scope.all && scope.officeId) q = q.eq('office_id', scope.officeId);
      const { data, error } = await q.maybeSingle();
      if (!error && data) {
        const mapped = mapRow(data as Form16DbRow);
        saveToLocalCache(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Form16Repository] getCertificateById DB error:', err);
    }

    const allCached = listFromLocalCache(scope.officeId);
    return allCached.find((c) => c.id === id) || null;
  },

  async listCertificates(financialYear?: number): Promise<Form16Certificate[]> {
    const scope = getOfficeScope();
    const officeId = scope.officeId || 'default';
    const localItems = listFromLocalCache(officeId, financialYear);

    try {
      let q = supabase
        .from('form16_certificates')
        .select('*')
        .order('created_at', { ascending: false });
      if (!scope.all && scope.officeId) q = q.eq('office_id', scope.officeId);
      if (financialYear != null) q = q.eq('financial_year', financialYear);
      const { data, error } = await q;
      if (!error && data) {
        const dbItems = (data || []).map((r) => mapRow(r as Form16DbRow));
        dbItems.forEach(saveToLocalCache);

        // Merge any local-only drafts
        const seen = new Set(dbItems.map((d) => `${d.financialYear}_${d.hrpn.toLowerCase()}`));
        const unsynced = localItems.filter(
          (l) => !seen.has(`${l.financialYear}_${l.hrpn.toLowerCase()}`)
        );
        return [...dbItems, ...unsynced];
      }
    } catch (err) {
      console.warn('[Form16Repository] listCertificates DB error; using local cache:', err);
    }

    return localItems;
  },

  async saveDraft(cert: Omit<Form16Certificate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Form16Certificate> {
    let officeId = '';
    try {
      officeId = requireOfficeId();
    } catch {
      officeId = 'default';
    }

    const nowIso = new Date().toISOString();
    const certHrpn = cert.hrpn.trim();

    // Prepare local draft entity first to guarantee data persistence
    const localCert: Form16Certificate = {
      id: cert.id || `local_f16_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      officeId: String(officeId),
      employeeId: cert.employeeId ?? null,
      hrpn: certHrpn,
      financialYear: cert.financialYear,
      assessmentYear: cert.assessmentYear,
      certificateNumber: cert.certificateNumber || '',
      certificateLastUpdated: nowIso,
      status: cert.status || 'DRAFT',
      taxRegime: cert.taxRegime || 'NEW',
      employer: { ...cert.employer },
      employee: { ...cert.employee, hrpn: certHrpn },
      signatory: { ...cert.signatory },
      partA: { ...cert.partA },
      partB: { ...cert.partB },
      computedTotals: cert.computedTotals ?? null,
      issuedAt: cert.issuedAt ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    saveToLocalCache(localCert);

    // If no valid DB office id, return local draft
    if (!officeId || officeId === 'default') {
      return localCert;
    }

    const dbPayload: Record<string, unknown> = {
      office_id: officeId,
      employee_id: cert.employeeId ?? null,
      hrpn: certHrpn,
      financial_year: cert.financialYear,
      assessment_year: cert.assessmentYear,
      certificate_number: cert.certificateNumber || '',
      certificate_last_updated: nowIso,
      status: cert.status || 'DRAFT',
      tax_regime: cert.taxRegime || 'NEW',
      employer_snapshot: cert.employer as unknown as Record<string, unknown>,
      employee_snapshot: cert.employee as unknown as Record<string, unknown>,
      signatory_snapshot: cert.signatory as unknown as Record<string, unknown>,
      part_a: cert.partA as unknown as Record<string, unknown>,
      part_b: cert.partB as unknown as Record<string, unknown>,
      computed_totals: cert.computedTotals as unknown as Record<string, unknown> | null,
      updated_at: nowIso,
      created_by: getUserId(),
    };

    try {
      // Find existing certificate for this office + employee HRPN + financial year
      let existingId = cert.id && !cert.id.startsWith('local_') ? cert.id : null;

      if (!existingId) {
        const { data: existing } = await supabase
          .from('form16_certificates')
          .select('id')
          .eq('office_id', officeId)
          .eq('financial_year', cert.financialYear)
          .ilike('hrpn', certHrpn)
          .maybeSingle();

        if (existing?.id) {
          existingId = existing.id;
        }
      }

      if (existingId) {
        const { data, error } = await supabase
          .from('form16_certificates')
          .update(dbPayload as unknown as Database['public']['Tables']['form16_certificates']['Update'])
          .eq('id', existingId)
          .select()
          .single();

        if (error) throw error;
        const mapped = mapRow(data as Form16DbRow);
        saveToLocalCache(mapped);
        return mapped;
      } else {
        const { data, error } = await supabase
          .from('form16_certificates')
          .insert(dbPayload as unknown as Database['public']['Tables']['form16_certificates']['Insert'])
          .select()
          .single();

        if (error) throw error;
        const mapped = mapRow(data as Form16DbRow);
        saveToLocalCache(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Form16Repository] DB save failed; cached in local storage:', err);
      // Return the cached certificate instead of crashing the UI
      return localCert;
    }
  },

  async updateStatus(id: string, status: Form16Status): Promise<void> {
    let officeId = '';
    try {
      officeId = requireOfficeId();
    } catch {
      officeId = 'default';
    }

    const patch: Partial<Database['public']['Tables']['form16_certificates']['Update']> = { status };
    if (status === 'ISSUED') {
      patch.issued_at = new Date().toISOString();
      patch.issued_by = getUserId();
    }
    if (status === 'VOIDED') patch.voided_at = new Date().toISOString();

    // Update local cache if available
    const cached = await this.getCertificateById(id);
    if (cached) {
      cached.status = status;
      if (status === 'ISSUED') cached.issuedAt = patch.issued_at || new Date().toISOString();
      saveToLocalCache(cached);
    }

    if (officeId && !id.startsWith('local_')) {
      const { error } = await supabase
        .from('form16_certificates')
        .update(patch)
        .eq('id', id);
      if (error) console.warn('[Form16Repository] updateStatus DB warning:', error.message);
    }
  },

  async logAudit(
    certificateId: string,
    action: 'CREATED' | 'UPDATED' | 'REVIEWED' | 'ISSUED' | 'REISSUED' | 'VOIDED' | 'EXPORTED' | 'OVERRIDE',
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const officeId = requireOfficeId();
      if (!certificateId || certificateId.startsWith('local_')) return;
      const { error } = await supabase.from('form16_audit_log').insert({
        certificate_id: certificateId,
        office_id: officeId,
        action,
        actor_id: getUserId(),
        details: (details || {}) as Json,
      });
      if (error) console.warn('[Form16Repository] audit write failed:', error.message);
    } catch {
      // Best effort
    }
  },

  async listAudit(certificateId: string): Promise<
    Array<{ id: string; action: string; details: Record<string, unknown>; createdAt: string }>
  > {
    const scope = getOfficeScope();
    if (!certificateId || certificateId.startsWith('local_')) return [];
    try {
      let q = supabase
        .from('form16_audit_log')
        .select('*')
        .eq('certificate_id', certificateId)
        .order('created_at', { ascending: false });
      if (!scope.all && scope.officeId) q = q.eq('office_id', scope.officeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        action: r.action,
        details: (r.details as Record<string, unknown>) || {},
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async deleteCertificate(id: string): Promise<void> {
    try {
      await requireOfficeId();
      if (!id.startsWith('local_')) {
        await supabase
          .from('form16_certificates')
          .delete()
          .eq('id', id);
      }
    } catch (err) {
      console.warn('[Form16Repository] delete certificate DB error:', err);
    }
  },

  async batchSaveDrafts(
    certs: Array<Omit<Form16Certificate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>
  ): Promise<Form16Certificate[]> {
    const savedList: Form16Certificate[] = [];
    for (const cert of certs) {
      try {
        const saved = await this.saveDraft(cert);
        savedList.push(saved);
      } catch (err) {
        console.warn(`[Form16Repository] batchSaveDrafts error for HRPN ${cert.hrpn}:`, err);
      }
    }
    return savedList;
  },

  async batchUpdateStatus(ids: string[], status: Form16Status): Promise<void> {
    for (const id of ids) {
      try {
        await this.updateStatus(id, status);
        await this.logAudit(
          id,
          status === 'ISSUED' ? 'ISSUED' : status === 'REVIEWED' ? 'REVIEWED' : 'VOIDED',
          { batch: true }
        ).catch(() => {});
      } catch (err) {
        console.warn(`[Form16Repository] batchUpdateStatus error for id ${id}:`, err);
      }
    }
  },

  async batchDeleteCertificates(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteCertificate(id);
      } catch (err) {
        console.warn(`[Form16Repository] batchDeleteCertificates error for id ${id}:`, err);
      }
    }
  },

  /**
   * Office-wide 24Q Quarterly Return settings for a financial year (Q1–Q4 Receipt Nos).
   */
  async get24QSettings(financialYear: number): Promise<Form16Office24QSettings> {
    const officeId = await resolveOfficeIdSafe();
    const defaults = EMPTY_FORM16_24Q_SETTINGS(financialYear);
    if (!officeId) return defaults;
    try {
      const settingsKey = `form16_24q_fy_${financialYear}`;
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('office_id', officeId)
        .eq('settings_key', settingsKey)
        .maybeSingle();
      if (!error && data?.settings_value) {
        const val = data.settings_value as Partial<Form16Office24QSettings>;
        return {
          financialYear,
          quarters: {
            Q1: { ...defaults.quarters.Q1, ...(val.quarters?.Q1 || {}) },
            Q2: { ...defaults.quarters.Q2, ...(val.quarters?.Q2 || {}) },
            Q3: { ...defaults.quarters.Q3, ...(val.quarters?.Q3 || {}) },
            Q4: { ...defaults.quarters.Q4, ...(val.quarters?.Q4 || {}) },
          },
          updatedAt: val.updatedAt,
        };
      }
    } catch (err) {
      console.warn('[Form16Repository] get24QSettings db error:', err);
    }
    return defaults;
  },

  async save24QSettings(settings: Form16Office24QSettings): Promise<Form16Office24QSettings> {
    const officeId = requireOfficeId();
    const settingsKey = `form16_24q_fy_${settings.financialYear}`;
    const clean: Form16Office24QSettings = {
      financialYear: settings.financialYear,
      quarters: {
        Q1: {
          receiptNumber: (settings.quarters.Q1?.receiptNumber || '').trim().toUpperCase(),
          filingDate: (settings.quarters.Q1?.filingDate || '').trim(),
          challanHeading: (settings.quarters.Q1?.challanHeading || '').trim(),
        },
        Q2: {
          receiptNumber: (settings.quarters.Q2?.receiptNumber || '').trim().toUpperCase(),
          filingDate: (settings.quarters.Q2?.filingDate || '').trim(),
          challanHeading: (settings.quarters.Q2?.challanHeading || '').trim(),
        },
        Q3: {
          receiptNumber: (settings.quarters.Q3?.receiptNumber || '').trim().toUpperCase(),
          filingDate: (settings.quarters.Q3?.filingDate || '').trim(),
          challanHeading: (settings.quarters.Q3?.challanHeading || '').trim(),
        },
        Q4: {
          receiptNumber: (settings.quarters.Q4?.receiptNumber || '').trim().toUpperCase(),
          filingDate: (settings.quarters.Q4?.filingDate || '').trim(),
          challanHeading: (settings.quarters.Q4?.challanHeading || '').trim(),
        },
      },
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('paybill_settings').upsert(
      {
        office_id: officeId,
        settings_key: settingsKey,
        settings_value: clean as unknown as Json,
      },
      { onConflict: 'office_id,settings_key' }
    );
    if (error) throw new Error(`Could not save 24Q quarterly settings: ${error.message}`);
    return clean;
  },

  async apply24QToAllCertificates(
    financialYear: number,
    settings: Form16Office24QSettings
  ): Promise<number> {
    const certs = await this.listCertificates(financialYear);
    let count = 0;
    for (const cert of certs) {
      if (cert.status === 'ISSUED') continue; // Don't tamper with locked/issued certificates
      const updatedQuarters = cert.partA.quarters.map((q) => {
        const qSetting = settings.quarters[q.quarter];
        return {
          ...q,
          receiptNumber: qSetting?.receiptNumber || q.receiptNumber,
        };
      });
      await this.saveDraft({
        ...cert,
        partA: {
          ...cert.partA,
          quarters: updatedQuarters,
        },
      });
      count++;
    }
    return count;
  },

  /**
   * Office-level Form 16 deductor/signatory defaults, stored in paybill_settings
   * under settings_key 'form16_deductor_defaults' (same pattern as gtr30/gtr44).
   */
  async getDeductorDefaults(): Promise<Form16DeductorDefaults> {
    const officeId = await resolveOfficeIdSafe();
    if (!officeId) return { ...EMPTY_FORM16_DEDUCTOR_DEFAULTS };
    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('office_id', officeId)
        .eq('settings_key', FORM16_DEFAULTS_KEY)
        .maybeSingle();
      if (!error && data?.settings_value) {
        const val = data.settings_value as Partial<Form16DeductorDefaults>;
        return { ...EMPTY_FORM16_DEDUCTOR_DEFAULTS, ...(val && typeof val === 'object' ? val : {}) };
      }
    } catch (err) {
      console.warn('[Form16Repository] getDeductorDefaults db error:', err);
    }
    return { ...EMPTY_FORM16_DEDUCTOR_DEFAULTS };
  },

  async saveDeductorDefaults(defaults: Form16DeductorDefaults): Promise<Form16DeductorDefaults> {
    const officeId = requireOfficeId();
    const clean: Form16DeductorDefaults = {
      employerName: (defaults.employerName || '').trim(),
      employerPan: (defaults.employerPan || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      employerTan: (defaults.employerTan || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      citTds: (defaults.citTds || '').trim(),
      signatoryName: (defaults.signatoryName || '').trim(),
      signatoryDesignation: (defaults.signatoryDesignation || '').trim(),
      signatoryPlace: (defaults.signatoryPlace || '').trim(),
    };
    const { error } = await supabase.from('paybill_settings').upsert(
      {
        office_id: officeId,
        settings_key: FORM16_DEFAULTS_KEY,
        settings_value: clean as unknown as Json,
      },
      { onConflict: 'office_id,settings_key' }
    );
    if (error) throw new Error(`Could not save Form 16 defaults: ${error.message}`);
    return clean;
  },

  /**
   * Office-level dynamic Tax Rules & Slabs config for New Tax Regime (u/s 115BAC).
   * Stored under 'form16_tax_rules_config'.
   */
  async getTaxRulesSettings(): Promise<Form16TaxRulesSettings> {
    const officeId = await resolveOfficeIdSafe();
    const fallbackLocal = () => {
      try {
        const raw = localStorage.getItem('form16_tax_rules_config');
        if (raw) return JSON.parse(raw) as Form16TaxRulesSettings;
      } catch {
        /* storage error */
      }
      return DEFAULT_TAX_RULES_CONFIG;
    };

    if (!officeId) {
      const localCfg = fallbackLocal();
      setActiveTaxRulesConfig(localCfg);
      return localCfg;
    }

    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('office_id', officeId)
        .eq('settings_key', 'form16_tax_rules_config')
        .maybeSingle();

      if (!error && data?.settings_value) {
        const val = data.settings_value as unknown as Form16TaxRulesSettings;
        if (val && typeof val === 'object' && val.assessmentYears) {
          const merged: Form16TaxRulesSettings = {
            ...DEFAULT_TAX_RULES_CONFIG,
            ...val,
            assessmentYears: {
              ...DEFAULT_TAX_RULES_CONFIG.assessmentYears,
              ...val.assessmentYears,
            },
          };
          setActiveTaxRulesConfig(merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('[Form16Repository] getTaxRulesSettings db error; falling back:', err);
    }

    const localCfg = fallbackLocal();
    setActiveTaxRulesConfig(localCfg);
    return localCfg;
  },

  async saveTaxRulesSettings(settings: Form16TaxRulesSettings): Promise<Form16TaxRulesSettings> {
    const officeId = requireOfficeId();
    const clean: Form16TaxRulesSettings = {
      assessmentYears: settings.assessmentYears || {},
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('form16_tax_rules_config', JSON.stringify(clean));
    } catch {
      /* ignore */
    }

    setActiveTaxRulesConfig(clean);

    const { error } = await supabase.from('paybill_settings').upsert(
      {
        office_id: officeId,
        settings_key: 'form16_tax_rules_config',
        settings_value: clean as unknown as Json,
      },
      { onConflict: 'office_id,settings_key' }
    );

    if (error) throw new Error(`Could not save Tax Rules settings: ${error.message}`);
    return clean;
  },

  newDraftDefaults(financialYear: number, hrpn: string): Omit<Form16Certificate, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      officeId: '',
      employeeId: null,
      hrpn,
      financialYear,
      assessmentYear: Number(assessmentYearFor(financialYear).slice(0, 4)),
      certificateNumber: '',
      certificateLastUpdated: '',
      status: 'DRAFT',
      taxRegime: 'NEW',
      employer: { name: '', address: '', pan: '', tan: '' },
      employee: { name: '', designation: '', pan: '', hrpn, address: '' },
      signatory: { name: '', designation: '', place: '', date: '' },
      partA: {
        citTds: '',
        periodFrom: `01-Apr-${financialYear}`,
        periodTo: `31-Mar-${financialYear + 1}`,
        quarters: [
          { quarter: 'Q1', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
          { quarter: 'Q2', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
          { quarter: 'Q3', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
          { quarter: 'Q4', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
        ],
      },
      partB: {
        perquisites17_2: 0,
        profitsInLieu17_3: 0,
        otherEmployerSalary: 0,
        housePropertyIncome: 0,
        otherSourcesIncome: 0,
        nps80CCD2: 0,
        agnipath80CCH: 0,
        relief89: 0,
        taxCollectedAtSource: 0,
      },
      computedTotals: null,
      issuedAt: null,
    };
  },
};

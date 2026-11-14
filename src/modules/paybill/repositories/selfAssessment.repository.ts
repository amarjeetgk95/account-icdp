import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { SelfAssessmentMemo } from '../types/selfAssessment';
import { form16Repository } from './form16.repository';
import { safeGetJSON, safeSetJSON, safeRemove, safeListKeys, safeGetRaw } from '@/shared/storage';

const LOCAL_STORAGE_PREFIX = 'icdp_self_assessment_';

function getStorageKey(financialYear: number, hrpn: string): string {
  return `${LOCAL_STORAGE_PREFIX}${financialYear}_${hrpn.trim().toLowerCase()}`;
}

function getSettingsKey(financialYear: number, hrpn: string): string {
  return `self_assessment_fy_${financialYear}_${hrpn.trim().toLowerCase()}`;
}

export const selfAssessmentRepository = {
  /**
   * Retrieves a SelfAssessmentMemo for a given financial year and employee HRPN.
   */
  async getMemo(financialYear: number, hrpn: string): Promise<SelfAssessmentMemo | null> {
    const cleanHrpn = hrpn.trim().toLowerCase();
    const settingsKey = getSettingsKey(financialYear, cleanHrpn);

    // 1. Try fetching from Supabase paybill_settings
    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('settings_key', settingsKey)
        .maybeSingle();

      if (!error && data?.settings_value) {
        const parsed = data.settings_value as unknown as SelfAssessmentMemo;
        // Cache to local storage (quota/serialization errors are logged + swallowed)
        if (typeof window !== 'undefined') {
          safeSetJSON(getStorageKey(financialYear, cleanHrpn), parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.warn('[SelfAssessmentRepository] Supabase get error, trying localStorage:', err);
    }

    // 2. Fallback to localStorage
    if (typeof window !== 'undefined') {
      const cached = safeGetJSON<SelfAssessmentMemo | null>(
        getStorageKey(financialYear, cleanHrpn),
        null
      );
      if (cached) return cached;
    }

    return null;
  },

  /**
   * Saves or updates a SelfAssessmentMemo.
   */
  async saveMemo(memo: SelfAssessmentMemo, syncWithForm16: boolean = false): Promise<SelfAssessmentMemo> {
    const cleanHrpn = memo.hrpn.trim().toLowerCase();
    const settingsKey = getSettingsKey(memo.financialYear, cleanHrpn);
    const updatedMemo: SelfAssessmentMemo = {
      ...memo,
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to localStorage immediately
    if (typeof window !== 'undefined') {
      safeSetJSON(getStorageKey(memo.financialYear, cleanHrpn), updatedMemo);
    }

    // 2. Persist to Supabase paybill_settings
    try {
      const { error } = await supabase
        .from('paybill_settings')
        .upsert(
          {
            settings_key: settingsKey,
            settings_value: updatedMemo as unknown as Json,
            updated_at: updatedMemo.updatedAt,
          },
          { onConflict: 'settings_key' }
        );

      if (error) {
        console.warn('[SelfAssessmentRepository] Supabase upsert error:', error.message);
      }
    } catch (err) {
      console.warn('[SelfAssessmentRepository] Network/Auth error persisting memo:', err);
    }

    // 3. Optional: Two-way sync to Form 16 Part B
    if (syncWithForm16) {
      try {
        await this.syncToForm16(updatedMemo);
      } catch (err) {
        console.warn('[SelfAssessmentRepository] Form 16 sync error:', err);
      }
    }

    return updatedMemo;
  },

  /**
   * Syncs relevant incomes & deductions into the Form 16 certificate for this employee.
   */
  async syncToForm16(memo: SelfAssessmentMemo): Promise<void> {
    const cert = await form16Repository.getCertificate(memo.financialYear, memo.hrpn);
    if (!cert) return;

    const updatedPartB = {
      ...cert.partB,
      housePropertyIncome: Number(memo.housePropertyIncome) || 0,
      otherSourcesIncome:
        (Number(memo.bankInterest) || 0) +
        (Number(memo.nscInterest) || 0) +
        (Number(memo.otherIncomeSources) || 0) +
        (Number(memo.honorariumBonus) || 0) +
        (Number(memo.bonus) || 0),
      nps80CCD2: Number(memo.nps80CCD2) || 0,
      relief89: Number(memo.working?.relief89) || 0,
    };

    await form16Repository.saveDraft({
      ...cert,
      partB: updatedPartB,
    });
  },

  /**
   * Lists all saved SelfAssessmentMemos for a financial year.
   */
  async listMemos(financialYear: number): Promise<SelfAssessmentMemo[]> {
    const prefix = `self_assessment_fy_${financialYear}_`;
    const memos: SelfAssessmentMemo[] = [];

    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .like('settings_key', `${prefix}%`);

      if (!error && Array.isArray(data)) {
        for (const item of data) {
          if (item?.settings_value) {
            memos.push(item.settings_value as unknown as SelfAssessmentMemo);
          }
        }
      }
    } catch (err) {
      console.warn('[SelfAssessmentRepository] listMemos error:', err);
    }

    // If empty or offline, check localStorage keys
    if (memos.length === 0 && typeof window !== 'undefined') {
      // Snapshot the localPrefix keys, then parse in the same order. A single corrupt
      // entry still aborts the loop (historical behavior) — later valid entries in the
      // snapshot are not appended once a parse fails.
      const localPrefix = `${LOCAL_STORAGE_PREFIX}${financialYear}_`;
      for (const k of safeListKeys(localPrefix)) {
        const raw = safeGetRaw(k);
        if (!raw) continue;
        try {
          memos.push(JSON.parse(raw) as SelfAssessmentMemo);
        } catch {
          break;
        }
      }
    }

    return memos;
  },

  /**
   * Deletes a SelfAssessmentMemo.
   */
  async deleteMemo(financialYear: number, hrpn: string): Promise<void> {
    const cleanHrpn = hrpn.trim().toLowerCase();
    const settingsKey = getSettingsKey(financialYear, cleanHrpn);

    if (typeof window !== 'undefined') {
      safeRemove(getStorageKey(financialYear, cleanHrpn));
    }

    try {
      await supabase.from('paybill_settings').delete().eq('settings_key', settingsKey);
    } catch (err) {
      console.warn('[SelfAssessmentRepository] deleteMemo error:', err);
    }
  },
};

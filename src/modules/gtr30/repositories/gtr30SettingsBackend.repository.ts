import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import {
  getOfficeId,
  isAllOfficesMode,
  resolveOfficeIdForUser,
} from '@/shared/utilities/office';
import type { Json } from '@/shared/json.types';
import type { Gtr30SettingsPayload } from './gtr30Settings.repository';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  DEFAULT_GTR30_DA_RATES,
  freshDefaultPosts,
  freshDefaultDaRates,
} from '../constants/settings';

const SETTINGS_KEY = 'gtr30_defaults';

async function resolveOfficeId(): Promise<string | null> {
  if (isAllOfficesMode()) return null;
  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return resolveOfficeIdForUser(userId);
}

function mergePayload(partial: Partial<Gtr30SettingsPayload> | null | undefined): Gtr30SettingsPayload {
  const posts = Array.isArray(partial?.defaultPosts) && partial!.defaultPosts.length > 0
    ? partial!.defaultPosts
    : freshDefaultPosts();
  const daRates = Array.isArray(partial?.daRates) && (partial!.daRates as unknown[]).length > 0
    ? (partial!.daRates as Gtr30SettingsPayload['daRates'])
    : freshDefaultDaRates();
  // Migrate legacy payloads that stored DA rates inside settings or missing field
  const normalizedRates = [...daRates];
  // If settings contains legacy daRate field, migrate it
  const legacySettings = partial?.settings as Record<string, unknown> | undefined;
  if (legacySettings && typeof legacySettings['daRate'] === 'number' && normalizedRates.length === DEFAULT_GTR30_DA_RATES.length) {
    // Keep existing but ensure at least one entry reflects legacy rate?
  }
  return {
    settings: { ...DEFAULT_GTR30_SETTINGS, ...(partial?.settings ?? {}) },
    employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE, ...(partial?.employeeTemplate ?? {}) },
    defaultPosts: posts,
    daRates: normalizedRates,
  };
}

class Gtr30SettingsBackendRepository {
  async load(): Promise<Gtr30SettingsPayload | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;

    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('office_id', officeId)
        .eq('settings_key', SETTINGS_KEY)
        .maybeSingle();
      if (error) {
        console.warn('[GTR30SettingsBackend] load failed:', error);
        return null;
      }
      if (!data?.settings_value || typeof data.settings_value !== 'object') return null;
      return mergePayload(data.settings_value as Partial<Gtr30SettingsPayload>);
    } catch (err) {
      console.warn('[GTR30SettingsBackend] load error:', err);
      return null;
    }
  }

  async save(payload: Gtr30SettingsPayload): Promise<boolean | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;

    try {
      const { error } = await supabase
        .from('paybill_settings')
        .upsert(
          {
            office_id: officeId,
            settings_key: SETTINGS_KEY,
            settings_value: payload as unknown as Json,
          },
          { onConflict: 'office_id,settings_key' }
        );
      if (error) {
        console.warn('[GTR30SettingsBackend] save failed:', error);
        return null;
      }
      return true;
    } catch (err) {
      console.warn('[GTR30SettingsBackend] save error:', err);
      return null;
    }
  }

  async clear(): Promise<void> {
    const officeId = await resolveOfficeId();
    if (!officeId) return;

    try {
      const { error } = await supabase
        .from('paybill_settings')
        .delete()
        .eq('office_id', officeId)
        .eq('settings_key', SETTINGS_KEY);
      if (error) {
        console.warn('[GTR30SettingsBackend] clear failed:', error);
      }
    } catch (err) {
      console.warn('[GTR30SettingsBackend] clear error:', err);
    }
  }
}

export const gtr30SettingsBackendRepository = new Gtr30SettingsBackendRepository();
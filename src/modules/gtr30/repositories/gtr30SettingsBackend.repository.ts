import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { Gtr30SettingsPayload } from './gtr30Settings.repository';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  freshDefaultPosts,
  freshDefaultDaRates,
} from '../constants/settings';
import { resolveOfficeIdStrict } from './officeScope';
import { gtr30SettingsSchema } from '../validation/gtr30Settings.schema';

const SETTINGS_KEY = 'gtr30_defaults';

function mergePayload(partial: Partial<Gtr30SettingsPayload> | null | undefined): Gtr30SettingsPayload {
  const posts = Array.isArray(partial?.defaultPosts) && partial!.defaultPosts.length > 0
    ? partial!.defaultPosts
    : freshDefaultPosts();
  const daRates = Array.isArray(partial?.daRates) && (partial!.daRates as unknown[]).length > 0
    ? (partial!.daRates as Gtr30SettingsPayload['daRates'])
    : freshDefaultDaRates();
  const normalizedRates = [...daRates];
  return {
    settings: { ...DEFAULT_GTR30_SETTINGS, ...(partial?.settings ?? {}) },
    employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE, ...(partial?.employeeTemplate ?? {}) },
    defaultPosts: posts,
    daRates: normalizedRates,
  };
}

function validatePayload(raw: unknown): Gtr30SettingsPayload | null {
  const result = gtr30SettingsSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30SettingsBackend] validation failed:', result.error.flatten());
    return null;
  }
  return mergePayload(result.data);
}

class Gtr30SettingsBackendRepository {
  async load(): Promise<Gtr30SettingsPayload | null> {
    const officeId = await resolveOfficeIdStrict();
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
      return validatePayload(data.settings_value);
    } catch (err) {
      console.warn('[GTR30SettingsBackend] load error:', err);
      return null;
    }
  }

  async save(payload: Gtr30SettingsPayload): Promise<boolean | null> {
    const officeId = await resolveOfficeIdStrict();
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
    const officeId = await resolveOfficeIdStrict();
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
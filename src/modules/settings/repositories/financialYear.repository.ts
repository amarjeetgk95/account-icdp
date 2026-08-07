import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';

function getOfficeId(): string | null {
  return useUIStore.getState().activeOfficeId;
}

function defaultFY(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export const financialYearRepository = {
  async getCurrent(): Promise<number> {
    const officeId = getOfficeId();
    if (!officeId) return defaultFY();

    const { data, error } = await (supabase as any)
      .from('app_config')
      .select('value')
      .eq('key', 'currentFY')
      .eq('office_id', officeId)
      .maybeSingle();

    if (error) throw error;

    if (data?.value) {
      const parsed = parseInt(data.value, 10);
      if (Number.isInteger(parsed) && parsed >= 2000) {
        return parsed;
      }
    }

    return defaultFY();
  },

  async set(year: number): Promise<void> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid financial year');
    }

    const { error } = await supabase
      .from('app_config')
      .upsert(
        {
          office_id: officeId,
          key: 'currentFY',
          value: String(year),
        } as any,
        { onConflict: 'office_id,key' }
      );

    if (error) throw error;

    useUIStore.getState().setActiveFinancialYear(year);
  },
};

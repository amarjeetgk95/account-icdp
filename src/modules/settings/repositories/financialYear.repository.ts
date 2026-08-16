import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';

function defaultFY(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export const financialYearRepository = {
  async getCurrent(): Promise<number> {
    const scope = getOfficeScope();
    if (scope.all || !scope.officeId) return defaultFY();

    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'currentFY')
      .eq('office_id', scope.officeId)
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
    const officeId = requireOfficeId();

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
        },
        { onConflict: 'office_id,key' }
      );

    if (error) throw error;

    useUIStore.getState().setActiveFinancialYear(year);
  },
};

import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

export const rolloverService = {
  async changeFinancialYear(newFy: number): Promise<string> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    if (!Number.isInteger(newFy) || newFy < 2000 || newFy > 2100) {
      throw new Error('Invalid financial year');
    }

    const { error } = await (supabase as any)
      .from('app_config')
      .upsert(
        {
          office_id: officeId,
          key: 'currentFY',
          value: String(newFy),
        },
        { onConflict: 'office_id,key' }
      );

    if (error) throw error;

    useUIStore.getState().setActiveFinancialYear(newFy);
    return `Financial year updated to ${newFy}-${(newFy + 1) % 100}`;
  },

  async getCurrentFinancialYear(): Promise<number> {
    const officeId = getOfficeId();
    if (!officeId) {
      const now = new Date();
      return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    }

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

    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  },
};

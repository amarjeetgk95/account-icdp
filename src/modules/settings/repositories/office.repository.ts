import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import type { OfficeDetailsInput } from '../validation/settings.schema';

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

export const officeRepository = {
  async get(officeId?: string): Promise<OfficeDetailsInput> {
    const targetOfficeId = officeId || getOfficeId();
    if (!targetOfficeId) throw new Error('No office selected');

    const { data, error } = await (supabase as any)
      .from('office_details')
      .select('office_name, subtitle, address, phone, email, gst, tan')
      .eq('office_id', targetOfficeId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      return {
        officeName: '',
        subtitle: '',
        address: '',
        phone: '',
        email: '',
        gst: '',
        tan: '',
      };
    }

    return {
      officeName: data.office_name || '',
      subtitle: data.subtitle || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      gst: data.gst || '',
      tan: data.tan || '',
    };
  },

  async save(input: OfficeDetailsInput): Promise<void> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No active office selected');

    const payload = {
      office_id: officeId,
      office_name: input.officeName ? input.officeName.trim() : null,
      subtitle: input.subtitle ? input.subtitle.trim() : null,
      address: input.address ? input.address.trim() : null,
      phone: input.phone ? input.phone.trim() : null,
      email: input.email ? input.email.trim() : null,
      gst: input.gst ? input.gst.trim() : null,
      tan: input.tan ? input.tan.trim() : null,
    };

    const { error } = await (supabase as any)
      .from('office_details')
      .upsert(payload, { onConflict: 'office_id' });

    if (error) throw error;
  },
};

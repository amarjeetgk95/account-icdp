import { supabase } from '@/core/supabase/client';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import type { OfficeDetailsInput } from '../validation/settings.schema';

export const officeRepository = {
  async getName(officeId?: string): Promise<string> {
    const scope = getOfficeScope(officeId);
    if (!scope.all && !scope.officeId) return '';

    let q = supabase.from('offices').select('name');
    if (!scope.all) q = q.eq('id', scope.officeId!);
    const { data, error } = await q.maybeSingle();

    if (error) return '';
    return data?.name || '';
  },

  async get(officeId?: string): Promise<OfficeDetailsInput> {
    const scope = getOfficeScope(officeId);
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    let q = supabase
      .from('office_details')
      .select('office_name, subtitle, address, phone, email, gst, tan');
    if (!scope.all) q = q.eq('office_id', scope.officeId!);
    const { data, error } = await q.maybeSingle();

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
    const officeId = requireOfficeId();

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

    const { error } = await supabase
      .from('office_details')
      .upsert(payload, { onConflict: 'office_id' });

    if (error) throw error;
  },
};

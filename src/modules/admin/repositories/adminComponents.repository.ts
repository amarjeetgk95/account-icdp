import { supabase } from '@/core/supabase/client';
import { rpcArray } from '@/shared/utilities';
import type { Json } from '@/shared/json.types';
import type { AdminComponent, AdminComponentInput } from '../types/components';

export const adminComponentsRepository = {
  async list(): Promise<AdminComponent[]> {
    const { data, error } = await supabase.rpc('admin_component_list');
    if (error) throw error;
    return rpcArray<AdminComponent>(data);
  },

  async save(input: AdminComponentInput): Promise<AdminComponent> {
    const { id, ...rest } = input;
    const component = {
      ...rest,
      ...(typeof id === 'string' && id.trim() !== '' ? { id } : {}),
    } as unknown as Json;
    const { data, error } = await supabase.rpc('admin_component_save', { component });
    if (error) throw error;
    return data as unknown as AdminComponent;
  },

  async setActive(componentId: string, active: boolean): Promise<void> {
    const { error } = await supabase.rpc('admin_component_set_active', {
      component_id: componentId,
      active,
    });
    if (error) throw error;
  },

  async remove(componentId: string): Promise<{ deleted: boolean; reason?: string }> {
    const { data, error } = await supabase.rpc('admin_component_delete', {
      component_id: componentId,
    });
    if (error) throw error;
    return data as unknown as { deleted: boolean; reason?: string };
  },
};

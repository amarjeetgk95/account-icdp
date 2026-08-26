import { adminComponentsRepository } from '../repositories/adminComponents.repository';
import type { AdminComponent, AdminComponentInput } from '../types/components';

export const adminComponentsService = {
  async list(): Promise<AdminComponent[]> {
    return adminComponentsRepository.list();
  },

  async save(input: AdminComponentInput): Promise<AdminComponent> {
    if (!input.component_name || input.component_name.trim() === '') {
      throw new Error('Component name is required');
    }
    const aliases = input.aliases
      .map((alias) => ({ ...alias, alias_text: alias.alias_text.trim() }))
      .filter((alias) => alias.alias_text !== '');
    return adminComponentsRepository.save({
      ...input,
      component_name: input.component_name.trim(),
      active: !!input.active,
      is_mandatory: !!input.is_mandatory,
      is_total_field: !!input.is_total_field,
      is_system_generated: !!input.is_system_generated,
      aliases,
    });
  },

  async setActive(componentId: string, active: boolean): Promise<void> {
    if (!componentId) throw new Error('Component ID is required');
    return adminComponentsRepository.setActive(componentId, active);
  },

  async remove(componentId: string): Promise<{ deleted: boolean; reason?: string }> {
    if (!componentId) throw new Error('Component ID is required');
    return adminComponentsRepository.remove(componentId);
  },
};

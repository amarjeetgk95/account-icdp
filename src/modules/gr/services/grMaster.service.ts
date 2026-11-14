import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/core/supabase/client';
import type { Database } from '@/shared/database.types';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_DOCUMENT_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
} from '../constants';
import type { GRDepartment, GRDocumentType, GRCategory, GRSubcategory } from '../types';

type DBClient = SupabaseClient<Database>;

function describeError(error: { message?: string; code?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === '23503') {
    return 'This item is referenced by existing GR records and cannot be removed.';
  }
  if (error.code === '23505') {
    return 'An item with this code already exists.';
  }
  return error.message ? `${fallback} (${error.message})` : fallback;
}

export class GRMasterService {
  constructor(private readonly client: DBClient = defaultSupabase) {}

  // --------------------------------------------------------------------------
  // Document Types
  // --------------------------------------------------------------------------
  async getDocumentTypes(): Promise<GRDocumentType[]> {
    const { data, error } = await this.client
      .from('document_types')
      .select('*')
      .order('display_order', { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_DOCUMENT_TYPES;
    return data;
  }

  async saveDocumentType(docType: GRDocumentType): Promise<GRDocumentType> {
    const payload = {
      id: docType.id.trim(),
      name_en: docType.name_en.trim(),
      name_gu: docType.name_gu.trim(),
      display_order: docType.display_order || 1,
      is_active: docType.is_active ?? true,
    };

    const { data, error } = await this.client
      .from('document_types')
      .upsert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(describeError(error, 'Could not save the document type.'));
    }
    return data;
  }

  async deleteDocumentType(id: string): Promise<void> {
    const { error } = await this.client.from('document_types').delete().eq('id', id);
    if (error) {
      throw new Error(describeError(error, 'Could not delete the document type.'));
    }
  }

  // --------------------------------------------------------------------------
  // Departments
  // --------------------------------------------------------------------------
  async getDepartments(): Promise<GRDepartment[]> {
    const { data, error } = await this.client
      .from('gr_departments')
      .select('*')
      .order('name', { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_DEPARTMENTS;
    return data;
  }

  async saveDepartment(dept: GRDepartment): Promise<GRDepartment> {
    const payload = {
      id: dept.id.trim(),
      name: dept.name.trim(),
      code: dept.code?.trim() || null,
      description: dept.description?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('gr_departments')
      .upsert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(describeError(error, 'Could not save the department.'));
    }
    return data;
  }

  async deleteDepartment(id: string): Promise<void> {
    const { error } = await this.client.from('gr_departments').delete().eq('id', id);
    if (error) {
      throw new Error(describeError(error, 'Could not delete the department.'));
    }
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  async getCategories(): Promise<GRCategory[]> {
    const { data, error } = await this.client
      .from('gr_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_CATEGORIES;
    return data;
  }

  async saveCategory(cat: GRCategory): Promise<GRCategory> {
    const payload = {
      id: cat.id.trim(),
      name_en: cat.name_en.trim(),
      name_gu: cat.name_gu.trim(),
      display_order: cat.display_order || 1,
      is_active: cat.is_active ?? true,
    };

    const { data, error } = await this.client
      .from('gr_categories')
      .upsert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(describeError(error, 'Could not save the category.'));
    }
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client.from('gr_categories').delete().eq('id', id);
    if (error) {
      throw new Error(describeError(error, 'Could not delete the category.'));
    }
  }

  // --------------------------------------------------------------------------
  // Subcategories
  // --------------------------------------------------------------------------
  async getSubcategories(categoryId?: string): Promise<GRSubcategory[]> {
    let query = this.client
      .from('gr_subcategories')
      .select('*')
      .order('display_order', { ascending: true });
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (categoryId && categoryId !== 'all') {
        return DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === categoryId);
      }
      return DEFAULT_SUBCATEGORIES;
    }
    return data;
  }

  async saveSubcategory(sub: GRSubcategory): Promise<GRSubcategory> {
    const payload = {
      id: sub.id.trim(),
      category_id: sub.category_id.trim(),
      name_en: sub.name_en.trim(),
      name_gu: sub.name_gu.trim(),
      display_order: sub.display_order || 1,
      is_active: sub.is_active ?? true,
    };

    const { data, error } = await this.client
      .from('gr_subcategories')
      .upsert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(describeError(error, 'Could not save the subcategory.'));
    }
    return data;
  }

  async deleteSubcategory(id: string): Promise<void> {
    const { error } = await this.client.from('gr_subcategories').delete().eq('id', id);
    if (error) {
      throw new Error(describeError(error, 'Could not delete the subcategory.'));
    }
  }
}

export const grMasterService = new GRMasterService();

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/core/supabase/client';
import type { Database } from '@/shared/database.types';
import { grDocumentStorage } from './grDocumentStorage.service';
import { GRAuditService } from './grAudit.service';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  DEFAULT_DOCUMENT_TYPES,
  DEFAULT_PAGE_SIZE,
} from '../constants';
import type {
  GRRecord,
  GRDepartment,
  GRDocumentType,
  GRCategory,
  GRSubcategory,
  GRAccessAssignment,
  GRFilterState,
  GRPaginationState,
  GRFormData,
  GRCurrentUser,
} from '../types';

type DBClient = SupabaseClient<Database>;
type GRRow = Database['public']['Tables']['gr_repository']['Row'];
type GRInsert = Database['public']['Tables']['gr_repository']['Insert'];
type GRUpdate = Database['public']['Tables']['gr_repository']['Update'];

const EMPTY_RESULT = (pageSize: number): { data: GRRecord[]; pagination: GRPaginationState } => ({
  data: [],
  pagination: { page: 1, pageSize, totalCount: 0, totalPages: 0 },
});

function describeError(error: { message?: string; code?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === '23505') {
    return 'A Government Resolution with this number already exists.';
  }
  return error.message ? `${fallback} (${error.message})` : fallback;
}

const POSTGREST_ESCAPES: Record<string, string> = {
  '\\': '\\\\\\\\',
  '%': '\\\\%',
  _: '\\\\_',
  '"': '\\"',
};

export function escapePostgrestTerm(term: string): string {
  return term.replace(/[\\%_"]/g, (ch) => POSTGREST_ESCAPES[ch]);
}

export class GRRepositoryService {
  constructor(
    private readonly client: DBClient = defaultSupabase,
    private readonly audit: GRAuditService = new GRAuditService(client)
  ) {}

  async fetchGRs(
    filters: Partial<GRFilterState>,
    pagination: Partial<GRPaginationState> = {},
    user: GRCurrentUser | null
  ): Promise<{ data: GRRecord[]; pagination: GRPaginationState }> {
    const page = Math.max(1, pagination.page || 1);
    const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

    if (!user) return EMPTY_RESULT(pageSize);

    const assignedGrIds = await this.fetchAssignedGRIds(user.id);
    const userId = user.id;

    let query = this.client.from('gr_repository').select('*', { count: 'exact' });

    const assignedCondition = assignedGrIds.length > 0 ? `,id.in.(${assignedGrIds.join(',')})` : '';

    if (filters.visibility === 'public') {
      query = query.eq('visibility', 'public');
    } else if (filters.visibility === 'private') {
      query = query
        .eq('visibility', 'private')
        .or(`owner_user_id.eq.${userId}${assignedCondition}`);
    } else {
      query = query.or(`visibility.eq.public,owner_user_id.eq.${userId}${assignedCondition}`);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.documentTypeId && filters.documentTypeId !== 'all') {
      query = query.eq('document_type_id', filters.documentTypeId);
    }
    if (filters.departmentId && filters.departmentId !== 'all') {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.subcategoryId && filters.subcategoryId !== 'all') {
      query = query.eq('subcategory_id', filters.subcategoryId);
    }
    if (filters.year && filters.year !== 'all') {
      const yearNum = parseInt(filters.year, 10);
      if (!Number.isNaN(yearNum)) {
        query = query.gte('issue_date', `${yearNum}-01-01`).lte('issue_date', `${yearNum}-12-31`);
      }
    }
    if (filters.dateFrom) {
      query = query.gte('issue_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('issue_date', filters.dateTo);
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const term = escapePostgrestTerm(filters.searchQuery.trim());
      query = query.or(
        [
          `gr_number.ilike."%${term}%"`,
          `title.ilike."%${term}%"`,
          `description.ilike."%${term}%"`,
          `department_name.ilike."%${term}%"`,
          `category_name.ilike."%${term}%"`,
          `subcategory_name.ilike."%${term}%"`,
        ].join(',')
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(describeError(error, 'Could not load the GR repository.'));
    }

    const totalCount = count ?? 0;
    return {
      data: (data || []).map((row: GRRow) => this.decorate(this.mapRow(row), user, assignedGrIds)),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  async getGRById(id: string, user: GRCurrentUser | null): Promise<GRRecord> {
    if (!user) {
      throw new Error('Authentication required.');
    }

    const { data, error } = await this.client
      .from('gr_repository')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(describeError(error, 'Could not load the GR record.'));
    }
    if (!data) {
      throw new Error('This GR record was not found.');
    }

    const assignments = await this.fetchAssignments(id);
    const assignedIds = assignments.map((a) => a.user_id);
    const record = this.decorate(this.mapRow(data), user, assignedIds);

    if (!this.canUserReadGR(record, user, assignedIds)) {
      throw new Error('You do not have permission to view this GR.');
    }

    record.assigned_users = assignments;
    return record;
  }

  async createGR(
    formData: GRFormData,
    user: GRCurrentUser | null,
    onProgress?: (percent: number) => void
  ): Promise<GRRecord> {
    if (!user) {
      throw new Error('You must be signed in to add a GR.');
    }
    if (!formData.gr_number?.trim()) {
      throw new Error('GR Number is required.');
    }
    if (!formData.title?.trim()) {
      throw new Error('Title is required.');
    }
    if (!formData.file) {
      throw new Error('A PDF file document is required.');
    }

    const visibility = formData.visibility || 'public';
    const departmentName = await this.resolveDepartmentName(formData.department_id);
    const categoryName = await this.resolveCategoryName(formData.category_id);
    const subcategoryName = await this.resolveSubcategoryName(formData.subcategory_id);

    const recordId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `gr_${Date.now()}`;
    const uploadFileName =
      'name' in formData.file ? (formData.file as File).name : `document_${recordId}.pdf`;

    const upload = await grDocumentStorage.uploadPdf(
      formData.file,
      uploadFileName,
      recordId,
      onProgress
    );

    const now = new Date().toISOString();
    const payload: GRInsert = {
      id: recordId,
      gr_number: formData.gr_number.trim(),
      title: formData.title.trim(),
      document_type_id: formData.document_type_id || 'DOC-01',
      department_id: formData.department_id || null,
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      department_name: departmentName ?? null,
      category_name: categoryName ?? null,
      subcategory_name: subcategoryName ?? null,
      issue_date: formData.issue_date || null,
      description: formData.description?.trim() || null,
      keywords: formData.keywords?.length ? formData.keywords : null,
      file_name: upload.fileName,
      storage_path: upload.storagePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType,
      visibility,
      owner_user_id: user.id,
      status: 'active',
      created_by: user.id,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.client
      .from('gr_repository')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      await grDocumentStorage.deletePdf(upload.storagePath);
      throw new Error(describeError(error, 'Could not save the GR record.'));
    }

    await this.audit.logAction({
      grId: recordId,
      grNumber: payload.gr_number,
      action: 'CREATED',
      newVisibility: visibility,
      details: {
        title: payload.title,
        visibility,
        owner_user_id: user.id,
        file_name: upload.fileName,
        file_size: upload.fileSize,
      },
    });

    return this.decorate(this.mapRow(data), user, []);
  }

  async updateGR(
    id: string,
    formData: Partial<GRFormData>,
    user: GRCurrentUser | null
  ): Promise<GRRecord> {
    const existing = await this.getGRById(id, user);
    if (!existing.can_manage) {
      throw new Error('You do not have permission to edit this GR.');
    }

    const update: GRUpdate = { updated_at: new Date().toISOString() };

    if (formData.gr_number !== undefined) {
      const grNumber = formData.gr_number.trim();
      if (!grNumber) throw new Error('GR Number cannot be empty.');
      update.gr_number = grNumber;
    }
    if (formData.title !== undefined) {
      const title = formData.title.trim();
      if (!title) throw new Error('Title cannot be empty.');
      update.title = title;
    }
    if (formData.document_type_id !== undefined) {
      update.document_type_id = formData.document_type_id || null;
    }
    if (formData.department_id !== undefined) {
      const name = await this.resolveDepartmentName(formData.department_id);
      update.department_id = formData.department_id || null;
      update.department_name = name ?? null;
    }
    if (formData.category_id !== undefined) {
      const name = await this.resolveCategoryName(formData.category_id);
      update.category_id = formData.category_id || null;
      update.category_name = name ?? null;
    }
    if (formData.subcategory_id !== undefined) {
      const name = await this.resolveSubcategoryName(formData.subcategory_id);
      update.subcategory_id = formData.subcategory_id || null;
      update.subcategory_name = name ?? null;
    }
    if (formData.issue_date !== undefined) {
      update.issue_date = formData.issue_date || null;
    }
    if (formData.description !== undefined) {
      update.description = formData.description?.trim() || null;
    }
    if (formData.keywords !== undefined) {
      update.keywords = formData.keywords?.length ? formData.keywords : null;
    }

    const previousVisibility = existing.visibility;
    if (formData.visibility !== undefined) {
      update.visibility = formData.visibility;
      if (formData.visibility === 'private' && !existing.owner_user_id) {
        update.owner_user_id = user?.id ?? null;
      }
    }

    const { data, error } = await this.client
      .from('gr_repository')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(describeError(error, 'Could not update the GR record.'));
    }
    if (!data) {
      throw new Error('This GR record was not found.');
    }

    const newVisibility = update.visibility ?? previousVisibility;
    await this.audit.logAction({
      grId: id,
      grNumber: data.gr_number,
      action: previousVisibility !== newVisibility ? 'VISIBILITY_CHANGED' : 'UPDATED',
      previousVisibility,
      newVisibility,
      details: { changes: update as Record<string, unknown> },
    });

    return this.getGRById(id, user);
  }

  async replacePDF(
    id: string,
    newFile: File,
    user: GRCurrentUser | null,
    onProgress?: (percent: number) => void
  ): Promise<GRRecord> {
    const existing = await this.getGRById(id, user);
    if (!existing.can_manage) {
      throw new Error('You do not have permission to replace the document for this GR.');
    }

    const oldStoragePath = existing.storage_path;

    const upload = await grDocumentStorage.uploadPdf(newFile, newFile.name, id, onProgress);

    const { data, error } = await this.client
      .from('gr_repository')
      .update({
        file_name: upload.fileName,
        storage_path: upload.storagePath,
        file_size: upload.fileSize,
        mime_type: upload.mimeType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      await grDocumentStorage.deletePdf(upload.storagePath);
      throw new Error(describeError(error, 'Could not update the GR with the new PDF.'));
    }

    if (oldStoragePath && oldStoragePath !== upload.storagePath) {
      await grDocumentStorage.deletePdf(oldStoragePath);
    }

    await this.audit.logAction({
      grId: id,
      grNumber: data.gr_number,
      action: 'PDF_REPLACED',
      details: {
        old_file: existing.file_name,
        new_file: upload.fileName,
        new_file_size: upload.fileSize,
      },
    });

    return this.getGRById(id, user);
  }

  async archiveGR(id: string, user: GRCurrentUser | null): Promise<GRRecord> {
    return this.setStatus(id, 'archived', 'ARCHIVED', user);
  }

  async restoreGR(id: string, user: GRCurrentUser | null): Promise<GRRecord> {
    return this.setStatus(id, 'active', 'RESTORED', user);
  }

  private async setStatus(
    id: string,
    status: GRRecord['status'],
    action: 'ARCHIVED' | 'RESTORED',
    user: GRCurrentUser | null
  ): Promise<GRRecord> {
    const existing = await this.getGRById(id, user);
    if (!existing.can_manage) {
      throw new Error(`You do not have permission to ${action === 'ARCHIVED' ? 'archive' : 'restore'} this GR.`);
    }

    const { data, error } = await this.client
      .from('gr_repository')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(describeError(error, 'Could not update the GR status.'));
    }
    if (!data) {
      throw new Error('This GR record was not found.');
    }

    await this.audit.logAction({
      grId: id,
      grNumber: data.gr_number,
      action,
      details: { previous_status: existing.status, new_status: status },
    });

    return this.getGRById(id, user);
  }

  async deleteGR(id: string, user: GRCurrentUser | null): Promise<void> {
    if (!user) {
      throw new Error('Unauthorized: You must be signed in to permanently delete GR documents.');
    }

    const existing = await this.getGRById(id, user);
    if (!existing.can_delete) {
      throw new Error('Unauthorized: You do not have permission to delete this GR document.');
    }

    await this.audit.logAction({
      grId: id,
      grNumber: existing.gr_number,
      action: 'DELETED',
      details: {
        title: existing.title,
        visibility: existing.visibility,
        file_name: existing.file_name,
        storage_path: existing.storage_path,
        deleted_by: user.email,
      },
    });

    const { error } = await this.client.from('gr_repository').delete().eq('id', id);
    if (error) {
      throw new Error(describeError(error, 'Could not delete the GR record.'));
    }

    if (existing.storage_path) {
      await grDocumentStorage.deletePdf(existing.storage_path);
    }
  }

  async fetchDepartments(): Promise<GRDepartment[]> {
    const { data, error } = await this.client
      .from('gr_departments')
      .select('*')
      .order('name');
    if (error || !data || data.length === 0) return DEFAULT_DEPARTMENTS;
    return data;
  }

  async fetchDocumentTypes(): Promise<GRDocumentType[]> {
    const { data, error } = await this.client
      .from('document_types')
      .select('*')
      .order('display_order');
    if (error || !data || data.length === 0) return DEFAULT_DOCUMENT_TYPES;
    return data;
  }

  async fetchCategories(): Promise<GRCategory[]> {
    const { data, error } = await this.client
      .from('gr_categories')
      .select('*')
      .order('display_order');
    if (error || !data || data.length === 0) return DEFAULT_CATEGORIES;
    return data;
  }

  async fetchSubcategories(): Promise<GRSubcategory[]> {
    const { data, error } = await this.client
      .from('gr_subcategories')
      .select('*')
      .order('display_order');
    if (error || !data || data.length === 0) return DEFAULT_SUBCATEGORIES;
    return data;
  }

  private async fetchAssignedGRIds(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('gr_repository_access')
      .select('gr_id')
      .eq('user_id', userId);
    if (error) {
      throw new Error(describeError(error, 'Could not load GR access assignments.'));
    }
    return (data || []).map((row) => row.gr_id);
  }

  private async fetchAssignments(grId: string): Promise<GRAccessAssignment[]> {
    const { data, error } = await this.client
      .from('gr_repository_access')
      .select('*')
      .eq('gr_id', grId);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      gr_id: row.gr_id,
      user_id: row.user_id,
      created_at: row.created_at,
    }));
  }

  private async resolveDepartmentName(id: string | undefined): Promise<string | null | undefined> {
    if (id === undefined) return undefined;
    if (!id) return null;
    const departments = await this.fetchDepartments();
    const dept = departments.find((d) => d.id === id);
    if (!dept) throw new Error('The selected Department was not found.');
    return dept.name;
  }

  private async resolveCategoryName(id: string | undefined): Promise<string | null | undefined> {
    if (id === undefined) return undefined;
    if (!id) return null;
    const categories = await this.fetchCategories();
    const cat = categories.find((c) => c.id === id);
    if (!cat) throw new Error('The selected Category was not found.');
    return `${cat.name_en} (${cat.name_gu})`;
  }

  private async resolveSubcategoryName(id: string | undefined): Promise<string | null | undefined> {
    if (id === undefined) return undefined;
    if (!id) return null;
    const subcategories = await this.fetchSubcategories();
    const sub = subcategories.find((s) => s.id === id);
    if (!sub) throw new Error('The selected Subcategory was not found.');
    return `${sub.name_en} (${sub.name_gu})`;
  }

  private mapRow(row: GRRow): GRRecord {
    return {
      id: row.id,
      gr_number: row.gr_number || '',
      title: row.title || '',
      document_type_id: row.document_type_id,
      department_id: row.department_id,
      category_id: row.category_id,
      subcategory_id: row.subcategory_id,
      department_name: row.department_name,
      category_name: row.category_name,
      subcategory_name: row.subcategory_name,
      issue_date: row.issue_date,
      issue_year: row.issue_year ?? null,
      description: row.description,
      keywords: row.keywords || [],
      file_name: row.file_name || '',
      storage_path: row.storage_path || '',
      file_size: Number(row.file_size || 0),
      mime_type: row.mime_type || 'application/pdf',
      visibility: row.visibility || 'public',
      owner_user_id: row.owner_user_id,
      status: row.status || 'active',
      created_by: row.created_by,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    };
  }

  private canUserReadGR(record: GRRecord, user: GRCurrentUser, assignedGrIds: string[]): boolean {
    if (record.visibility === 'public') return true;
    if (record.owner_user_id === user.id) return true;
    if (record.created_by === user.id) return true;
    return assignedGrIds.includes(record.id);
  }

  private decorate(record: GRRecord, user: GRCurrentUser | null, assignedGrIds: string[]): GRRecord {
    const userId = user?.id;
    const isOwner = !!userId && record.owner_user_id === userId;
    const isAssigned = !!userId && assignedGrIds.includes(record.id);
    const isCreator = !!userId && record.created_by === userId;
    const canManage = record.visibility === 'public' ? !!userId : isOwner || isAssigned || isCreator;

    record.is_owner = isOwner;
    record.can_manage = canManage;
    record.can_delete = canManage;
    return record;
  }
}

export const grRepositoryService = new GRRepositoryService();

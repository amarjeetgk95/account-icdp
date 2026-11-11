export interface GRDepartment {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

export interface GRDocumentType {
  id: string;
  name_en: string;
  name_gu: string;
  display_order: number;
  is_active?: boolean;
}

export interface GRCategory {
  id: string;
  name_en: string;
  name_gu: string;
  display_order: number;
  is_active?: boolean;
}

export interface GRSubcategory {
  id: string;
  category_id: string;
  name_en: string;
  name_gu: string;
  display_order: number;
  is_active?: boolean;
}

export type GRVisibility = 'public' | 'internal' | 'private' | 'restricted';

export type GRStatus = 'active' | 'superseded' | 'cancelled' | 'archived';

export interface GRAccessAssignment {
  id?: string;
  gr_id: string;
  user_id: string;
  user_email?: string;
  created_at?: string;
}

export interface GRCurrentUser {
  id: string;
  email: string;
  role?: 'office';
}

export interface GRRecord {
  id: string;
  gr_number: string;
  title: string;
  document_type_id?: string | null;
  document_type_name?: string | null;
  department_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  department_name?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  issue_date?: string | null;
  issue_year?: number | null;
  description?: string | null;
  keywords?: string[];
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  visibility: GRVisibility;
  owner_user_id?: string | null;
  status: GRStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assigned_users?: GRAccessAssignment[];
  is_owner?: boolean;
  can_manage?: boolean;
  can_delete?: boolean;
}

export interface GRAuditLog {
  id: number | string;
  gr_id?: string | null;
  gr_number?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action:
    | 'CREATED'
    | 'UPDATED'
    | 'PDF_REPLACED'
    | 'VISIBILITY_CHANGED'
    | 'ARCHIVED'
    | 'RESTORED'
    | 'DELETED';
  previous_visibility?: string | null;
  new_visibility?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface GRFilterState {
  searchQuery: string;
  departmentId: string;
  documentTypeId: string;
  categoryId: string;
  subcategoryId: string;
  dateFrom: string;
  dateTo: string;
  year: string;
  visibility: 'all' | 'public' | 'private';
  status: 'all' | 'active' | 'archived';
}

export interface GRPaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GRFormData {
  gr_number: string;
  title: string;
  document_type_id?: string;
  department_id?: string;
  category_id?: string;
  subcategory_id?: string;
  issue_date?: string;
  description?: string;
  keywords?: string[];
  visibility: 'public' | 'private';
  file?: File | Blob | null;
}

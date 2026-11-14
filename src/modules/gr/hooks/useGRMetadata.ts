import { useQuery, type QueryClient } from '@tanstack/react-query';
import { grRepositoryService } from '../services/grRepository.service';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_DOCUMENT_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
} from '../constants';
import type {
  GRDepartment,
  GRDocumentType,
  GRCategory,
  GRSubcategory,
} from '../types';

export const GR_METADATA_QUERY_KEYS = {
  departments: ['gr-departments'] as const,
  documentTypes: ['gr-document-types'] as const,
  categories: ['gr-categories'] as const,
  subcategories: ['gr-subcategories'] as const,
};

export function invalidateGRMetadata(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: GR_METADATA_QUERY_KEYS.departments });
  queryClient.invalidateQueries({ queryKey: GR_METADATA_QUERY_KEYS.documentTypes });
  queryClient.invalidateQueries({ queryKey: GR_METADATA_QUERY_KEYS.categories });
  queryClient.invalidateQueries({ queryKey: GR_METADATA_QUERY_KEYS.subcategories });
}

const METADATA_STALE_TIME = 1000 * 60 * 30;

export function useGRMetadata() {
  const departmentsQuery = useQuery<GRDepartment[]>({
    queryKey: GR_METADATA_QUERY_KEYS.departments,
    queryFn: () => grRepositoryService.fetchDepartments(),
    staleTime: METADATA_STALE_TIME,
  });

  const documentTypesQuery = useQuery<GRDocumentType[]>({
    queryKey: GR_METADATA_QUERY_KEYS.documentTypes,
    queryFn: () => grRepositoryService.fetchDocumentTypes(),
    staleTime: METADATA_STALE_TIME,
  });

  const categoriesQuery = useQuery<GRCategory[]>({
    queryKey: GR_METADATA_QUERY_KEYS.categories,
    queryFn: () => grRepositoryService.fetchCategories(),
    staleTime: METADATA_STALE_TIME,
  });

  const subcategoriesQuery = useQuery<GRSubcategory[]>({
    queryKey: GR_METADATA_QUERY_KEYS.subcategories,
    queryFn: () => grRepositoryService.fetchSubcategories(),
    staleTime: METADATA_STALE_TIME,
  });

  const subcategories = subcategoriesQuery.data || DEFAULT_SUBCATEGORIES;

  const getSubcategoriesForCategory = (categoryId?: string | null): GRSubcategory[] => {
    if (!categoryId || categoryId === 'all') return [];
    return subcategories.filter((s) => s.category_id === categoryId);
  };

  const getDocumentTypeLabel = (documentTypeId?: string | null): string => {
    if (!documentTypeId) return '';
    const types = documentTypesQuery.data || DEFAULT_DOCUMENT_TYPES;
    const type = types.find((t) => t.id === documentTypeId);
    if (!type) return documentTypeId;
    return type.name_gu ? `${type.name_en} (${type.name_gu})` : type.name_en;
  };

  return {
    departments: departmentsQuery.data || DEFAULT_DEPARTMENTS,
    documentTypes: documentTypesQuery.data || DEFAULT_DOCUMENT_TYPES,
    categories: categoriesQuery.data || DEFAULT_CATEGORIES,
    subcategories,
    getSubcategoriesForCategory,
    getDocumentTypeLabel,
    isLoading:
      departmentsQuery.isLoading ||
      documentTypesQuery.isLoading ||
      categoriesQuery.isLoading ||
      subcategoriesQuery.isLoading,
  };
}

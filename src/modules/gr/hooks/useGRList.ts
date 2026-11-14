import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/core/auth/store';
import { grRepositoryService } from '../services/grRepository.service';
import { DEFAULT_FILTER_STATE, DEFAULT_PAGE_SIZE } from '../constants';
import type { GRFilterState, GRPaginationState } from '../types';

export function useGRList() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<GRFilterState>(DEFAULT_FILTER_STATE);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.searchQuery);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery);
      setPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [filters.searchQuery]);

  const activeFilters = useMemo(
    () => ({
      ...filters,
      searchQuery: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  const queryKey = useMemo(
    () => ['gr_list', activeFilters, page, pageSize, user?.id],
    [activeFilters, page, pageSize, user?.id]
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () =>
      grRepositoryService.fetchGRs(activeFilters, { page, pageSize }, user),
    staleTime: 1000 * 30, // 30 seconds
  });

  const records = data?.data || [];
  const pagination: GRPaginationState = data?.pagination || {
    page,
    pageSize,
    totalCount: 0,
    totalPages: 0,
  };

  const setFilterField = <K extends keyof GRFilterState>(field: K, value: GRFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setDebouncedSearch('');
    setPage(1);
  };

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ['gr_list'] });
  };

  return {
    records,
    pagination,
    filters,
    isLoading,
    isFetching,
    error,
    setFilterField,
    resetFilters,
    setPage,
    setPageSize,
    refetch,
    invalidateList,
  };
}

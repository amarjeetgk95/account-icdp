import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gtr44BillsBackendRepository } from '../repositories/gtr44BillsBackend.repository';
import { GTR44Bill } from '../types';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export const useGTR44Bills = () => {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['gtr44Bills', officeId ?? null],
    queryFn: async () => {
      const backend = await gtr44BillsBackendRepository.list();
      return backend ?? [];
    },
  });
};

export const useGTR44Bill = (id: string) => {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['gtr44Bill', officeId ?? null, id],
    queryFn: async () => {
      return gtr44BillsBackendRepository.get(id);
    },
    enabled: !!id,
  });
};

export const useCreateGTR44Bill = () => {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: async (newBill: GTR44Bill) => {
      const saved = await gtr44BillsBackendRepository.save(newBill);
      if (!saved) throw new Error('Failed to save GTR-44 bill');
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills', officeId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
    },
  });
};

export const useUpdateGTR44Bill = () => {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: async ({ id, bill }: { id: string; bill: Partial<GTR44Bill> }) => {
      const existing = await gtr44BillsBackendRepository.get(id);
      const base = existing ?? ({ id } as GTR44Bill);
      const merged = { ...base, ...bill, id, updatedDate: new Date().toISOString() } as GTR44Bill;
      if (bill.formData) merged.formData = bill.formData as GTR44Bill['formData'];
      const saved = await gtr44BillsBackendRepository.save(merged);
      if (!saved) throw new Error('Failed to update GTR-44 bill');
      return saved;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills', officeId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bill', officeId ?? null, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bill', variables.id] });
    },
  });
};

export const useDeleteGTR44Bill = () => {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: async (id: string) => {
      const deleted = await gtr44BillsBackendRepository.delete(id);
      if (!deleted) throw new Error('Failed to delete GTR-44 bill');
      return deleted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills', officeId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
    },
  });
};

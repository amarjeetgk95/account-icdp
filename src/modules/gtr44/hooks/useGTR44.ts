import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gtr44Repository } from '../repositories/gtr44.repository';
import { gtr44BillsBackendRepository } from '../repositories/gtr44BillsBackend.repository';
import { GTR44Bill } from '../types';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export const useGTR44Bills = () => {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['gtr44Bills', officeId ?? null],
    queryFn: async () => {
      const backend = await gtr44BillsBackendRepository.list();
      if (backend !== null) return backend;
      return gtr44Repository.getBills();
    },
  });
};

export const useGTR44Bill = (id: string) => {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: ['gtr44Bill', officeId ?? null, id],
    queryFn: async () => {
      const backend = await gtr44BillsBackendRepository.get(id);
      if (backend !== null) return backend;
      return (await gtr44Repository.getBillById(id)) ?? null;
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
      if (saved) return saved;
      return gtr44Repository.createBill(newBill);
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
      // Try backend path: fetch current, merge, save
      const existingBackend = await gtr44BillsBackendRepository.get(id);
      if (existingBackend) {
        const merged = { ...existingBackend, ...bill, id, updatedDate: new Date().toISOString() } as GTR44Bill;
        // Ensure formData merge if needed
        if (bill.formData) merged.formData = bill.formData as GTR44Bill['formData'];
        const saved = await gtr44BillsBackendRepository.save(merged);
        if (saved) return saved;
      }
      // Check if backend list is available (office resolved) but bill not yet in backend (local-only) -> fallback to local then try to save to backend as new
      const localExisting = await gtr44Repository.getBillById(id);
      if (localExisting) {
        const mergedLocal = { ...localExisting, ...bill, id, updatedDate: new Date().toISOString() } as GTR44Bill;
        // Try backend save of merged local
        const backSaved = await gtr44BillsBackendRepository.save(mergedLocal);
        if (backSaved) return backSaved;
      }
      return gtr44Repository.updateBill(id, bill);
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
      if (deleted !== null) {
        // Also delete locally to keep in sync
        await gtr44Repository.deleteBill(id);
        return deleted;
      }
      return gtr44Repository.deleteBill(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills', officeId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gtr44Repository } from '../repositories/gtr44.repository';
import { GTR44Bill } from '../types';

export const useGTR44Bills = () => {
  return useQuery({
    queryKey: ['gtr44Bills'],
    queryFn: () => gtr44Repository.getBills()
  });
};

export const useGTR44Bill = (id: string) => {
  return useQuery({
    queryKey: ['gtr44Bill', id],
    queryFn: () => gtr44Repository.getBillById(id),
    enabled: !!id
  });
};

export const useCreateGTR44Bill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newBill: GTR44Bill) => gtr44Repository.createBill(newBill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
    }
  });
};

export const useUpdateGTR44Bill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bill }: { id: string; bill: Partial<GTR44Bill> }) => gtr44Repository.updateBill(id, bill),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
      queryClient.invalidateQueries({ queryKey: ['gtr44Bill', variables.id] });
    }
  });
};

export const useDeleteGTR44Bill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gtr44Repository.deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtr44Bills'] });
    }
  });
};

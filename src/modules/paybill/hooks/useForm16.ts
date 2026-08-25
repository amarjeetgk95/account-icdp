import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  form16Repository,
} from '../repositories/form16.repository';
import type {
  Form16Certificate,
  Form16Status,
  Form16DeductorDefaults,
  Form16Office24QSettings,
  Form16TaxRulesSettings,
} from '../types/form16';

import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useForm16Certificate(financialYear: number, hrpn: string | null) {
  return useQuery({
    queryKey: ['form16-certificate', financialYear, hrpn],
    queryFn: () => form16Repository.getCertificate(financialYear, hrpn!),
    enabled: !!hrpn && !!financialYear,
  });
}

export function useForm16List(financialYear?: number) {
  return useQuery({
    queryKey: ['form16-list', financialYear],
    queryFn: () => form16Repository.listCertificates(financialYear),
  });
}

export function useSaveForm16Draft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      cert: Omit<Form16Certificate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ) => form16Repository.saveDraft(cert),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['form16-certificate', variables.financialYear, variables.hrpn],
      });
      qc.invalidateQueries({ queryKey: ['form16-list'] });
    },
  });
}

export function useBatchSaveDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      certs: Array<Omit<Form16Certificate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>
    ) => form16Repository.batchSaveDrafts(certs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form16-list'] });
      qc.invalidateQueries({ queryKey: ['form16-certificate'] });
    },
  });
}

export function useUpdateForm16Status() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Form16Status }) =>
      form16Repository.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form16-list'] });
      qc.invalidateQueries({ queryKey: ['form16-certificate'] });
    },
  });
}

export function useBatchUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: Form16Status }) =>
      form16Repository.batchUpdateStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form16-list'] });
      qc.invalidateQueries({ queryKey: ['form16-certificate'] });
    },
  });
}

export function useBatchDeleteCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => form16Repository.batchDeleteCertificates(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form16-list'] });
      qc.invalidateQueries({ queryKey: ['form16-certificate'] });
    },
  });
}

export function useForm16Defaults() {
  const officeId = useActiveOfficeId();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['form16-defaults', officeId],
    queryFn: () => form16Repository.getDeductorDefaults(),
    enabled: !!officeId,
  });

  const saveMutation = useMutation({
    mutationFn: (defaults: Form16DeductorDefaults) =>
      form16Repository.saveDeductorDefaults(defaults),
    onSuccess: (saved) => {
      qc.setQueryData(['form16-defaults', officeId], saved);
      qc.invalidateQueries({ queryKey: ['form16-defaults'] });
    },
  });

  return {
    defaults: query.data,
    isLoading: query.isLoading,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}

export function useForm16Office24Q(financialYear: number) {
  const officeId = useActiveOfficeId();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['form16-24q-settings', officeId, financialYear],
    queryFn: () => form16Repository.get24QSettings(financialYear),
    enabled: !!officeId && !!financialYear,
  });

  const saveMutation = useMutation({
    mutationFn: (settings: Form16Office24QSettings) =>
      form16Repository.save24QSettings(settings),
    onSuccess: (saved) => {
      qc.setQueryData(['form16-24q-settings', officeId, financialYear], saved);
      qc.invalidateQueries({ queryKey: ['form16-24q-settings', officeId, financialYear] });
    },
  });

  const applyToAllMutation = useMutation({
    mutationFn: (settings: Form16Office24QSettings) =>
      form16Repository.apply24QToAllCertificates(financialYear, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form16-list'] });
      qc.invalidateQueries({ queryKey: ['form16-certificate'] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    applyToAllAsync: applyToAllMutation.mutateAsync,
    isApplying: applyToAllMutation.isPending,
  };
}

export function useForm16TaxRules() {
  const officeId = useActiveOfficeId();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['form16-tax-rules', officeId],
    queryFn: () => form16Repository.getTaxRulesSettings(),
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: (settings: Form16TaxRulesSettings) =>
      form16Repository.saveTaxRulesSettings(settings),
    onSuccess: (saved) => {
      qc.setQueryData(['form16-tax-rules', officeId], saved);
      qc.invalidateQueries({ queryKey: ['form16-tax-rules'] });
      qc.invalidateQueries({ queryKey: ['form16-list'] });
      qc.invalidateQueries({ queryKey: ['form16-certificate'] });
    },
  });

  return {
    taxRulesConfig: query.data,
    isLoading: query.isLoading,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selfAssessmentRepository } from '../repositories/selfAssessment.repository';
import type { SelfAssessmentMemo } from '../types/selfAssessment';

export function useSelfAssessmentMemo(financialYear: number, hrpn?: string | null) {
  return useQuery({
    queryKey: ['self-assessment-memo', financialYear, hrpn],
    queryFn: () => (hrpn ? selfAssessmentRepository.getMemo(financialYear, hrpn) : null),
    enabled: Boolean(financialYear && hrpn),
  });
}

export function useSelfAssessmentList(financialYear: number) {
  return useQuery({
    queryKey: ['self-assessment-list', financialYear],
    queryFn: () => selfAssessmentRepository.listMemos(financialYear),
    enabled: Boolean(financialYear),
  });
}

export function useSaveSelfAssessmentMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memo,
      syncWithForm16 = false,
    }: {
      memo: SelfAssessmentMemo;
      syncWithForm16?: boolean;
    }) => selfAssessmentRepository.saveMemo(memo, syncWithForm16),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({
        queryKey: ['self-assessment-memo', data.financialYear, data.hrpn],
      });
      qc.invalidateQueries({
        queryKey: ['self-assessment-list', data.financialYear],
      });
      if (variables.syncWithForm16) {
        qc.invalidateQueries({
          queryKey: ['form16-certificate', data.financialYear, data.hrpn],
        });
        qc.invalidateQueries({
          queryKey: ['form16-list', data.financialYear],
        });
      }
    },
  });
}

export function useDeleteSelfAssessmentMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, hrpn }: { financialYear: number; hrpn: string }) =>
      selfAssessmentRepository.deleteMemo(financialYear, hrpn),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['self-assessment-memo', variables.financialYear, variables.hrpn],
      });
      qc.invalidateQueries({
        queryKey: ['self-assessment-list', variables.financialYear],
      });
    },
  });
}

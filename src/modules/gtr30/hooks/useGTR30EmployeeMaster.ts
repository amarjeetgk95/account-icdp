import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  gtr30EmployeeMasterService,
  gtr30GroupKey,
} from '../services/gtr30EmployeeMaster.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

function gtr30EmployeeMasterGroupsKey(officeId?: string | null): readonly unknown[] {
  return ['gtr30EmployeeMasterGroups', officeId ?? null];
}

function gtr30EmployeeMasterGroupKey(
  officeId: string | null | undefined,
  monthKey: string,
  billCode: string
): readonly unknown[] {
  return [
    'gtr30EmployeeMasterGroup',
    officeId ?? null,
    monthKey.trim().toLowerCase(),
    billCode.trim().toLowerCase(),
  ];
}

export function useGTR30EmployeeMasterGroups() {
  const officeId = useActiveOfficeId();
  return useQuery({
    queryKey: gtr30EmployeeMasterGroupsKey(officeId),
    queryFn: () => Promise.resolve(gtr30EmployeeMasterService.listGroupsAsMap()),
    initialData: () => gtr30EmployeeMasterService.listGroupsAsMap(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export interface SaveEmployeeInput {
  monthKey: string;
  billCode: string;
  employee: import('../validation/gtr30EmployeeMaster.schema').GTR30EmployeeMasterInput;
}

export function useSaveGTR30Employee() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (input: SaveEmployeeInput) =>
      Promise.resolve(gtr30EmployeeMasterService.saveEmployee(
        input.monthKey,
        input.billCode,
        input.employee
      )),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey(officeId) });
      queryClient.invalidateQueries({
        queryKey: gtr30EmployeeMasterGroupKey(officeId, variables.monthKey, variables.billCode),
      });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export interface SaveEmployeeGroupInput {
  monthKey: string;
  billCode: string;
  employees: import('../validation/gtr30EmployeeMaster.schema').GTR30EmployeeMasterInput[];
}

export function useSaveGTR30EmployeeGroup() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (input: SaveEmployeeGroupInput) =>
      Promise.resolve(gtr30EmployeeMasterService.saveGroup(
        input.monthKey,
        input.billCode,
        input.employees
      )),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey(officeId) });
      queryClient.invalidateQueries({
        queryKey: gtr30EmployeeMasterGroupKey(officeId, variables.monthKey, variables.billCode),
      });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30EmployeeAcrossGroups() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (input: { billCode: string; employeeId: string; hrpnNo?: string }) =>
      Promise.resolve(
        gtr30EmployeeMasterService.removeEmployeeAcrossGroups(
          input.employeeId,
          input.hrpnNo,
          input.billCode
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30EmployeeBatch() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (input: {
      monthKey: string;
      items: Array<{ billCode: string; employeeId: string; hrpnNo?: string }>;
    }) => {
      let removedCount = 0;
      for (const item of input.items) {
        const result = gtr30EmployeeMasterService.removeEmployeeAcrossGroups(
          item.employeeId,
          item.hrpnNo,
          item.billCode
        );
        removedCount += result.removedCount;
      }
return Promise.resolve({ removedCount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export interface CopyEmployeeGroupInput {
  sourceMonthKey: string;
  sourceBillCode: string;
  targetMonthKey: string;
  targetBillCode: string;
  options?: { overwrite?: boolean; daPercent?: number };
}

export function useCopyGTR30EmployeeGroup() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (input: CopyEmployeeGroupInput) =>
      Promise.resolve(gtr30EmployeeMasterService.copyGroup(
        input.sourceMonthKey,
        input.sourceBillCode,
        input.targetMonthKey,
        input.targetBillCode,
        input.options
      )),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey(officeId) });
      queryClient.invalidateQueries({
        queryKey: gtr30EmployeeMasterGroupKey(officeId, variables.targetMonthKey, variables.targetBillCode),
      });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useHydrateGTR30EmployeeMaster() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: () => gtr30EmployeeMasterService.hydrateFromBackend(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey(officeId) });
    },
  });
}

export { gtr30GroupKey };


import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  gtr30EmployeeMasterService,
  gtr30GroupKey,
} from '../services/gtr30EmployeeMaster.service';
import { invalidateGtr30Queries } from '@/shared/utilities/gtr30Query';

function gtr30EmployeeMasterGroupsKey(): readonly unknown[] {
  return ['gtr30EmployeeMasterGroups', 'all'];
}

function gtr30EmployeeMasterGroupKey(
  monthKey: string,
  billCode: string
): readonly unknown[] {
  return [
    'gtr30EmployeeMasterGroup',
    'all',
    monthKey.trim().toLowerCase(),
    billCode.trim().toLowerCase(),
  ];
}

export function useGTR30EmployeeMasterGroups() {
  return useQuery({
    queryKey: gtr30EmployeeMasterGroupsKey(),
    queryFn: async () => {
      await gtr30EmployeeMasterService.hydrateFromBackend();
      return gtr30EmployeeMasterService.listGroupsAsMap();
    },
    initialData: () => gtr30EmployeeMasterService.listGroupsAsMap(),
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
}

export interface SaveEmployeeInput {
  monthKey: string;
  billCode: string;
  employee: import('../validation/gtr30EmployeeMaster.schema').GTR30EmployeeMasterInput;
}

export function useSaveGTR30Employee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveEmployeeInput) =>
      Promise.resolve(gtr30EmployeeMasterService.saveEmployee(
        input.monthKey,
        input.billCode,
        input.employee
      )),
    onSuccess: (_data, variables) => {
      // Immediately update cache so list/form reflect without reload (local is already updated)
      queryClient.setQueryData(gtr30EmployeeMasterGroupsKey(), gtr30EmployeeMasterService.listGroupsAsMap());
      queryClient.setQueryData(
        gtr30EmployeeMasterGroupKey(variables.monthKey, variables.billCode),
        gtr30EmployeeMasterService.getGroup(variables.monthKey, variables.billCode)
      );
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey() });
      queryClient.invalidateQueries({
        queryKey: gtr30EmployeeMasterGroupKey(variables.monthKey, variables.billCode),
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

  return useMutation({
    mutationFn: (input: SaveEmployeeGroupInput) =>
      Promise.resolve(gtr30EmployeeMasterService.saveGroup(
        input.monthKey,
        input.billCode,
        input.employees
      )),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey() });
      queryClient.invalidateQueries({
        queryKey: gtr30EmployeeMasterGroupKey(variables.monthKey, variables.billCode),
      });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30EmployeeAcrossGroups() {
  const queryClient = useQueryClient();

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
      queryClient.setQueryData(
        gtr30EmployeeMasterGroupsKey(),
        gtr30EmployeeMasterService.listGroupsAsMap()
      );
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey() });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useRemoveGTR30EmployeeBatch() {
  const queryClient = useQueryClient();

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
      queryClient.setQueryData(
        gtr30EmployeeMasterGroupsKey(),
        gtr30EmployeeMasterService.listGroupsAsMap()
      );
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey() });
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
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey() });
      queryClient.invalidateQueries({
        queryKey: gtr30EmployeeMasterGroupKey(variables.targetMonthKey, variables.targetBillCode),
      });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useHydrateGTR30EmployeeMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gtr30EmployeeMasterService.hydrateFromBackend(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30EmployeeMasterGroupsKey() });
    },
  });
}

export { gtr30GroupKey };


export function useGtr30BillsQueryKey(officeId?: string | null): readonly unknown[] {
  return ['gtr30Bills', officeId ?? null];
}

export function gtr30BillQueryKey(officeId: string | null | undefined, id: string): readonly unknown[] {
  return ['gtr30Bill', officeId ?? null, id];
}

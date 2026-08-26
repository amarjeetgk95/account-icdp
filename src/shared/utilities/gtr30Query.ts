import type { QueryClient } from '@tanstack/react-query';

export function isGtr30QueryKey(keys: readonly unknown[]): boolean {
  return typeof keys[0] === 'string' && keys[0].startsWith('gtr30');
}

export function invalidateGtr30Queries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => isGtr30QueryKey(query.queryKey),
  });
}

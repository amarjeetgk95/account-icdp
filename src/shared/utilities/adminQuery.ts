import type { QueryClient } from '@tanstack/react-query';

function isAdminQueryKey(keys: readonly unknown[]): boolean {
  return typeof keys[0] === 'string' && keys[0].startsWith('admin');
}

export function invalidateAdminQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => isAdminQueryKey(query.queryKey),
  });
}

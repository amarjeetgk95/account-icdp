import type { QueryClient } from '@tanstack/react-query';

export const PAYBILL_QUERY_KEY_ROOT = 'paybill';

/**
 * Invalidate every paybill query (directory, ledger rows, config).
 * Replaces the legacy refreshTrigger prop-drilling pattern.
 */
export function invalidatePaybillData(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [PAYBILL_QUERY_KEY_ROOT] });
}

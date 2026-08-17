import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateGtr30Queries, isGtr30QueryKey } from './gtr30Query';

type Predicate = (q: { queryKey: readonly unknown[] }) => boolean;
type InvalidateOpts = { predicate?: Predicate };

function getPredicate(opts: unknown): Predicate {
  const o = opts as InvalidateOpts;
  expect(o.predicate).toBeDefined();
  return o.predicate!;
}

describe('gtr30Query', () => {
  describe('isGtr30QueryKey', () => {
    it('matches keys prefixed with gtr30', () => {
      expect(isGtr30QueryKey(['gtr30Bills'])).toBe(true);
      expect(isGtr30QueryKey(['gtr30Bill', 'abc'])).toBe(true);
      expect(isGtr30QueryKey(['gtr30Settings'])).toBe(true);
    });

    it('rejects non-gtr30 keys', () => {
      expect(isGtr30QueryKey(['admin', 'users'])).toBe(false);
      expect(isGtr30QueryKey(['payroll'])).toBe(false);
      expect(isGtr30QueryKey([])).toBe(false);
      expect(isGtr30QueryKey([42])).toBe(false);
    });
  });

  describe('invalidateGtr30Queries', () => {
    it('only invalidates gtr30-prefixed keys', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      await invalidateGtr30Queries(queryClient);

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      const opts = invalidateSpy.mock.calls[0]?.[0];
      const predicate = getPredicate(opts);

      expect(predicate({ queryKey: ['gtr30Bills'] })).toBe(true);
      expect(predicate({ queryKey: ['gtr30Bill', 'x'] })).toBe(true);
      expect(predicate({ queryKey: ['gtr30Settings'] })).toBe(true);
      expect(predicate({ queryKey: ['admin', 'users'] })).toBe(false);
      expect(predicate({ queryKey: ['payroll'] })).toBe(false);
    });
  });
});

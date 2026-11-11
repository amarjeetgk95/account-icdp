// ============================================================================
// THE single counting path for the establishment module.
//
// Every tally in every view — per-office, per-designation, per-budget-head,
// per-class, the stat cards, the tfoot and the CSV footers — must go through
// these helpers, so the rule can never drift between screens:
//   • total counts every position (a.k.a. "sanctioned")
//   • filled + vacant always equals total
//   • underCharge is a SUBSET of vacant (an under-charge post has no regular
//     appointee — the charge holder is only an additional-charge officer)
// ============================================================================

import type { PositionStatus } from '../types';

export interface StatusTally {
  /** Sanctioned positions — one per position row. */
  total: number;
  filled: number;
  vacant: number;
  /** "Of which" breakdown of `vacant` — never an extra bucket. */
  underCharge: number;
}

export const emptyTally = (): StatusTally => ({ total: 0, filled: 0, vacant: 0, underCharge: 0 });

/** Buckets a single status into `t` (mutates and returns `t` for chaining). */
export function addStatus(t: StatusTally, status: PositionStatus | string | null | undefined): StatusTally {
  t.total += 1;
  if (status === 'Filled') {
    t.filled += 1;
  } else {
    t.vacant += 1;
    if (status === 'Under Charge') t.underCharge += 1;
  }
  return t;
}

/** Counts a whole record array in one call. */
export function countStatuses(
  records: readonly { status?: PositionStatus | string | null }[],
): StatusTally {
  const t = emptyTally();
  for (const r of records) addStatus(t, r.status);
  return t;
}

/** Fetches (creating on demand) the tally stored at `key` in `map`. */
export function tallyOf(map: Map<string, StatusTally>, key: string): StatusTally {
  let t = map.get(key);
  if (!t) {
    t = emptyTally();
    map.set(key, t);
  }
  return t;
}

/** Accumulates `from` into `into` (used for roll-ups/footers). */
export function addTally(into: StatusTally, from: Partial<StatusTally> | undefined | null): StatusTally {
  if (!from) return into;
  into.total += from.total ?? 0;
  into.filled += from.filled ?? 0;
  into.vacant += from.vacant ?? 0;
  into.underCharge += from.underCharge ?? 0;
  return into;
}

/** True when a status represents a regular (non-charge) appointee. */
export const isFilled = (status: PositionStatus | string | null | undefined): boolean =>
  status === 'Filled';

/** True for the under-charge (additional charge) status. */
export const isUnderCharge = (status: PositionStatus | string | null | undefined): boolean =>
  status === 'Under Charge';

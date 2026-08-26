/**
 * Sort a list of column/row definitions by a persisted order of keys.
 * Items not present in `order` keep their original relative order (after ordered items).
 * Items whose key is in `pinnedKeys` are always appended last (e.g. Gross Amt, Total Deductions, Net Pay).
 */
export function orderItems<T extends { key: string }>(
  items: T[],
  order: string[],
  pinnedKeys: string[] = []
): T[] {
  if (order.length === 0) {
    return [...items];
  }

  const orderIndex = new Map(order.map((k, i) => [k, i]));
  const movable = items.filter((it) => !pinnedKeys.includes(it.key));
  const pinned = items.filter((it) => pinnedKeys.includes(it.key));

  const sorted = [...movable].sort((a, b) => {
    const ia = orderIndex.get(a.key);
    const ib = orderIndex.get(b.key);
    if (ia === undefined && ib === undefined) return 0;
    if (ia === undefined) return 1;
    if (ib === undefined) return -1;
    return ia - ib;
  });

  return [...sorted, ...pinned];
}

/**
 * Resolve the full display order of keys for one group (earning or deduction).
 * Falls back to the default order (standard keys first, then manual keys) when no
 * custom order is saved, and appends any missing keys to the end of a custom order.
 */
export function orderedKeyList(standardKeys: string[], manualKeys: string[], order: string[]): string[] {
  const defaultOrder = [...standardKeys, ...manualKeys];
  if (order.length === 0) return defaultOrder;

  const seen = new Set<string>();
  return [...order, ...defaultOrder].filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
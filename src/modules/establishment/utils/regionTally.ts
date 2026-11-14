// ============================================================================
// THE regional roll-up path: KPI cards, the district-wise table and the
// "attention required" lists the admin dashboard needs.
//
// Before this file every view rolled these numbers up on its own — the
// dashboard ran ~8 un-memoised .filter() passes over the register, each report
// view repeated its own, and two of them disagreed on the label for the same
// bucket. All of it goes through the helpers below.
//
// This module is deliberately pure: arrays in, tallies out. No React, no
// context, no Supabase. Callers decide when to memoise.
//
// Counting is NOT reimplemented — statusTally.ts stays the single counting
// path, so the invariant it documents still holds everywhere:
//   • total counts every position (a.k.a. "sanctioned")
//   • filled + vacant always equals total
//   • underCharge is a SUBSET of vacant
// Abolished / Cancelled therefore still land in `vacant` (they are dead posts
// with no officer); `abolished` / `cancelled` are reported as separate
// read-only counters on top, never as extra buckets that break the identity.
// ============================================================================

import { formatDateObjectDDMMYYYY, toISODateOrNull } from '@/shared/utilities/date';
import type {
  EstablishmentDistrictRef,
  EstablishmentOfficeRef,
  EstablishmentRecord,
} from '../types';
import { addStatus, emptyTally, type StatusTally } from './statusTally';

/** The register's one-and-only counting shape, plus the dashboard's extra read-outs. */
export interface RegionTally extends StatusTally {
  abolished: number;
  cancelled: number;
  /** 0-100, integer, 0 when total is 0. */
  fillPct: number;
  /** 0-100, integer, 0 when total is 0. vacant / total. */
  vacancyPct: number;
}

/** One district/office row of a roll-up table. */
export interface GroupedTally {
  /** '' when the record carries no district/office id (unlinked). */
  id: string;
  /** Display label, Gujarati preferred, falling back to English then the raw id. */
  label: string;
  labelGu: string;
  officeType: string;
  tally: RegionTally;
}

/** Bucket id for records that carry no district/office link at all. */
const UNLINKED_ID = '';

/** The placeholder the register writes when a value was never recorded. Never a real value. */
const NOT_RECORDED = '-';

/** Trimmed read of any master/record field, with the '-' placeholder mapped to ''. */
const idOf = (v: string | null | undefined): string => {
  const t = (v ?? '').toString().trim();
  return t === NOT_RECORDED ? '' : t;
};

/** Integer 0-100 share of `part` in `total`; 0 when there is nothing to divide. */
const pct = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/**
 * One group's running counters. `tally` is filled exclusively through
 * statusTally's addStatus so the filled + vacant === total invariant cannot be
 * re-broken here.
 */
interface GroupAccumulator {
  tally: StatusTally;
  abolished: number;
  cancelled: number;
}

const newAccumulator = (): GroupAccumulator => ({
  tally: emptyTally(),
  abolished: 0,
  cancelled: 0,
});

const addRecordTo = (acc: GroupAccumulator, record: EstablishmentRecord): void => {
  addStatus(acc.tally, record.status);
  if (record.status === 'Abolished') acc.abolished += 1;
  else if (record.status === 'Cancelled') acc.cancelled += 1;
};

const resolveTally = (acc: GroupAccumulator): RegionTally => ({
  ...acc.tally,
  abolished: acc.abolished,
  cancelled: acc.cancelled,
  fillPct: pct(acc.tally.filled, acc.tally.total),
  vacancyPct: pct(acc.tally.vacant, acc.tally.total),
});

/** Counts a whole record array once, with percentages. */
export function tallyRegion(records: readonly EstablishmentRecord[]): RegionTally {
  const acc = newAccumulator();
  for (const r of records) addRecordTo(acc, r);
  return resolveTally(acc);
}

/**
 * Builds the ordered output of a grouped roll-up.
 *
 * Order is: every master row in `orderedIds` sequence, then any record-only
 * (orphan) group in first-appearance order, then the unlinked bucket last so a
 * data-integrity row can never be mistaken for a real district or office.
 */
function resolveGroups(
  orderedIds: readonly string[],
  accs: Map<string, GroupAccumulator>,
  describe: (id: string) => { label: string; labelGu: string; officeType: string },
): GroupedTally[] {
  const out: GroupedTally[] = [];
  const emitted = new Set<string>();

  const push = (id: string) => {
    emitted.add(id);
    const { label, labelGu, officeType } = describe(id);
    out.push({ id, label, labelGu, officeType, tally: resolveTally(accs.get(id) ?? newAccumulator()) });
  };

  for (const id of orderedIds) if (!emitted.has(id)) push(id);
  for (const id of accs.keys()) if (!emitted.has(id) && id !== UNLINKED_ID) push(id);
  if (accs.has(UNLINKED_ID)) push(UNLINKED_ID);

  return out;
}

/** Per-district roll-up, sorted by the district order given in `districts`. Unlinked records land under id ''. */
export function buildDistrictTallies(
  records: readonly EstablishmentRecord[],
  districts: readonly EstablishmentDistrictRef[],
): GroupedTally[] {
  const accs = new Map<string, GroupAccumulator>();
  const get = (id: string): GroupAccumulator => {
    let acc = accs.get(id);
    if (!acc) {
      acc = newAccumulator();
      accs.set(id, acc);
    }
    return acc;
  };

  // Seed every master district so an empty district still reports total 0.
  for (const d of districts) get(idOf(d.id));
  for (const r of records) addRecordTo(get(idOf(r.districtId)), r);

  const byId = new Map(districts.map(d => [idOf(d.id), d]));
  return resolveGroups(
    districts.map(d => idOf(d.id)),
    accs,
    id => {
      const d = byId.get(id);
      const labelGu = idOf(d?.nameGu);
      return { label: labelGu || idOf(d?.name) || id, labelGu, officeType: '' };
    },
  );
}

/** Per-office roll-up, sorted by district order then office order. Unlinked records land under id ''. */
export function buildOfficeTallies(
  records: readonly EstablishmentRecord[],
  offices: readonly EstablishmentOfficeRef[],
): GroupedTally[] {
  const accs = new Map<string, GroupAccumulator>();
  const get = (id: string): GroupAccumulator => {
    let acc = accs.get(id);
    if (!acc) {
      acc = newAccumulator();
      accs.set(id, acc);
    }
    return acc;
  };

  // Seed every master office so an office that hasn't entered data still reports total 0.
  for (const o of offices) get(idOf(o.id));
  for (const r of records) addRecordTo(get(idOf(r.officeId)), r);

  // District order is the order districts first appear in the office master
  // (the master is already listed district-then-office); offices inside a
  // district keep that master order, which Array#sort guarantees when the
  // comparator returns 0 (stable since ES2019).
  const districtRank = new Map<string, number>();
  for (const o of offices) {
    const d = idOf(o.districtId);
    if (!districtRank.has(d)) districtRank.set(d, districtRank.size);
  }
  const rank = (o: EstablishmentOfficeRef): number =>
    districtRank.get(idOf(o.districtId)) ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...offices].sort((a, b) => rank(a) - rank(b));

  const byId = new Map(offices.map(o => [idOf(o.id), o]));
  return resolveGroups(
    sorted.map(o => idOf(o.id)),
    accs,
    id => {
      const o = byId.get(id);
      const labelGu = idOf(o?.nameGu);
      return {
        label: labelGu || idOf(o?.name) || id,
        labelGu,
        officeType: idOf(o?.officeType),
      };
    },
  );
}

// ============================================================================
// "ATTENTION REQUIRED" QUERIES
//
// The dashboard's actionable lists. All pure, all array-in/array-out, all
// deterministically sorted so a re-render never reshuffles a clerk's list.
//
// statusDate is a DD-MM-YYYY DISPLAY string. It is parsed with the shared
// date helpers, never with `new Date(string)` (which would read it as
// MM-DD-YYYY and silently shift the age). A row whose statusDate is empty,
// '-', or otherwise unparseable has UNKNOWN age — it is EXCLUDED rather than
// treated as infinitely stale, because flagging every legacy row as "vacant
// for 20 years" is how a warning banner stops being read.
//
// Ages are measured in whole IST calendar days: "today" is resolved through
// the IST formatter (never the browser clock, per the project date rule), and
// a position is flagged once it has been in the state for `minDays` or more.
// ============================================================================

const DAY_MS = 86_400_000;

/** Start-of-today as a UTC ms value, using the IST calendar day. NaN when `now` is invalid. */
function startOfTodayUtc(now: Date): number {
  const gu = formatDateObjectDDMMYYYY(now);
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(gu);
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : NaN;
}

/** Whole IST days a record has been in its current status; null when the date is unusable. */
function statusAgeDays(record: EstablishmentRecord, todayUtc: number): number | null {
  const iso = toISODateOrNull(record.statusDate);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const then = Date.UTC(y, m - 1, d);
  if (Number.isNaN(then)) return null;
  return Math.round((todayUtc - then) / DAY_MS);
}

/** Deterministic tie-break: position number, compared numerically where possible. */
const byPositionNo = (a: EstablishmentRecord, b: EstablishmentRecord): number =>
  (a.positionNo || '').localeCompare(b.positionNo || '', undefined, { numeric: true });

/** Longest-standing first, position number as the stable tie-break. */
function byAgeDesc(a: EstablishmentRecord, b: EstablishmentRecord, todayUtc: number): number {
  // Unknown ages sink to the bottom instead of masquerading as the oldest.
  const ageA = statusAgeDays(a, todayUtc) ?? Number.NEGATIVE_INFINITY;
  const ageB = statusAgeDays(b, todayUtc) ?? Number.NEGATIVE_INFINITY;
  if (ageA !== ageB) return ageB - ageA;
  return byPositionNo(a, b);
}

/** Vacant (not under-charge) positions whose statusDate is older than `minDays`. */
export function findLongVacantPositions(
  records: readonly EstablishmentRecord[],
  minDays: number,
  now: Date = new Date(),
): EstablishmentRecord[] {
  const todayUtc = startOfTodayUtc(now);
  if (Number.isNaN(todayUtc)) return [];
  const hits: EstablishmentRecord[] = [];
  for (const r of records) {
    // Exactly 'Vacant': under-charge is reported by findAgingCharges, and the
    // terminal states are dead posts, not vacancies to be filled.
    if (r.status !== 'Vacant') continue;
    const age = statusAgeDays(r, todayUtc);
    if (age === null || age < minDays) continue;
    hits.push(r);
  }
  return hits.sort((a, b) => byAgeDesc(a, b, todayUtc));
}

/** Positions currently under charge whose statusDate is older than `minDays`. */
export function findAgingCharges(
  records: readonly EstablishmentRecord[],
  minDays: number,
  now: Date = new Date(),
): EstablishmentRecord[] {
  const todayUtc = startOfTodayUtc(now);
  if (Number.isNaN(todayUtc)) return [];
  const hits: EstablishmentRecord[] = [];
  for (const r of records) {
    if (r.status !== 'Under Charge') continue;
    const age = statusAgeDays(r, todayUtc);
    if (age === null || age < minDays) continue;
    hits.push(r);
  }
  return hits.sort((a, b) => byAgeDesc(a, b, todayUtc));
}

/** Positions with no Budget Head link. */
export function findUnassignedBudgetHead(
  records: readonly EstablishmentRecord[],
): EstablishmentRecord[] {
  return records.filter(r => !idOf(r.budgetHeadId)).sort(byPositionNo);
}

/** Records with neither officeId nor designationId — silently dropped by every report today. */
export function findUnlinkedRecords(
  records: readonly EstablishmentRecord[],
): EstablishmentRecord[] {
  return records
    .filter(r => !idOf(r.officeId) && !idOf(r.designationId))
    .sort(byPositionNo);
}

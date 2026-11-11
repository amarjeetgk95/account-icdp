// ============================================================================
// Shared record → master lookup helpers.
//
// These were duplicated (with slightly drifting copies) in every report and
// search view. Keeping one copy means a record's resolved cadre class, or the
// match between a record and its designation master row, is identical on every
// screen.
// ============================================================================

import type {
  EstablishmentDesignationRef,
  EstablishmentRecord,
} from '../types';
import { isResolutionStatus } from '../types';
import { formatDateDDMMYYYY } from '@/shared/utilities/date';
import { resolveCadreClassDigit } from './cadreClass';

/** Case-insensitive search normalizer (the `lc` helper the views kept re-declaring). */
export const normalizeText = (v: string | null | undefined): string =>
  (v ?? '').toString().toLowerCase();

/** Finds a record's designation master row, if the record links to one. */
export function findDesignation(
  designations: readonly EstablishmentDesignationRef[],
  designationId?: string | null,
): EstablishmentDesignationRef | undefined {
  return designationId ? designations.find(d => d.id === designationId) : undefined;
}

/** Record shape needed to resolve a cadre class, so callers can pass partials. */
type ClassifiableRecord = Pick<EstablishmentRecord, 'cadreClass' | 'designationId'>;

/**
 * Resolves the normalized cadre class digit ('1'..'4', or '' when unknown) for
 * a record: an explicit `cadreClass` wins, otherwise the linked designation's
 * `classLevel`, otherwise the designation's pay level/scale.
 */
export function recordCadreClass(
  record: ClassifiableRecord,
  designations: readonly EstablishmentDesignationRef[],
): string {
  const d = findDesignation(designations, record.designationId);
  const raw =
    (record.cadreClass && String(record.cadreClass).trim()) ||
    d?.classLevel ||
    '';
  return resolveCadreClassDigit(raw, d?.payMatrixLevel || d?.payScale);
}

/** Any record shape carrying a status — lets callers pass partials. */
type StatusedRecord = { status?: string | null };

/**
 * THE report scope filter for terminal administrative positions.
 *
 * Abolished (અબેયન્સ) and Cancelled (રદ) posts are dead posts: they hold no
 * position number, no officer and no charge arrangement. Every report runs its
 * whole pipeline — grouping, head/designation/office roll-ups, the stat cards
 * and the CSV/Excel exports — through this one function, so the
 * "Include અબેયન્સ/રદ" toggle can never leave a table, a total and an export
 * disagreeing about whether a dead post still counts as sanctioned.
 *
 * `include` short-circuits and returns the original array so the memoized
 * downstream consumers keep their identity when nothing is filtered out.
 */
export function scopeRecords<T extends StatusedRecord>(records: readonly T[], include: boolean): T[] {
  if (include) return records as T[];
  return records.filter(r => !isResolutionStatus(r.status));
}

/** How many terminal (અબેયન્સ/રદ) posts the toggle is currently hiding — shown on it. */
export const countResolutionRecords = (records: readonly StatusedRecord[]): number => {
  let n = 0;
  for (const r of records) if (isResolutionStatus(r.status)) n += 1;
  return n;
};

// ============================================================================
// CHARGE-HOLDER (ઈ/ચા) RESOLUTION — the ONE copy of a block that was pasted
// into FOUR views: OfficeEstablishmentView (495-530), AdminEstablishmentView
// (86-122), AdminOfficeReportView (102-138) and AdminSanctionMatrixView
// (337-382). All four built an HRPN -> { name, mobile } directory from every
// posting, then resolved a charge holder with the same two-step precedence.
// The copies had already drifted: the office register returned '-' when a
// mobile could not be resolved, so its CSV export needed a second, different
// guard — and every future fix had to be made four times.
//
// The rule now: '-' means "not recorded" everywhere and is never a value, all
// reads are trimmed, FIRST hit wins, and an unresolved holder is '' (empty
// string) so `value || '-'` is the only display guard any screen needs.
// ============================================================================

/** One resolved person in the regional HRPN directory. */
export interface HrpnDirectoryEntry {
  name: string;
  mobile: string;
}

/** Minimal record shape the charge-holder helpers need, so views can pass partials. */
export interface ChargeLookupRecord {
  hrpnNo?: string | null;
  employeeName?: string | null;
  mobileNo?: string | null;
  chargeHrpnNo?: string | null;
  chargeNameGu?: string | null;
  chargeMobileNo?: string | null;
}

/** The placeholder the register writes when a value was never recorded. Never a real value. */
const NOT_RECORDED = '-';

/** Trimmed read of any master/record field, with the '-' placeholder mapped to ''. */
const cleanValue = (v: string | null | undefined): string => {
  const t = (v ?? '').toString().trim();
  return t === NOT_RECORDED ? '' : t;
};

/** Builds HRPN -> { name, mobile } from every regular and charge posting. First hit wins. */
export function buildHrpnDirectory(
  records: readonly ChargeLookupRecord[],
): Map<string, HrpnDirectoryEntry> {
  const map = new Map<string, HrpnDirectoryEntry>();
  for (const r of records) {
    const hrpn = cleanValue(r.hrpnNo);
    const name = cleanValue(r.employeeName);
    if (hrpn && name && !map.has(hrpn)) {
      map.set(hrpn, { name, mobile: cleanValue(r.mobileNo) });
    }
    const chargeHrpn = cleanValue(r.chargeHrpnNo);
    const chargeName = cleanValue(r.chargeNameGu);
    if (chargeHrpn && chargeName && !map.has(chargeHrpn)) {
      map.set(chargeHrpn, { name: chargeName, mobile: cleanValue(r.chargeMobileNo) });
    }
  }
  return map;
}

/** Charge holder name for a row: row's own value first, else the directory by chargeHrpnNo. '' when unknown. */
export function chargeNameOf(
  row: ChargeLookupRecord,
  directory: Map<string, HrpnDirectoryEntry>,
): string {
  const direct = cleanValue(row.chargeNameGu);
  if (direct) return direct;
  const hrpn = cleanValue(row.chargeHrpnNo);
  return hrpn ? cleanValue(directory.get(hrpn)?.name) : '';
}

/** Charge holder mobile for a row. Same precedence. '' when unknown. */
export function chargeMobileOf(
  row: ChargeLookupRecord,
  directory: Map<string, HrpnDirectoryEntry>,
): string {
  const direct = cleanValue(row.chargeMobileNo);
  if (direct) return direct;
  const hrpn = cleanValue(row.chargeHrpnNo);
  return hrpn ? cleanValue(directory.get(hrpn)?.mobile) : '';
}

// ============================================================================
// BUDGET HEAD INTEGRITY
//
// NULL budgetHeadId = Unassigned (pre-backfill). The count drives the
// data-integrity warning banner, and was inlined in at least two views
// (AdminEstablishmentView:192 and the office register's unassignedCount).
// ============================================================================

/** How many positions have no Budget Head linked (records.budgetHeadId is null/empty). */
export function countUnassignedBudgetHead(
  records: readonly { budgetHeadId?: string | null }[],
): number {
  let n = 0;
  for (const r of records) if (!cleanValue(r.budgetHeadId)) n += 1;
  return n;
}

// ============================================================================
// ઠરાવ (RESOLUTION) DETAIL
//
// Canonical home of formatTharavDetail. It used to be declared inside
// components/OfficeEstablishmentView.tsx (line 19) and imported from there by
// AdminEstablishmentView.tsx:4 and OfficeReportView.tsx:13 — so a 9-line
// function dragged a 2617-line component into two sibling import graphs.
// Behaviour and signature are unchanged; only the location moved.
// ============================================================================

/** Combined resolution (ઠરાવ નં. અને તારીખ) formatter for Cancelled/Abeyance posts. */
export const formatTharavDetail = (
  row?: { resolutionNote?: string; orderNo?: string; orderDate?: string } | null,
): string => {
  if (!row) return NOT_RECORDED;
  // '-' is the not-recorded sentinel this app stores in place of a value
  // (establishmentApi assigns resolution_note straight from the DB). A sentinel
  // is truthy, so testing the raw string let it win over the real order number
  // and the official order number was silently dropped from the register.
  // Case is preserved here — normalizeText() lowercases, which is right for
  // search keys and wrong for a printed order number.
  const present = (v?: string) => {
    const t = (v ?? '').trim();
    return t && t !== '-' ? t : '';
  };
  const note = present(row.resolutionNote);
  if (note) {
    const stripped = note.replace(/^ઠરાવ નં\.\s*/, '').trim();
    if (stripped) return stripped;
  }
  const orderNo = present(row.orderNo);
  if (orderNo) {
    const d = row.orderDate ? `, તા. ${formatDateDDMMYYYY(row.orderDate)}` : '';
    return `${orderNo}${d}`;
  }
  return NOT_RECORDED;
};

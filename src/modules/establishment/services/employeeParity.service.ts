/**
 * Employee-register parity (drift) report.
 *
 * READ-ONLY. Compares the two core registers (establishment / payroll)
 * using today's columns and reports divergence.
 * GTR-30 and GTR-44 are standalone treasury modules and are not coupled here.
 *
 * Loader functions are injected (no runtime cross-module imports) so the
 * builder is fully testable and wiring can happen wherever the UI needs it.
 */
import type { EstablishmentEmployee } from '../types';
import type { Database } from '@/shared/database.types';
import {
  normalizeHrpn,
  normalizePan,
  normalizeName,
  identityKey,
  type IdentityMatch,
} from '@/shared/domain/employeeIdentity';

type PayrollEmployeeRow = Database['public']['Tables']['employees']['Row'];

/** Minimal person shape every source is adapted to before comparison. */
export interface ParityPersonInput {
  hrpn: string | null;
  pan: string | null;
  name: string;
  designation: string | null;
  payScale: string | null;
}

export type ParitySource = 'establishment' | 'payroll';

export interface FieldMismatch {
  field: 'name' | 'designation' | 'payScale';
  establishment?: string | null;
  payroll?: string | null;
}

export interface PersonParity {
  key: string;
  matchBy: IdentityMatch | 'unknown';
  canonicalName: string;
  hrpn: string | null;
  pan: string | null;
  present: Record<ParitySource, boolean>;
  mismatches: FieldMismatch[];
}

export interface ParitySummary {
  totalCanonical: number;
  inBoth: number;
  onlyEstablishment: number;
  onlyPayroll: number;
  missingFromEstablishment: number;
  missingFromPayroll: number;
  mismatchCount: number;
  unkeyedRows: number;
}

export interface ParityReport {
  people: PersonParity[];
  summary: ParitySummary;
  sources: Record<ParitySource, 'ok' | 'unavailable'>;
  generatedAt: string;
}

export interface ParityLoaders {
  listEstablishment: () => Promise<EstablishmentEmployee[] | null>;
  listPayroll: () => Promise<PayrollEmployeeRow[]>;
}

export function adaptEstablishment(e: EstablishmentEmployee): ParityPersonInput {
  return {
    hrpn: normalizeHrpn(e.hrpnNo),
    pan: normalizePan(e.pan),
    name: e.name || '',
    designation: e.designation?.trim() || null,
    payScale: e.payScale?.trim() || null,
  };
}

export function adaptPayroll(e: PayrollEmployeeRow): ParityPersonInput {
  return {
    hrpn: normalizeHrpn((e as { hprn_no?: unknown }).hprn_no),
    pan: normalizePan(e.pan),
    name: e.name || '',
    designation: (e.designation || '').trim() || null,
    payScale: (e.pay_scale || '').trim() || null,
  };
}

interface Bucket {
  key: string;
  hrpn: string | null;
  pan: string | null;
  canonicalName: string;
  values: Record<ParitySource, ParityPersonInput | null>;
}

function findBucket(buckets: Map<string, Bucket>, input: ParityPersonInput): Bucket | null {
  if (input.hrpn && buckets.has(`H:${input.hrpn}`)) return buckets.get(`H:${input.hrpn}`)!;
  if (input.pan) {
    for (const b of buckets.values()) {
      if (b.pan && b.pan === input.pan) return b;
    }
  }
  const nameKey = normalizeName(input.name);
  if (nameKey) {
    const key = `N:${nameKey}`;
    if (buckets.has(key)) return buckets.get(key)!;
  }
  return null;
}

function mergeInto(bucket: Bucket, source: ParitySource, input: ParityPersonInput): void {
  if (!bucket.values[source]) bucket.values[source] = input;
  if (!bucket.hrpn && input.hrpn) {
    bucket.hrpn = input.hrpn;
    bucket.key = `H:${input.hrpn}`;
  }
  if (!bucket.pan && input.pan) bucket.pan = input.pan;
  if ((!bucket.canonicalName || bucket.canonicalName === 'Unknown') && input.name.trim()) {
    bucket.canonicalName = input.name.trim();
  }
}

function differ(a: string | null | undefined, b: string | null | undefined, isName: boolean): boolean {
  const left = isName ? normalizeName(a || '') : (a || '').trim().toLowerCase();
  const right = isName ? normalizeName(b || '') : (b || '').trim().toLowerCase();
  if (!left || !right) return false; // missing data is not a mismatch
  return left !== right;
}

function buildMismatches(bucket: Bucket): FieldMismatch[] {
  const out: FieldMismatch[] = [];
  const fields: Array<'name' | 'designation' | 'payScale'> = ['name', 'designation', 'payScale'];
  for (const field of fields) {
    const isName = field === 'name';
    const estVal = bucket.values.establishment?.[field] ?? null;
    const payVal = bucket.values.payroll?.[field] ?? null;
    if (estVal && payVal && differ(estVal, payVal, isName)) {
      out.push({
        field,
        establishment: estVal,
        payroll: payVal,
      });
    }
  }
  return out;
}

/**
 * Pure builder: merge establishment and payroll sources into canonical persons + drift report.
 */
export function buildParityReport(
  establishment: ParityPersonInput[],
  payroll: ParityPersonInput[],
  sources?: ParityReport['sources']
): ParityReport {
  const buckets = new Map<string, Bucket>();
  let unkeyedRows = 0;

  const ingest = (source: ParitySource, input: ParityPersonInput): void => {
    if (!input.hrpn && !input.pan && !normalizeName(input.name)) {
      unkeyedRows += 1;
      return;
    }
    const existing = findBucket(buckets, input);
    if (existing) {
      const oldKey = existing.key;
      mergeInto(existing, source, input);
      if (existing.key !== oldKey) {
        buckets.delete(oldKey);
        buckets.set(existing.key, existing);
      }
      return;
    }
    const key = identityKey(input.hrpn, input.pan, input.name);
    const bucket: Bucket = {
      key,
      hrpn: input.hrpn,
      pan: input.pan,
      canonicalName: input.name.trim() || 'Unknown',
      values: { establishment: null, payroll: null },
    };
    mergeInto(bucket, source, input);
    buckets.set(bucket.key, bucket);
  };

  for (const e of establishment) ingest('establishment', e);
  for (const p of payroll) ingest('payroll', p);

  const people: PersonParity[] = [...buckets.values()].map((b) => ({
    key: b.key,
    matchBy:
      b.key === 'N:'
        ? 'unknown'
        : b.hrpn
          ? 'hrpn'
          : b.pan
            ? 'pan'
            : 'name',
    canonicalName: b.canonicalName,
    hrpn: b.hrpn,
    pan: b.pan,
    present: {
      establishment: !!b.values.establishment,
      payroll: !!b.values.payroll,
    },
    mismatches: buildMismatches(b),
  }));

  people.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));

  const summary: ParitySummary = {
    totalCanonical: people.length,
    inBoth: 0,
    onlyEstablishment: 0,
    onlyPayroll: 0,
    missingFromEstablishment: 0,
    missingFromPayroll: 0,
    mismatchCount: 0,
    unkeyedRows,
  };

  for (const p of people) {
    const { establishment: e, payroll: pl } = p.present;
    if (e && pl) summary.inBoth += 1;
    if (e && !pl) summary.onlyEstablishment += 1;
    if (!e && pl) summary.onlyPayroll += 1;
    if (!e) summary.missingFromEstablishment += 1;
    if (!pl) summary.missingFromPayroll += 1;
    if (p.mismatches.length > 0) summary.mismatchCount += 1;
  }

  return {
    people,
    summary,
    sources: sources || { establishment: 'ok', payroll: 'ok' },
    generatedAt: new Date().toISOString(),
  };
}

/** Live wiring: fetch establishment and payroll sources (never throws — marks unavailable). */
export async function fetchParityReport(loaders: ParityLoaders): Promise<ParityReport> {
  const sources: ParityReport['sources'] = { establishment: 'ok', payroll: 'ok' };

  let est: EstablishmentEmployee[] = [];
  try {
    est = (await loaders.listEstablishment()) || [];
  } catch {
    sources.establishment = 'unavailable';
  }

  let pay: PayrollEmployeeRow[] = [];
  try {
    pay = await loaders.listPayroll();
  } catch {
    sources.payroll = 'unavailable';
  }

  return buildParityReport(
    est.map(adaptEstablishment),
    pay.map(adaptPayroll),
    sources
  );
}

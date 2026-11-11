import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';

export type FakeRow = Record<string, unknown>;

export interface FakeFailure {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';
  error: { code?: string; message: string };
}

export interface FakeOp {
  table: string;
  op: FakeFailure['op'];
  filters: Array<{ column: string; operator: string; value: unknown }>;
  payload?: FakeRow | FakeRow[];
}

type Predicate = (row: FakeRow) => boolean;
type TerminalResult = { data: FakeRow[] | FakeRow | null; error: { code?: string; message: string } | null; count?: number };

function jsonUnescape(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === '\\' || next === '"') {
        out += next;
        i++;
        continue;
      }
      if (next === 'n') {
        out += '\n';
        i++;
        continue;
      }
      if (next === 't') {
        out += '\t';
        i++;
        continue;
      }
    }
    out += value[i];
  }
  return out;
}

function parseOrValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return jsonUnescape(value.slice(1, -1));
  }
  return value;
}

function splitOrExpression(expression: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let depth = 0;
  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    if (ch === '"' && expression[i - 1] !== '\\') inQuotes = !inQuotes;
    if (!inQuotes && ch === '(') depth++;
    if (!inQuotes && ch === ')') depth--;
    if (!inQuotes && depth === 0 && ch === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

function likeToRegExp(pattern: string): RegExp {
  let regex = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\' && i + 1 < pattern.length) {
      regex += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
      continue;
    }
    if (ch === '%') {
      regex += '.*';
      continue;
    }
    if (ch === '_') {
      regex += '.';
      continue;
    }
    regex += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${regex}$`, 'i');
}

function matchSegment(row: FakeRow, segment: string): boolean {
  const unquotedMatch = segment.match(/^([^.]+)\.(eq|neq|ilike|like|in|gte|lte)\.(.*)$/);
  if (!unquotedMatch) return false;
  const [, column, operator, rawValue] = unquotedMatch;
  const rowValue = row[column];

  switch (operator) {
    case 'eq':
      return String(rowValue ?? '') === parseOrValue(rawValue);
    case 'neq':
      return String(rowValue ?? '') !== parseOrValue(rawValue);
    case 'in': {
      const list = parseOrValue(rawValue).replace(/^\(/, '').replace(/\)$/, '');
      const values = splitOrExpression(list).map((v) => parseOrValue(v));
      return values.includes(String(rowValue ?? ''));
    }
    case 'ilike':
    case 'like':
      return typeof rowValue === 'string' && likeToRegExp(parseOrValue(rawValue)).test(rowValue);
    case 'gte':
      return String(rowValue ?? '') >= parseOrValue(rawValue);
    case 'lte':
      return String(rowValue ?? '') <= parseOrValue(rawValue);
    default:
      return false;
  }
}

export class FakeQueryBuilder implements PromiseLike<TerminalResult> {
  private predicates: Predicate[] = [];
  private filterLog: Array<{ column: string; operator: string; value: unknown }> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private limitCount: number | null = null;
  private countOption: string | null = null;
  private singleMode: 'single' | 'maybe' | null = null;

  constructor(
    private readonly db: FakeSupabaseClient,
    private readonly table: string,
    private readonly op: FakeFailure['op'],
    private readonly payload?: FakeRow | FakeRow[]
  ) {}

  select(_columns?: string, options?: { count?: string }): this {
    if (options?.count) this.countOption = options.count;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.predicates.push((row) => String(row[column] ?? '') === String(value ?? ''));
    this.filterLog.push({ column, operator: 'eq', value });
    return this;
  }

  or(expression: string): this {
    const segments = splitOrExpression(expression);
    this.predicates.push((row) => segments.some((segment) => matchSegment(row, segment)));
    this.filterLog.push({ column: 'or', operator: 'or', value: expression });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.predicates.push((row) => String(row[column] ?? '') >= String(value ?? ''));
    this.filterLog.push({ column, operator: 'gte', value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.predicates.push((row) => String(row[column] ?? '') <= String(value ?? ''));
    this.filterLog.push({ column, operator: 'lte', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  range(from: number, to: number): this {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle(): this {
    this.singleMode = 'maybe';
    return this;
  }

  then<TResult1 = TerminalResult, TResult2 = never>(
    onfulfilled?: ((value: TerminalResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private async execute(): Promise<TerminalResult> {
    const failure = this.db.consumeFailure(this.table, this.op);
    if (failure) {
      return { data: null, error: failure.error };
    }

    this.db.ops.push({
      table: this.table,
      op: this.op,
      filters: this.filterLog,
      payload: this.payload,
    });

    let rows = [...this.db.getTable(this.table)];

    if (this.op === 'insert' || this.op === 'upsert') {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const inserted: FakeRow[] = [];
      for (const item of incoming) {
        const row = { ...item };
        if (!row.id) {
          row.id =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `fake-${Date.now()}-${Math.random()}`;
        }
        if (this.op === 'upsert') {
          const existingIndex = rows.findIndex((r) => r.id === row.id);
          if (existingIndex >= 0) {
            rows[existingIndex] = { ...rows[existingIndex], ...row };
            inserted.push(rows[existingIndex]);
            continue;
          }
        }
        const duplicate = rows.find(
          (r) => this.table === 'gr_repository' && r.gr_number === row.gr_number
        );
        if (duplicate) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          };
        }
        rows.push(row);
        inserted.push(row);
      }
      this.db.setTable(this.table, rows);
      return this.wrapResult(inserted);
    }

    const matched = rows.filter((row) => this.predicates.every((p) => p(row)));

    if (this.op === 'select') {
      return this.wrapResult(this.applyOrderingAndRange(matched), matched.length);
    }

    if (this.op === 'update') {
      const patch = Array.isArray(this.payload) ? this.payload[0] : this.payload ?? {};
      const updated: FakeRow[] = [];
      rows = rows.map((row) => {
        if (this.predicates.every((p) => p(row))) {
          const next = { ...row, ...patch };
          updated.push(next);
          return next;
        }
        return row;
      });
      this.db.setTable(this.table, rows);
      return this.wrapResult(updated);
    }

    if (this.op === 'delete') {
      this.db.setTable(
        this.table,
        rows.filter((row) => !this.predicates.every((p) => p(row)))
      );
      return this.wrapResult(matched);
    }

    return { data: null, error: null };
  }

  private applyOrderingAndRange(rows: FakeRow[]): FakeRow[] {
    let result = rows;
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result = [...result].sort((a, b) => {
        const av = String(a[column] ?? '');
        const bv = String(b[column] ?? '');
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
      });
    }
    if (this.rangeStart !== null && this.rangeEnd !== null) {
      result = result.slice(this.rangeStart, this.rangeEnd + 1);
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }

  private wrapResult(rows: FakeRow[], totalCount?: number): TerminalResult {
    const count = this.countOption ? totalCount ?? rows.length : undefined;
    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
          },
        };
      }
      return { data: rows[0], error: null, count };
    }
    if (this.singleMode === 'maybe') {
      return { data: rows[0] ?? null, error: null, count };
    }
    return { data: rows, error: null, count };
  }
}

export class FakeSupabaseClient {
  private tables = new Map<string, FakeRow[]>();
  private failures: FakeFailure[] = [];
  ops: FakeOp[] = [];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  getTable(table: string): FakeRow[] {
    return this.tables.get(table) ?? [];
  }

  setTable(table: string, rows: FakeRow[]): void {
    this.tables.set(table, rows);
  }

  seed(table: string, rows: FakeRow[]): void {
    this.setTable(table, rows.map((row) => ({ ...row })));
  }

  failNext(table: string, op: FakeFailure['op'], error: { code?: string; message: string }): void {
    this.failures.push({ table, op, error });
  }

  consumeFailure(table: string, op: FakeFailure['op']) {
    const index = this.failures.findIndex((f) => f.table === table && f.op === op);
    if (index === -1) return null;
    const [failure] = this.failures.splice(index, 1);
    return failure;
  }

  from(table: string) {
    return {
      select: (columns?: string, options?: { count?: string }) =>
        new FakeQueryBuilder(this, table, 'select').select(columns, options),
      insert: (payload: FakeRow | FakeRow[]) => new FakeQueryBuilder(this, table, 'insert', payload),
      update: (payload: FakeRow) => new FakeQueryBuilder(this, table, 'update', payload),
      upsert: (payload: FakeRow | FakeRow[]) =>
        new FakeQueryBuilder(this, table, 'upsert', payload),
      delete: () => new FakeQueryBuilder(this, table, 'delete'),
    };
  }

  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: null; error: { code?: string; message: string } | null }> {
    const failure = this.consumeFailure('rpc', 'rpc');
    this.rpcCalls.push({ name, args: args ?? {} });
    return Promise.resolve({
      data: null,
      error: failure ? failure.error : null,
    });
  }

  asSupabaseClient(): SupabaseClient<Database> {
    return this as unknown as SupabaseClient<Database>;
  }
}

export function createFakeSupabaseClient(): FakeSupabaseClient {
  return new FakeSupabaseClient();
}

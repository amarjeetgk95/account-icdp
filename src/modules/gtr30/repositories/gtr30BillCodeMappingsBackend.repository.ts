import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30BillCodeMapping } from '../types';
import { gtr30BillCodeMappingsSchema } from '../validation/gtr30BillCodeMappings.schema';
import { isLegacyBillCode } from '../constants/billCodes';

function validateMappingsArray(raw: unknown): GTR30BillCodeMapping[] | null {
  const result = gtr30BillCodeMappingsSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30BillCodeMappingsBackend] validation failed:', result.error.flatten());
    return null;
  }
  return result.data;
}

class Gtr30BillCodeMappingsBackendRepository {
  async list(): Promise<GTR30BillCodeMapping[] | null> {
    try {
      const { data, error } = await supabase
        .from('gtr30_bill_code_mappings')
        .select('*');

      if (error) {
        console.warn('[GTR30Backend] list mappings failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      const formatted = data.map((r: Record<string, unknown>) => {
        const payload = (r.payload as Record<string, unknown>) || {};
        // Guard against payload overwriting reserved keys (e.g. legacy rows
        // with payload: {billCode:"HACK"}). Strip reserved keys before spread.
        const { id: _pid, billCode: _pbc, bill_code: _pbc2, description: _pdesc, ...safePayload } = payload as Record<string, unknown>;
        void _pid; void _pbc; void _pbc2; void _pdesc;
        return {
          id: String(r.id),
          billCode: String(r.bill_code || ''),
          description: String(r.description || ''),
          ...safePayload,
        };
      });

      const validated = validateMappingsArray(formatted);
      const rows = validated ?? (formatted as unknown as GTR30BillCodeMapping[]);
      // Legacy dummy codes must never surface from the backend (they can be
      // re-persisted by stale clients, so filter defensively at read time).
      return rows.filter((m) => !isLegacyBillCode(m.billCode));
    } catch (err) {
      console.warn('[GTR30BillCodeMappingsBackend] list error:', err);
      return [];
    }
  }

  async replaceAll(
    mappings: GTR30BillCodeMapping[]
  ): Promise<GTR30BillCodeMapping[] | null> {
    try {
      // Defensive: never persist legacy dummies — they are filtered at read
      // and must not be written back even if a stale client holds them.
      const sanitized = mappings.filter((m) => !isLegacyBillCode(m.billCode));
      const incomingIds = new Set(sanitized.map((m) => m.id).filter(Boolean));

      // Prefer atomic RPC when available (single transaction: DELETE + INSERT).
      // Falls back to diff-delete + per-row upsert if RPC not deployed.
      try {
        const { data, error } = await supabase.rpc('upsert_gtr30_bill_code_mappings' as never, {
          p_mappings: sanitized.map((m) => {
            const { id, billCode, description, ...payload } = m;
            return { id: id || crypto.randomUUID(), billCode: billCode || '', description: description || '', ...payload };
          }) as unknown as Json,
        } as never);
        if (!error) {
          // RPC returns json array; bypass list() to avoid extra round-trip if possible
          if (Array.isArray(data)) {
            const formatted = (data as unknown as Record<string, unknown>[]).map((r) => ({
              id: String(r.id ?? r['id']),
              billCode: String((r as Record<string, unknown>).billCode ?? (r as Record<string, unknown>).bill_code ?? ''),
              description: String((r as Record<string, unknown>).description ?? ''),
              ...(((r as Record<string, unknown>).payload as Record<string, unknown>) || {}),
            }));
            const validated = validateMappingsArray(formatted);
            const rows = validated ?? (formatted as unknown as GTR30BillCodeMapping[]);
            return rows.filter((m) => !isLegacyBillCode(m.billCode));
          }
          return this.list();
        }
        console.warn('[GTR30Backend] RPC upsert_gtr30_bill_code_mappings failed, falling back to per-row:', error);
      } catch (rpcErr) {
        console.warn('[GTR30Backend] RPC not available, fallback:', rpcErr);
      }

      // Fallback: diff-delete + per-row upsert (non-atomic). Upsert first,
      // then delete stale ids to minimize window where table is partially empty.
      for (const m of sanitized) {
        const { id, billCode, description, ...payload } = m;
        const { error: upsertErr } = await supabase.from('gtr30_bill_code_mappings').upsert({
          id: id || crypto.randomUUID(),
          bill_code: billCode || '',
          description: description || '',
          payload: payload as unknown as Json,
          updated_at: new Date().toISOString(),
        });
        if (upsertErr) {
          // UNIQUE(bill_code) violation — surface clearly for UI duplicate check
          if ((upsertErr as { code?: string }).code === '23505') {
            throw new Error(`Bill code "${billCode}" already exists`);
          }
          throw upsertErr;
        }
      }

      const { data: existing } = await supabase.from('gtr30_bill_code_mappings').select('id');
      const toDelete = (existing || [])
        .map((e: { id: string }) => String(e.id))
        .filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('gtr30_bill_code_mappings').delete().in('id', toDelete);
        if (delErr) throw delErr;
      }

      return this.list();
    } catch (err) {
      console.error('[GTR30BillCodeMappingsBackend] replaceAll error:', err);
      throw err;
    }
  }
}

export const gtr30BillCodeMappingsBackendRepository = new Gtr30BillCodeMappingsBackendRepository();

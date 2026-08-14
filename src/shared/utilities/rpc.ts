import type { Json } from '@/shared/json.types';

export function rpcArray<T>(data: Json | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as unknown as T[];
  return [];
}

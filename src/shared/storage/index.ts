/**
 * Shared safe-storage module.
 *
 * - `localStorage.ts`: SSR-safe helpers that swallow + log quota/parse/serialization
 *   errors so callers never need their own try/catch.
 * - `keys.ts`: `STORAGE_KEYS`, the canonical registry of every browser storage key
 *   known to the app (see the P0-4 inventory for the mirror/Postgres mapping).
 */
export {
  safeGetRaw,
  safeGetJSON,
  safeSetRaw,
  safeSetJSON,
  safeRemove,
  safeHas,
  safeListKeys,
  type SafeStorageLike,
} from './localStorage';

export { STORAGE_KEYS, type StorageKey } from './keys';

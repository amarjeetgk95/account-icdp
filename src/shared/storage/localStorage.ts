/**
 * Safe localStorage helpers.
 *
 * Drop-in replacements for the ad-hoc `try { JSON.parse(localStorage.getItem(k)) } catch {}`
 * blocks scattered across the codebase. Every helper here:
 *
 * - is SSR-safe (no-ops / fallbacks when `localStorage` is unavailable or throws,
 *   e.g. server render, sandboxed iframes, "disable all cookies" browsers);
 * - swallows + logs (console.warn) quota, serialization and parse errors instead of
 *   crashing the caller — callers get a deterministic fallback;
 * - never throws, so call sites can drop their own try/catch.
 *
 * These helpers do NOT change JSON shape, key names or fallback semantics: migrating a
 * call site is a mechanical swap of `JSON.parse(localStorage.getItem(k))` for
 * `safeGetJSON(k, fallback)` with the same `fallback` the old catch-block returned.
 */

/** Minimal key/value surface used by the safe helpers. */
export interface SafeStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function ambientStorage(): SafeStorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    // Accessing window.localStorage itself can throw (disabled storage, sandboxed frame).
    return null;
  }
}

const LOG_TAG = '[safe-storage]';

function warn(operation: string, key: string, err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err);
  console.warn(`${LOG_TAG} ${operation} failed for key "${key}": ${detail}`);
}

/**
 * Read a raw string value.
 * Returns `null` when the key is missing, the storage is unavailable, or the read throws.
 */
export function safeGetRaw(key: string): string | null {
  const storage = ambientStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (err) {
    warn('read', key, err);
    return null;
  }
}

/**
 * Read and JSON-parse a value.
 * Returns `fallback` when the key is missing, the storage is unavailable, the read
 * throws, or the stored value is not valid JSON (a warning is logged in the throwing cases).
 *
 * Note: a stored literal `null` parses to `null` — pass a non-null fallback if you need to
 * distinguish "stored null" from "missing/corrupt".
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  const storage = ambientStorage();
  if (!storage) return fallback;
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch (err) {
    warn('read', key, err);
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    warn('parse', key, err);
    return fallback;
  }
}

/**
 * Write a raw string value.
 * Returns `true` on success, `false` when storage is unavailable or the write throws
 * (quota exceeded, storage disabled). Never throws.
 */
export function safeSetRaw(key: string, value: string): boolean {
  const storage = ambientStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (err) {
    warn('write', key, err);
    return false;
  }
}

/**
 * JSON-stringify and write a value.
 * Returns `true` on success, `false` when the value is not serializable, storage is
 * unavailable, or the write throws. Never throws.
 */
export function safeSetJSON(key: string, value: unknown): boolean {
  const storage = ambientStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    // Covers QuotaExceededError (setItem) and TypeError (circular / BigInt values).
    warn('write', key, err);
    return false;
  }
}

/**
 * Remove a key.
 * Returns `true` on success (or when storage is unavailable — nothing to remove),
 * `false` when the removal throws. Never throws.
 */
export function safeRemove(key: string): boolean {
  const storage = ambientStorage();
  if (!storage) return true;
  try {
    storage.removeItem(key);
    return true;
  } catch (err) {
    warn('remove', key, err);
    return false;
  }
}

/** True when the key exists. Does not parse the value (corrupt payloads count as present). */
export function safeHas(key: string): boolean {
  return safeGetRaw(key) !== null;
}

/**
 * List keys, optionally filtered by prefix.
 * Keys are snapshotted before filtering so callers may safely mutate storage while
 * iterating the result. Returns `[]` when storage is unavailable or listing throws.
 */
export function safeListKeys(prefix = ''): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const snapshot: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null) snapshot.push(key);
    }
    return prefix ? snapshot.filter((key) => key.startsWith(prefix)) : snapshot;
  } catch (err) {
    warn('list', prefix ? `${prefix}*` : '*', err);
    return [];
  }
}

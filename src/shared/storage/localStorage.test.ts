import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  safeGetRaw,
  safeGetJSON,
  safeSetRaw,
  safeSetJSON,
  safeRemove,
  safeHas,
  safeListKeys,
} from './localStorage';

describe('safe localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('safeGetRaw', () => {
    it('returns null for a missing key', () => {
      expect(safeGetRaw('nope')).toBeNull();
    });

    it('returns the raw string for a present key', () => {
      localStorage.setItem('k', 'plain-value');
      expect(safeGetRaw('k')).toBe('plain-value');
    });

    it('returns null and logs when storage throws', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      expect(safeGetRaw('k')).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('safeGetJSON', () => {
    it('returns the fallback for a missing key', () => {
      expect(safeGetJSON('missing', { a: 1 })).toEqual({ a: 1 });
      expect(safeGetJSON('missing', null)).toBeNull();
      expect(safeGetJSON('missing', 42)).toBe(42);
    });

    it('round-trips objects, arrays, strings and numbers', () => {
      localStorage.setItem('obj', JSON.stringify({ b: 'x', n: 3 }));
      expect(safeGetJSON('obj', null)).toEqual({ b: 'x', n: 3 });
      localStorage.setItem('arr', '[1,2,3]');
      expect(safeGetJSON('arr', [])).toEqual([1, 2, 3]);
      localStorage.setItem('str', '"quoted"');
      expect(safeGetJSON('str', '')).toBe('quoted');
      localStorage.setItem('num', '123');
      expect(safeGetJSON('num', 0)).toBe(123);
    });

    it('returns stored literal null (parses fine, not the fallback)', () => {
      localStorage.setItem('nullish', 'null');
      expect(safeGetJSON<string | null>('nullish', 'fallback')).toBeNull();
    });

    it('returns the fallback and logs on corrupt JSON ({not json)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      localStorage.setItem('gtr30-settings-v1', '{not json');
      expect(safeGetJSON('gtr30-settings-v1', null)).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('returns the fallback and logs when the read itself throws', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      expect(safeGetJSON('k', 'fb')).toBe('fb');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('does not throw on stored falsy primitives', () => {
      localStorage.setItem('zero', '0');
      expect(safeGetJSON('zero', 99)).toBe(0);
      localStorage.setItem('false', 'false');
      expect(safeGetJSON('false', true)).toBe(false);
    });
  });

  describe('safeSetRaw', () => {
    it('writes the value verbatim and returns true', () => {
      expect(safeSetRaw('k', 'raw\nvalue')).toBe(true);
      expect(localStorage.getItem('k')).toBe('raw\nvalue');
    });

    it('returns false and logs when the write throws (quota)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      expect(safeSetRaw('k', 'v')).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('safeSetJSON', () => {
    it('stores JSON.stringify output readable by safeGetJSON', () => {
      expect(safeSetJSON('payload', { a: [1, 'two', null] })).toBe(true);
      expect(localStorage.getItem('payload')).toBe('{"a":[1,"two",null]}');
      expect(safeGetJSON('payload', null)).toEqual({ a: [1, 'two', null] });
    });

    it('returns false and logs when serialization throws (circular structure)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(safeSetJSON('circular', circular)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('circular')).toBeNull();
    });

    it('returns false and logs on quota errors', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      expect(safeSetJSON('k', { a: 1 })).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('safeRemove', () => {
    it('removes an existing key and returns true', () => {
      localStorage.setItem('k', 'v');
      expect(safeRemove('k')).toBe(true);
      expect(localStorage.getItem('k')).toBeNull();
    });

    it('returns true for a missing key (nothing to remove)', () => {
      expect(safeRemove('missing')).toBe(true);
    });

    it('returns false and logs when storage throws', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      expect(safeRemove('k')).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('safeHas', () => {
    it('is false for a missing key and true for a present one', () => {
      expect(safeHas('missing')).toBe(false);
      localStorage.setItem('present', 'v');
      expect(safeHas('present')).toBe(true);
    });

    it('counts corrupt payloads as present (does not parse)', () => {
      localStorage.setItem('corrupt', '{not json');
      expect(safeHas('corrupt')).toBe(true);
    });
  });

  describe('safeListKeys', () => {
    it('returns [] when storage is empty', () => {
      expect(safeListKeys()).toEqual([]);
    });

    it('returns every key when no prefix is given', () => {
      localStorage.setItem('a', '1');
      localStorage.setItem('b', '2');
      expect(safeListKeys().sort()).toEqual(['a', 'b']);
    });

    it('filters by prefix', () => {
      localStorage.setItem('form16_cert_v1_1_2026_a', '1');
      localStorage.setItem('form16_cert_v1_1_2026_b', '2');
      localStorage.setItem('gtr30-settings-v1', '3');
      expect(safeListKeys('form16_cert_v1').sort()).toEqual([
        'form16_cert_v1_1_2026_a',
        'form16_cert_v1_1_2026_b',
      ]);
      expect(safeListKeys('nomatch')).toEqual([]);
    });
  });
});

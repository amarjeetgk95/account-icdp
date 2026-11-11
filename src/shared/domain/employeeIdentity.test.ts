import { describe, it, expect } from 'vitest';
import { normalizeHrpn, normalizePan, normalizeName, identityKey, matchTierForKey } from './employeeIdentity';

describe('normalizeHrpn', () => {
  it('upper-cases and trims real HRPNs', () => {
    expect(normalizeHrpn(' 20014113 ')).toBe('20014113');
    expect(normalizeHrpn('hrpn-42')).toBe('HRPN-42');
  });

  it('rejects placeholder junk seen in imports', () => {
    for (const junk of ['', '0', '-', 'NA', 'n/a', 'null', 'none', 'nil', null, undefined, 42]) {
      expect(normalizeHrpn(junk)).toBeNull();
    }
  });
});

describe('normalizePan / normalizeName', () => {
  it('upper-cases PANs and nulls blanks', () => {
    expect(normalizePan('abcde1234f')).toBe('ABCDE1234F');
    expect(normalizePan('  ')).toBeNull();
    expect(normalizePan(null)).toBeNull();
  });

  it('collapses name whitespace for comparison', () => {
    expect(normalizeName('  Ramesh   Patel ')).toBe('ramesh patel');
    expect(normalizeName(null)).toBe('');
  });
});

describe('identityKey', () => {
  it('prefers HRPN over PAN over name', () => {
    expect(identityKey('H1', 'P1', 'Name')).toBe('H:H1');
    expect(identityKey(null, 'P1', 'Name')).toBe('P:P1');
    expect(identityKey(null, null, 'Name')).toBe('N:name');
    expect(identityKey(null, null, '')).toBe('N:');
  });

  it('reports the backing tier', () => {
    expect(matchTierForKey('H:X')).toBe('hrpn');
    expect(matchTierForKey('P:X')).toBe('pan');
    expect(matchTierForKey('N:x')).toBe('name');
    expect(matchTierForKey('N:')).toBe('unknown');
  });
});

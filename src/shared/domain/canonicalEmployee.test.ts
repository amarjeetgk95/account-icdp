import { describe, it, expect } from 'vitest';
import {
  buildLegacyBridge,
  resolveLegacyId,
  isUnlinkedId,
  toCanonicalHrpn,
  UNLINKED_ID_PREFIX,
} from './canonicalEmployee';

describe('buildLegacyBridge / resolveLegacyId', () => {
  const bridge = buildLegacyBridge([
    { id: 'legacy-1', hprn_no: '20013826', pan: 'AGHPC4157B' },
    { id: 'legacy-2', hprn_no: ' 20105536\r\n', pan: 'dfhpk0914q' },
    { id: 'legacy-3', hprn_no: null, pan: 'AKPPS2419E' },
    { id: 'legacy-dup', hprn_no: '20013826', pan: 'ZZZZZ9999Z' },
  ]);

  it('indexes by canonical HRPN (trimmed, upper-cased, CRLF-tolerant)', () => {
    expect(bridge.byHrpn.get('20013826')).toBe('legacy-1');
    expect(bridge.byHrpn.get('20105536')).toBe('legacy-2');
  });

  it('first row wins on duplicate HRPN', () => {
    expect(bridge.byHrpn.get('20013826')).toBe('legacy-1');
  });

  it('indexes usable PANs upper-cased', () => {
    expect(bridge.byPan.get('AGHPC4157B')).toBe('legacy-1');
    expect(bridge.byPan.get('DFHPK0914Q')).toBe('legacy-2');
  });

  it('prefers HRPN over PAN', () => {
    // HRPN points at legacy-1 even though the PAN belongs to legacy-dup.
    expect(resolveLegacyId('20013826', 'ZZZZZ9999Z', bridge)).toBe('legacy-1');
  });

  it('falls back to PAN when HRPN is missing/placeholder', () => {
    expect(resolveLegacyId(null, 'AKPPS2419E', bridge)).toBe('legacy-3');
    expect(resolveLegacyId('N/A', 'akpps2419e', bridge)).toBe('legacy-3');
    expect(resolveLegacyId('', 'AKPPS2419E', bridge)).toBe('legacy-3');
  });

  it('returns null when neither key matches', () => {
    expect(resolveLegacyId('99999999', 'BBBBB1111B', bridge)).toBeNull();
    expect(resolveLegacyId(null, null, bridge)).toBeNull();
  });

  it('flags unlinked sentinel ids', () => {
    expect(isUnlinkedId(`${UNLINKED_ID_PREFIX}abc`)).toBe(true);
    expect(isUnlinkedId('legacy-1')).toBe(false);
    expect(toCanonicalHrpn(' 20105536\r\n')).toBe('20105536');
  });
});

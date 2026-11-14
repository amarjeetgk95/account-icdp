import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from './keys';

describe('STORAGE_KEYS registry', () => {
  it('has no empty or whitespace-only values', () => {
    for (const [name, value] of Object.entries(STORAGE_KEYS)) {
      expect(value.trim().length, `STORAGE_KEYS.${name} must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate values (each constant maps to a distinct key/prefix)', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('keeps historical key strings stable (rename = data loss, not a refactor)', () => {
    // Spot-checks of load-bearing legacy names. If a value here must change,
    // it requires a data-migration plan, not an edit to this registry.
    expect(STORAGE_KEYS.GTR30_SETTINGS_V1).toBe('gtr30-settings-v1');
    expect(STORAGE_KEYS.GTR30_EMPLOYEE_MASTER_GROUPS).toBe('gtr30-employee-master-v3-groups-all');
    expect(STORAGE_KEYS.GTR30_EMPLOYEE_MASTER_GROUPS_LEGACY).toBe('gtr30-employee-master-v3-groups');
    expect(STORAGE_KEYS.GTR30_BILL_CODE_MAPPINGS).toBe('gtr30-employee-master-v3-mappings-all');
    expect(STORAGE_KEYS.GTR30_BUDGET_HEADS).toBe('gtr30-budget-heads-v1-all');
    expect(STORAGE_KEYS.ESTABLISHMENT_V1).toBe('establishment-v1-all');
    expect(STORAGE_KEYS.GTR44_SETTINGS_V1).toBe('gtr44-settings-v1');
    expect(STORAGE_KEYS.ICDP_UI_STORE).toBe('icdp-ui-store');
  });
});

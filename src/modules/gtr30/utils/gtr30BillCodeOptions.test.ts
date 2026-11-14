import { describe, expect, it } from 'vitest';
import { buildGtr30BillCodeOptions, mergeGtr30BillCodeMappings } from './gtr30BillCodeOptions';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import type { GTR30BillCodeMapping, GTR30EmployeeMaster } from '../types';

function emp(id: string, billCode?: string): GTR30EmployeeMaster {
  return { id, srNo: 1, name: `Emp ${id}`, billCode } as GTR30EmployeeMaster;
}

describe('mergeGtr30BillCodeMappings', () => {
  it('keeps configured mappings and drops legacy dummy codes from mappings and groups', () => {
    const configured: GTR30BillCodeMapping[] = [
      { id: 'm1', billCode: 'GTR-30-GO-STATS', description: 'GO Stats' },
      { id: 'm2', billCode: 'GTR30-SAL', description: 'Legacy Salary' },
    ];
    const groups = {
      'july-2026|gtr30-sal': [emp('e1', 'GTR30-SAL')],
      'july-2026|gtr-30-ngo-stats': [emp('e2')],
    };

    const merged = mergeGtr30BillCodeMappings(configured, groups);
    const codes = merged.map((m) => m.billCode);

    expect(codes).toContain('GTR-30-GO-STATS');
    expect(codes).toContain('GTR-30-NGO-STATS');
    expect(codes).not.toContain('GTR30-SAL');
    expect(codes).not.toContain('GTR30-DA');
    expect(codes).not.toContain('GTR30-BONUS');
  });

  it('collapses hyphen/case variants onto the canonical configured mapping', () => {
    const configured: GTR30BillCodeMapping[] = [
      { id: 'm1', billCode: 'GTR-30-GO-STATS', description: 'Canonical', headChargeable: '111' },
    ];
    const groups = {
      'july-2026|gtr30-go-stats': [emp('e1', 'gtr30 go stats')],
    };

    const merged = mergeGtr30BillCodeMappings(configured, groups);
    expect(merged).toHaveLength(1);
    expect(merged[0].billCode).toBe('GTR-30-GO-STATS');
    expect(merged[0].headChargeable).toBe('111');
  });

  it('adds employee-master-only codes with the dynamic fallback classification', () => {
    const groups = {
      'july-2026|narmada-1': [emp('e1')],
    };

    const merged = mergeGtr30BillCodeMappings(DEFAULT_BILL_CODE_MAPPINGS, groups);
    const dynamic = merged.find((m) => m.billCode === 'NARMADA-1');
    expect(dynamic).toBeDefined();
    expect(dynamic?.headChargeable).toBe('2403001139900');
    expect(dynamic?.id).toBe('bc-dyn-NARMADA-1');
  });
});

describe('buildGtr30BillCodeOptions', () => {
  it('labels master-group and employee-record codes and filters legacy codes', () => {
    const configured: GTR30BillCodeMapping[] = [
      { id: 'm1', billCode: 'GTR-30-GO-STATS', description: 'GO Stats Bill' },
    ];
    const groups = {
      'july-2026|gtr30-sal': [emp('e1', 'GTR30-SAL')],
      'july-2026|narmada-1': [emp('e2', 'NARMADA-2')],
    };

    const options = buildGtr30BillCodeOptions(configured, groups);
    const byCode = new Map(options.map((o) => [o.billCode, o.description]));

    expect(byCode.get('GTR-30-GO-STATS')).toBe('GO Stats Bill');
    expect(byCode.get('NARMADA-1')).toBe('NARMADA-1 (Master Group)');
    expect(byCode.get('NARMADA-2')).toBe('NARMADA-2 (From Employee Record)');
    expect(byCode.has('GTR30-SAL')).toBe(false);
  });

  it('always includes extra codes even when legacy so existing records stay editable', () => {
    const options = buildGtr30BillCodeOptions(DEFAULT_BILL_CODE_MAPPINGS, undefined, ['GTR30-SAL']);
    expect(options.some((o) => o.billCode === 'GTR30-SAL')).toBe(true);
  });
});

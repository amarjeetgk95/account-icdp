import { describe, it, expect } from 'vitest';
import {
  buildParityReport,
  fetchParityReport,
  adaptPayroll,
  type ParityPersonInput,
} from './employeeParity.service';

const est = (over: Partial<ParityPersonInput> = {}): ParityPersonInput => ({
  hrpn: '20014113',
  pan: 'ABCDE1234F',
  name: 'Ramesh Patel',
  designation: 'Accountant',
  payScale: 'LEVEL-6',
  ...over,
});

describe('buildParityReport', () => {
  it('merges the same person across establishment and payroll sources by HRPN', () => {
    const report = buildParityReport(
      [est()],
      [{ ...est(), designation: 'Accountant' }]
    );
    expect(report.summary.totalCanonical).toBe(1);
    expect(report.summary.inBoth).toBe(1);
    expect(report.summary.mismatchCount).toBe(0);
  });

  it('links payroll rows via PAN when HRPN is missing, and tolerates the hprn typo shape', () => {
    // adaptPayroll reads the legacy `hprn_no` DB column
    const row = adaptPayroll({
      id: 'e1',
      name: 'Ramesh Patel',
      pan: 'abcde1234f',
      hprn_no: null,
    } as never);
    expect(row.hrpn).toBeNull();
    expect(row.pan).toBe('ABCDE1234F');

    const report = buildParityReport([est()], [row]);
    expect(report.summary.totalCanonical).toBe(1);
    expect(report.people[0].matchBy).toBe('hrpn');
  });

  it('flags field drift instead of silently merging', () => {
    const report = buildParityReport(
      [est({ designation: 'Senior Accountant' })],
      [est({ designation: 'Accountant' })]
    );
    expect(report.summary.mismatchCount).toBe(1);
    const mismatch = report.people[0].mismatches.find((m) => m.field === 'designation');
    expect(mismatch?.establishment).toBe('Senior Accountant');
    expect(mismatch?.payroll).toBe('Accountant');
  });

  it('counts missing persons per source', () => {
    const report = buildParityReport(
      [est(), est({ hrpn: '20014114', pan: 'XYZAB1234C', name: 'Only Est' })],
      [est()]
    );
    expect(report.summary.totalCanonical).toBe(2);
    expect(report.summary.missingFromPayroll).toBe(1);
    expect(report.summary.onlyEstablishment).toBe(1);
  });

  it('counts unkeyed rows instead of merging them into one person', () => {
    const report = buildParityReport(
      [{ hrpn: null, pan: null, name: '', designation: null, payScale: null }],
      []
    );
    expect(report.summary.totalCanonical).toBe(0);
    expect(report.summary.unkeyedRows).toBe(1);
  });
});

describe('fetchParityReport', () => {
  it('marks failed sources unavailable instead of throwing', async () => {
    const report = await fetchParityReport({
      listEstablishment: () => Promise.resolve(null),
      listPayroll: () => Promise.reject(new Error('offline')),
    });
    expect(report.sources).toEqual({ establishment: 'ok', payroll: 'unavailable' });
    expect(report.summary.totalCanonical).toBe(0);
  });
});

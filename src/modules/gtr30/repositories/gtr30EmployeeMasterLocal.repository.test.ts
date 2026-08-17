import { describe, expect, it, beforeEach } from 'vitest';
import {
  gtr30EmployeeMasterLocalRepository,
  gtr30EmployeeMasterStorageKey,
} from './gtr30EmployeeMasterLocal.repository';

const LEGACY_KEY = 'gtr30-employee-master-v3-groups';

function groupPayload() {
  return {
    'july-2026|gtr30-sal': {
      monthKey: 'July-2026',
      billCode: 'GTR30-SAL',
      employees: [
        {
          id: 'e1',
          srNo: 1,
          name: 'X',
          designation: 'Y',
          payScale: 'P',
          currentPay: 0,
          currentPayDate: '',
          hraPercent: 0,
          transportAllowance: 0,
          medicalAllowance: 0,
          claAllowance: 0,
        },
      ],
    },
  };
}

describe('gtr30EmployeeMasterLocalRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty record when nothing stored', () => {
    expect(gtr30EmployeeMasterLocalRepository.loadAll()).toEqual({});
  });

  it('saveGroup indexes by monthKey|billCode (case-insensitive)', () => {
    gtr30EmployeeMasterLocalRepository.saveGroup('July-2026', 'GTR30-SAL', [
      {
        id: 'e1',
        srNo: 1,
        name: 'X',
        designation: 'Y',
        payScale: 'P',
        currentPay: 0,
        currentPayDate: '',
        hraPercent: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        claAllowance: 0,
      },
    ]);
    expect(gtr30EmployeeMasterLocalRepository.loadAll()).toEqual({
      'july-2026|gtr30-sal': {
        monthKey: 'July-2026',
        billCode: 'GTR30-SAL',
        employees: expect.any(Array),
      },
    });
  });

  it('loadGroup returns null for unknown groups', () => {
    expect(gtr30EmployeeMasterLocalRepository.loadGroup('Anything', 'Anything')).toBeNull();
  });

  it('tolerates corrupt JSON', () => {
    localStorage.setItem('gtr30-employee-master-v3-groups', '{not json');
    expect(gtr30EmployeeMasterLocalRepository.loadAll()).toEqual({});
  });

  it('removeGroup clears the entry', () => {
    gtr30EmployeeMasterLocalRepository.saveGroup('A', 'B', []);
    gtr30EmployeeMasterLocalRepository.removeGroup('A', 'B');
    expect(gtr30EmployeeMasterLocalRepository.loadGroup('A', 'B')).toBeNull();
  });

  it('migrates legacy v3 groups into the office-scoped key once', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(groupPayload()));
    expect(gtr30EmployeeMasterLocalRepository.loadAll()).toEqual(groupPayload());
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(
      localStorage.getItem(gtr30EmployeeMasterStorageKey({ all: false, officeId: null }))
    ).toBeTruthy();
  });

  it('does not overwrite existing scoped data with legacy data', () => {
    gtr30EmployeeMasterLocalRepository.saveGroup('July-2026', 'GTR30-SAL', [
      {
        id: 'e9',
        srNo: 9,
        name: 'Kept',
        designation: '',
        payScale: '',
        currentPay: 0,
        currentPayDate: '',
        hraPercent: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        claAllowance: 0,
      },
    ]);
    localStorage.setItem(LEGACY_KEY, JSON.stringify(groupPayload()));
    const all = gtr30EmployeeMasterLocalRepository.loadAll();
    expect(all['july-2026|gtr30-sal'].employees[0].id).toBe('e9');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('only reads data from the current office scope', () => {
    localStorage.setItem(
      gtr30EmployeeMasterStorageKey({ all: false, officeId: '9' }),
      JSON.stringify(groupPayload())
    );
    expect(gtr30EmployeeMasterLocalRepository.loadAll()).toEqual({});
  });
});

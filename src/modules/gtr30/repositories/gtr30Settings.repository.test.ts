import { describe, expect, it, beforeEach } from 'vitest';
import { gtr30SettingsLocalStorageRepository } from './gtr30Settings.repository';

describe('gtr30SettingsLocalStorageRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('load returns null when nothing is stored', () => {
    expect(gtr30SettingsLocalStorageRepository.load()).toBeNull();
  });

  it('save then load round-trips the payload', () => {
    const payload = {
      settings: {
        officeName: 'X',
        officeFullName: 'Y',
        branchName: 'B',
        treasuryName: 'T',
        phoneNo: '1',
        district: '2',
        station: '3',
        cardexNo: '4',
        ddoCode: '5',
        classOfExpenditure: '6',
        fund: '7',
        drawingOfficer: '8',
        demandNo: '9',
        typeOfBudget: '10',
        schemeNo: '11',
        headChargeable: '12',
        sector: '13',
        majorHead: '14',
        minorHead: '15',
        subHead: '16',
        budgetYear: '17',
        schemeResolutionText: '18',
        daResolutionText: '19',
        drawingOfficerName: '20',
        drawingOfficerNameGujarati: '21',
        drawingOfficerDesignation: '22',
        drawingOfficerDesignationGujarati: '23',
        drawingOfficerOffice: '24',
        drawingOfficerOfficeGujarati: '25',
        messengerName: '26',
        messengerDesignation: '27',
      },
      employeeTemplate: {
        designation: 'D',
        designationGujarati: 'G',
        cadreClass: '3',
        payScale: 'P',
        gradePay: 'GP',
        payLevelCell: 'C',
        ppaNo: 'A',
        quarterAddress: 'Q',
        insuranceGroup: 'A' as const,
        insuranceType: 'savings_and_insurance' as const,
      },
      defaultPosts: [
        {
          id: 'p1',
          srNo: '1',
          designation: 'Post',
          cadreClass: '1',
          sanctioned: 1,
          filled: 0,
          vacant: 1,
          total: 1,
        },
      ],
      daRates: [
        { id: 'da1', effectiveFrom: '2024-12-04', rate: 53, description: 'Test', resolutionNo: 'GR' },
      ],
    };
    gtr30SettingsLocalStorageRepository.save(payload);
    const loaded = gtr30SettingsLocalStorageRepository.load();
    expect(loaded?.settings.officeName).toBe('X');
    expect(loaded?.defaultPosts[0].id).toBe('p1');
  });

  it('tolerates partially corrupted JSON', () => {
    localStorage.setItem('gtr30-settings-v1', '{not json');
    expect(gtr30SettingsLocalStorageRepository.load()).toBeNull();
  });

  it('clear removes the key', () => {
    gtr30SettingsLocalStorageRepository.save({
      settings: {
        officeName: 'X',
        officeFullName: '',
        branchName: '',
        treasuryName: '',
        phoneNo: '',
        district: '',
        station: '',
        cardexNo: '',
        ddoCode: '',
        classOfExpenditure: '',
        fund: '',
        drawingOfficer: '',
        demandNo: '',
        typeOfBudget: '',
        schemeNo: '',
        headChargeable: '',
        sector: '',
        majorHead: '',
        minorHead: '',
        subHead: '',
        budgetYear: '',
        schemeResolutionText: '',
        daResolutionText: '',
        drawingOfficerName: '',
        drawingOfficerNameGujarati: '',
        drawingOfficerDesignation: '',
        drawingOfficerDesignationGujarati: '',
        drawingOfficerOffice: '',
        drawingOfficerOfficeGujarati: '',
        messengerName: '',
        messengerDesignation: '',
      },
      employeeTemplate: {
        designation: '',
        designationGujarati: '',
        cadreClass: '',
        payScale: '',
        gradePay: '',
        payLevelCell: '',
        ppaNo: '',
        quarterAddress: '',
        insuranceGroup: 'A',
        insuranceType: 'savings_and_insurance',
      },
      defaultPosts: [],
      daRates: [{ id: 'da1', effectiveFrom: '2024-12-04', rate: 53 }],
    });
    gtr30SettingsLocalStorageRepository.clear();
    expect(gtr30SettingsLocalStorageRepository.load()).toBeNull();
  });
});

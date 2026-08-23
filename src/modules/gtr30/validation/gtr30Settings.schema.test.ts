import { describe, expect, it } from 'vitest';
import { gtr30SettingsSchema } from './gtr30Settings.schema';

describe('gtr30SettingsSchema', () => {
  it('accepts a valid settings payload', () => {
    const payload = {
      settings: {
        officeName: 'Test Office',
        officeFullName: 'Test Office Full',
        branchName: 'Branch',
        treasuryName: 'Treasury',
        phoneNo: '123',
        district: 'District',
        station: 'Station',
        cardexNo: 'CD1',
        ddoCode: 'DDO1',
        controllingOfficer: 'CO',
        classOfExpenditure: 'Class',
        fund: 'Fund',
        drawingOfficer: 'DO',
        demandNo: '1',
        typeOfBudget: 'Type',
        schemeNo: 'Scheme',
        headChargeable: 'Head',
        sector: 'Sector',
        majorHead: 'Major',
        minorHead: 'Minor',
        subHead: 'Sub',
        budgetYear: '2024-25',
        schemeResolutionText: 'Scheme Res',
        daResolutionText: 'DA Res',
        drawingOfficerName: 'DO Name',
        drawingOfficerNameGujarati: 'DO Name Guj',
        drawingOfficerDesignation: 'DO Desig',
        drawingOfficerDesignationGujarati: 'DO Desig Guj',
        drawingOfficerOffice: 'DO Office',
        drawingOfficerOfficeGujarati: 'DO Office Guj',
        messengerName: 'Messenger',
        messengerDesignation: 'Mess Desig',
      },
      employeeTemplate: {
        designation: 'Desig',
        designationGujarati: 'Desig Guj',
        cadreClass: '3',
        payScale: 'Pay',
        gradePay: 'GP',
        payLevelCell: 'Cell',
        ppaNo: 'PPA',
        quarterAddress: 'Qtr',
        insuranceGroup: 'A',
        insuranceType: 'savings_and_insurance',
      },
      defaultPosts: [
        { id: 'p1', srNo: '1', designation: 'Post', cadreClass: '1', sanctioned: 1, filled: 0, vacant: 1, total: 1 },
      ],
      daRates: [
        { id: 'da1', effectiveFrom: '2024-01-01', rate: 50, description: 'Test', resolutionNo: 'GR1' },
      ],
    };

    const result = gtr30SettingsSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts partial payload with defaults', () => {
    const payload = {
      settings: { officeName: 'Test' },
      employeeTemplate: { designation: 'Desig' },
    };

    const result = gtr30SettingsSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultPosts).toEqual([]);
      expect(result.data.daRates).toEqual([]);
      expect(result.data.employeeTemplate?.insuranceType).toBe('savings_and_insurance');
    }
  });

  it('rejects invalid insuranceGroup', () => {
    const payload = {
      employeeTemplate: {
        insuranceGroup: 'INVALID',
      },
    };

    const result = gtr30SettingsSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts valid insuranceGroup values', () => {
    const validGroups = ['ક', 'ખ', 'ગ', 'ઘ', 'A', 'B', 'C', 'D', ''];
    for (const group of validGroups) {
      const result = gtr30SettingsSchema.safeParse({
        employeeTemplate: { insuranceGroup: group },
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid daRate effectiveFrom format', () => {
    const payload = {
      daRates: [{ id: '1', effectiveFrom: '01-01-2024', rate: 50 }],
    };

    const result = gtr30SettingsSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
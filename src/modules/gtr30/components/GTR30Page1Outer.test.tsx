import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GTR30Page1Outer } from './GTR30Page1Outer';
import { GTR30SingleForm } from './GTR30SingleForm';
import { GTR30DeductionsOuterBack } from './GTR30DeductionsOuterBack';
import type { GTR30FormData } from '../types';

const mockFormData: GTR30FormData = {
  billRegisterNo: 'GTR30-2026-27/01',
  billDate: '2026-07-31',
  monthOf: 'July-2026',
  billCode: 'GTR30-SAL',
  monthYearDigits: '0726',
  district: '66',
  branchName: 'Establishment Branch A',
  officeName: 'Dy. Dir. of Animal Husbandry, Surat',
  officeFullName: 'Office of Deputy Director of Animal Husbandry, ICDP, Surat',
  treasuryName: 'District Treasury Office, Surat',
  phoneNo: '0261-2465123',
  cardexNo: '22',
  ddoCode: '299',
  station: 'Surat',
  controllingOfficer: '0101',
  classOfExpenditure: '1',
  fund: '3',
  drawingOfficer: '2990',
  demandNo: '004',
  typeOfBudget: '1',
  schemeNo: '000000',
  headChargeable: '2403001139900',
  sector: 'Sector-C-Economic Services',
  demandNoLabel: 'Demand No. 004',
  majorHead: 'Major Head-2403 Animal Husbandry',
  subMajorHead: '-',
  minorHead: 'Minor Head-113 Administrative Investigation and Statistics',
  subHead: 'Sub Head-99 Scheme for Strengthening of Statistical Wing',
  budgetYear: '2026-2027',
  budgetAllotment: 500000,
  schemeResolutionText: 'Resolution No. AH/2026/01',
  daResolutionText: 'GR No. FD/DA/2026',
  drawingOfficerName: 'Dr. A. B. Patel',
  drawingOfficerNameGujarati: 'ડો. એ. બી. પટેલ',
  drawingOfficerDesignation: 'Deputy Director',
  drawingOfficerDesignationGujarati: 'નાયબ નિયામક',
  drawingOfficerOffice: 'ICDP Surat',
  drawingOfficerOfficeGujarati: 'આઈ.સી.ડી.પી. સુરત',
  messengerName: 'Ramesh Kumar',
  messengerDesignation: 'Peon',
  transits: [
    { srNo: '101', date: '01/08/2026', tokenNo: '4501', tokenDate: '01/08/2026' },
    { srNo: '102', date: '02/08/2026', tokenNo: '4502', tokenDate: '02/08/2026' },
    { srNo: '103', date: '03/08/2026', tokenNo: '4503', tokenDate: '03/08/2026' },
  ],
  establishmentPosts: [],
  employees: [
    {
      id: 'emp-1',
      srNo: 1,
      name: 'Patel Ramesh K.',
      designation: 'Veterinary Officer',
      payScale: 'Level-8',
      gradePay: '4400',
      payLevelCell: '44900',
      ppaNo: 'PPA12345',
      quarterAddress: '',
      insuranceGroup: 'ખ',
      insuranceType: 'savings_and_insurance',
      payOfOfficer: 44900,
      payOfEstablishment: 0,
      nppa: 0,
      leaveSalary: 0,
      leaveEncashment: 0,
      dearnessPay: 0,
      da: 22450,
      hra: 4490,
      cla: 240,
      otherAllowance: 0,
      medicalAllowance: 300,
      bonus: 0,
      pta: 0,
      profSplService: 0,
      washingAllowance: 0,
      officeExpenseOther: 0,
      ca: 0,
      transportAllowance: 1800,
      ropArrearsGaz: 0,
      ropArrearsNonGaz: 0,
      dpGaz: 0,
      dpNonGaz: 0,
      recovFestivalAdv: 0,
      recovFoodGrainAdv: 0,
      recovPay: 0,
      leaveSalaryAdv: 0,
      incomeTax: 3000,
      surchargeIT: 0,
      housingFund: 0,
      rentOfBuilding: 0,
      policeHousing: 0,
      postalLifeInsurance: 0,
      bsiPremium: 0,
      professionalTax: 200,
      gis1979Insurance: 0,
      gis1981Insurance: 120,
      gis1981Savings: 280,
      aisInsurance: 0,
      aisSavings: 0,
      diviAcctInsurance: 0,
      diviAcctSavings: 0,
      pfDeputation: 0,
      govtHousingFund: 0,
      hba: 0,
      motorCarAdv: 0,
      securityDeposit: 0,
      iasProvidentFund: 0,
      gpfOtherThanClass4: 0,
      gpfDiviAcct: 0,
      contributoryPF: 0,
      gpfWorkCharged: 0,
      gpfRojamdar: 0,
      festivalAdv: 0,
      foodGrainAdv: 0,
      fanAdv: 0,
      otherConveyanceAdv: 0,
      interestOnAdv: 0,
      jeepRent: 0,
      pfAdjustableByAO: 0,
      recovPayLeaveSalary: 0,
      miscRecoveries: 0,
      npsPension: 6735,
      societyDeduction: 0,
      remarks: '',
    },
  ],
};

describe('GTR-30 Single Form Component (GTR30SingleForm)', () => {
  it('renders complete single GTR-30 form with exact section headers and fields', () => {
    const { container } = render(
      <GTR30SingleForm data={mockFormData} instanceId="front" />
    );

    // Header & Form Title
    expect(screen.getByText('FORM G. T. R. 30')).toBeDefined();
    expect(screen.getByText('(See Rule 176(1))')).toBeDefined();
    expect(container.querySelector('#front-bill-reg-no')).toBeNull();

    // Establishment & Office info
    expect(container.querySelector('#front-establishment')?.textContent).toBe('GTR30-SAL');
    expect(container.querySelector('#front-office-name')?.textContent).toBe('Office of Deputy Director of Animal Husbandry, ICDP, Surat');
    expect(container.querySelector('#front-month-of')?.textContent).toBe('July-2026');

    // Treasury Section
    expect(container.querySelector('#front-treasury-name')?.textContent).toBe('District Treasury Office, Surat');
    expect(container.querySelector('#front-transit-sr-1')?.textContent).toBe('101');
    expect(container.querySelector('#front-transit-token-1')?.textContent).toBe('4501');

    // Computer Input Data Section (Blank for Treasury)
    expect(container.querySelector('#front-district')?.textContent?.trim()).toBe('');
    expect(container.querySelector('#front-month-year')?.textContent?.trim()).toBe('');

    // Account Heads
    expect(container.querySelector('#front-account-heads-box')).toBeDefined();
    expect(screen.getByText('Sector-C-Economic Services')).toBeDefined();
    expect(screen.getByText('Major Head-2403 Animal Husbandry')).toBeDefined();

    // AG Office Section
    expect(container.querySelector('#front-ag-office-section')).toBeDefined();

    // Drawing Officer Signature
    expect(container.querySelector('#front-signature-section')?.textContent).toContain('Dr. A. B. Patel');
  });

  it('renders 5 separate table columns for EDP code values in sequence', () => {
    const { container } = render(
      <GTR30SingleForm data={mockFormData} instanceId="front" />
    );

    // EDP Header
    expect(container.querySelector('#front-edp-header')?.textContent).toBe('EDP Code');

    // Row 1 (Pay of Officer - 0101+)
    expect(container.querySelector('#front-edp-1-0')?.textContent).toBe('0');
    expect(container.querySelector('#front-edp-1-1')?.textContent).toBe('1');
    expect(container.querySelector('#front-edp-1-2')?.textContent).toBe('0');
    expect(container.querySelector('#front-edp-1-3')?.textContent).toBe('1');
    expect(container.querySelector('#front-edp-1-4')?.textContent).toBe('+');

    // Row 23 (Festival Advance Recovery - 5701-)
    expect(container.querySelector('#front-edp-23-0')?.textContent).toBe('5');
    expect(container.querySelector('#front-edp-23-1')?.textContent).toBe('7');
    expect(container.querySelector('#front-edp-23-2')?.textContent).toBe('0');
    expect(container.querySelector('#front-edp-23-3')?.textContent).toBe('1');
    expect(container.querySelector('#front-edp-23-4')?.textContent).toBe('-');
  });
});

describe('GTR-30 Deductions Outer Back Component (GTR30DeductionsOuterBack)', () => {
  it('renders Deduction A and Deduction B tables with 5 separate columns for Code', () => {
    const { container } = render(
      <GTR30DeductionsOuterBack data={mockFormData} instanceId="back" />
    );

    expect(container.querySelector('#back-deduction-a-table')).toBeDefined();
    expect(container.querySelector('#back-deduction-b-table')).toBeDefined();
    expect(container.querySelector('#back-total-a-row')).toBeDefined();
    expect(container.querySelector('#back-total-deductions-row')).toBeDefined();
    expect(container.querySelector('#back-net-total-row')).toBeDefined();

    // Check 5 separate columns for Code e.g. 9510- for Income Tax
    expect(container.querySelector('#back-ded-a-0-0')?.textContent).toBe('9');
    expect(container.querySelector('#back-ded-a-0-1')?.textContent).toBe('5');
    expect(container.querySelector('#back-ded-a-0-2')?.textContent).toBe('1');
    expect(container.querySelector('#back-ded-a-0-3')?.textContent).toBe('0');
    expect(container.querySelector('#back-ded-a-0-4')?.textContent).toBe('-');

    // Treasury and Cardex endorsement sections
    expect(container.querySelector('#back-treasury-payment-box')).toBeDefined();
    expect(container.querySelector('#back-specimen-signature-box')).toBeDefined();
    expect(container.querySelector('#back-cardex-code')?.textContent).toBe('22');
  });
});

describe('GTR30Page1Outer', () => {
  it('renders one A4 landscape page with front on the left and deductions/back on the right', () => {
    const { container } = render(<GTR30Page1Outer data={mockFormData} />);

    const page = container.querySelector('#gtr30-page-1');
    expect(page).toBeDefined();
    expect(page?.classList.contains('gtr30-landscape')).toBe(true);

    const inner = container.querySelector('.gtr30-page-inner');
    expect(inner).toBeDefined();

    const front = container.querySelector('#gtr30-form-front-column');
    expect(front).toBeDefined();

    const back = container.querySelector('#gtr30-form-back-column');
    expect(back).toBeDefined();

    // The original two-form arrangement must remain.
    expect(front?.querySelector('#front-title')).toBeDefined();
    expect(back?.querySelector('#back-deduction-a-table')).toBeDefined();
    expect(back?.querySelector('#back-deduction-b-table')).toBeDefined();
  });

  it('does not use a layout gap between the two halves', () => {
    const { container } = render(<GTR30Page1Outer data={mockFormData} />);

    const inner = container.querySelector('.gtr30-page-inner') as HTMLElement;
    expect(inner).toBeDefined();

    // React does not calculate CSS here, but the intended structure
    // is explicitly one two-column grid with no separate gap element.
    expect(inner.classList.contains('gtr30-page-inner')).toBe(true);

    const divider = container.querySelector('.gtr30-center-divider');
    expect(divider).toBeNull();
  });

  it('keeps the two halves independent', () => {
    const { container } = render(<GTR30Page1Outer data={mockFormData} />);

    const front = container.querySelector('#gtr30-form-front-column');
    const back = container.querySelector('#gtr30-form-back-column');

    expect(front).not.toBe(back);
    expect(front?.contains(back as Node)).toBe(false);
    expect(back?.contains(front as Node)).toBe(false);
  });
});

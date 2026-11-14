import type { GTR30Employee, GTR30FormData } from '../types';
// Currency formatting & number-to-words live canonically in
// `@/shared/domain/currency`. Aliased here for backward compatibility with
// existing gtr30 importers.
import { formatINR, formatINRInteger, integerToIndianWords } from '@/shared/domain/currency';

export const formatMoney = formatINR;

export const formatMoneyInteger = formatINRInteger;

export const splitRsPs = (value: number | undefined | null) => {
  const val = Number(value) || 0;
  const parts = Math.abs(val).toFixed(2).split('.');
  return {
    rs: Number(parts[0]).toLocaleString('en-IN'),
    ps: parts[1] || '00',
  };
};

const employeeEarningsSubtotal = (e: GTR30Employee): number => {
  return (
    (e.payOfOfficer || 0) +
    (e.payOfEstablishment || 0) +
    (e.nppa || 0) +
    (e.leaveSalary || 0) +
    (e.leaveEncashment || 0) +
    (e.dearnessPay || 0) +
    (e.da || 0) +
    (e.hra || 0) +
    (e.cla || 0) +
    (e.otherAllowance || 0) +
    (e.medicalAllowance || 0) +
    (e.bonus || 0) +
    (e.pta || 0) +
    (e.profSplService || 0) +
    (e.washingAllowance || 0) +
    (e.officeExpenseOther || 0) +
    (e.ca || 0) +
    (e.transportAllowance || 0) +
    (e.ropArrearsGaz || 0) +
    (e.ropArrearsNonGaz || 0) +
    (e.dpGaz || 0) +
    (e.dpNonGaz || 0)
  );
};

const employeeRecoveriesSubtotal = (e: GTR30Employee): number => {
  return (
    (e.recovFestivalAdv || 0) +
    (e.recovFoodGrainAdv || 0) +
    (e.recovPay || 0) +
    (e.leaveSalaryAdv || 0)
  );
};

export const earningsTotal = (e: GTR30Employee): number => {
  return employeeEarningsSubtotal(e) - employeeRecoveriesSubtotal(e);
};

export const deductionsTotal = (e: GTR30Employee): number => {
  return (
    (e.incomeTax || 0) +
    (e.surchargeIT || 0) +
    (e.housingFund || 0) +
    (e.rentOfBuilding || 0) +
    (e.policeHousing || 0) +
    (e.postalLifeInsurance || 0) +
    (e.bsiPremium || 0) +
    (e.professionalTax || 0) +
    (e.gis1979Insurance || 0) +
    (e.gis1981Insurance || 0) +
    (e.gis1981Savings || 0) +
    (e.aisInsurance || 0) +
    (e.aisSavings || 0) +
    (e.diviAcctInsurance || 0) +
    (e.diviAcctSavings || 0) +
    (e.pfDeputation || 0) +
    (e.govtHousingFund || 0) +
    (e.hba || 0) +
    (e.motorCarAdv || 0) +
    (e.securityDeposit || 0) +
    (e.iasProvidentFund || 0) +
    (e.gpfOtherThanClass4 || 0) +
    (e.gpfDiviAcct || 0) +
    (e.contributoryPF || 0) +
    (e.gpfWorkCharged || 0) +
    (e.gpfRojamdar || 0) +
    (e.fanAdv || 0) +
    (e.otherConveyanceAdv || 0) +
    (e.interestOnAdv || 0) +
    (e.jeepRent || 0) +
    (e.pfAdjustableByAO || 0) +
    (e.recovPayLeaveSalary || 0) +
    (e.miscRecoveries || 0) +
    (e.npsPension || 0)
  );
};

export const billTotals = (data: GTR30FormData) => {
  const employees = data.employees || [];
  const gross = employees.reduce((sum, e) => sum + earningsTotal(e), 0);
  const deductions = employees.reduce((sum, e) => sum + deductionsTotal(e), 0);
  const net = gross - deductions;
  const societyTotal = employees.reduce((sum, e) => sum + (e.societyDeduction || 0), 0);
  const netAfterSociety = net - societyTotal;
  const totalRent = employees.reduce((sum, e) => sum + (e.rentOfBuilding || 0), 0);
  const totalProfTax = employees.reduce((sum, e) => sum + (e.professionalTax || 0), 0);
  const totalGisInsurance = employees.reduce(
    (sum, e) => sum + (e.gis1981Insurance || 0) + (e.gis1979Insurance || 0),
    0
  );
  const totalGisSavings = employees.reduce((sum, e) => sum + (e.gis1981Savings || 0), 0);
  const totalGis = totalGisInsurance + totalGisSavings;

  return {
    gross,
    deductions,
    net,
    societyTotal,
    netAfterSociety,
    totalRent,
    totalProfTax,
    totalGisInsurance,
    totalGisSavings,
    totalGis,
  };
};

export interface GroupInsuranceRow {
  groupCode: string;
  groupNameGujarati: string;
  countInsOnly: number;
  countSavingsAndIns: number;
  insFund: number;
  savingsFund: number;
  total: number;
}

export const groupInsuranceBreakdown = (employees: GTR30Employee[]): GroupInsuranceRow[] => {
  const groups = [
    { code: 'A', name: 'ક' },
    { code: 'B', name: 'ખ' },
    { code: 'C', name: 'ગ' },
    { code: 'D', name: 'ઘ' },
  ];

  return groups.map((grp) => {
    const matching = employees.filter((e) => {
      const g = (e.insuranceGroup || '').trim().toUpperCase();
      return g === grp.code || g === grp.name;
    });

    let countInsOnly = 0;
    let countSavingsAndIns = 0;
    let insFund = 0;
    let savingsFund = 0;

    for (const e of matching) {
      const ins = (e.gis1981Insurance || 0) + (e.gis1979Insurance || 0);
      const sav = e.gis1981Savings || 0;
      if (ins > 0 || sav > 0) {
        if (e.insuranceType === 'insurance_only' || sav === 0) {
          countInsOnly += 1;
        } else {
          countSavingsAndIns += 1;
        }
      }
      insFund += ins;
      savingsFund += sav;
    }

    return {
      groupCode: grp.code,
      groupNameGujarati: grp.name,
      countInsOnly,
      countSavingsAndIns,
      insFund,
      savingsFund,
      total: insFund + savingsFund,
    };
  });
};

/**
 * Words without the "Rupees ... Only" wrapper and without paise (statutory
 * certificate wording). Zero renders as 'Zero' here (legacy gtr30 behavior).
 * Integer wording is shared with the rest of the app via `integerToIndianWords`.
 */
export function numberToWords(num: number): string {
  const rounded = Math.round(Math.abs(num));
  if (rounded === 0) return 'Zero';

  return integerToIndianWords(rounded).replace(/\s+/g, ' ').trim();
}

export function formatWordsCertificate(num: number): string {
  return `Rupees ${numberToWords(num)} Only`;
}

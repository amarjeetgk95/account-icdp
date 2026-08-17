import type { GTR30Employee, GTR30FormData } from '../types';

export const formatMoney = (value: number | undefined | null): string => {
  const val = Number(value) || 0;
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatMoneyInteger = (value: number | undefined | null): string => {
  const val = Number(value) || 0;
  return Math.round(val).toLocaleString('en-IN');
};

export const splitRsPs = (value: number | undefined | null) => {
  const val = Number(value) || 0;
  const parts = Math.abs(val).toFixed(2).split('.');
  return {
    rs: Number(parts[0]).toLocaleString('en-IN'),
    ps: parts[1] || '00',
  };
};

export const employeeEarningsSubtotal = (e: GTR30Employee): number => {
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

export const employeeRecoveriesSubtotal = (e: GTR30Employee): number => {
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

export const employeeNetPayable = (e: GTR30Employee): number => {
  return earningsTotal(e) - deductionsTotal(e);
};

export const employeeNetAfterSociety = (e: GTR30Employee): number => {
  return employeeNetPayable(e) - (e.societyDeduction || 0);
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

export function numberToWords(num: number): string {
  const rounded = Math.round(Math.abs(num));
  if (rounded === 0) return 'Zero';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    let current = '';
    if (n >= 100) {
      current += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      current += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '' + ones[n % 10] : '');
    } else if (n > 0) {
      current += ones[n];
    }
    return current.trim();
  };

  let n = rounded;
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    parts.push(convertLessThanOneThousand(crore) + ' Crore');
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    parts.push(convertLessThanOneThousand(lakh) + ' Lakh');
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    parts.push(convertLessThanOneThousand(thousand) + ' Thousand');
  }

  if (n > 0) {
    parts.push(convertLessThanOneThousand(n));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function formatWordsCertificate(num: number): string {
  return `Rupees ${numberToWords(num)} Only`;
}

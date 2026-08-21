import { GTR30EmployeeMaster } from '../types/master';
import { DEFAULT_DA_PERCENT, resolveDARateForMonthKey } from './gtr30GovRules';
import { gtr30SettingsService } from '../services/gtr30Settings.service';

export interface GTR30SalarySummary {
  basic: number;
  da: number;
  hra: number;
  allowances: number;
  grossPay: number;
  professionalTax: number;
  nps: number;
  gisInsurance: number;
  gisSavings: number;
  rent: number;
  societyDeduction: number;
  totalDeductions: number;
  netTakeHome: number;
}

export function calculateEmployeeSalary(
  emp: Partial<GTR30EmployeeMaster>,
  opts?: { daPercent?: number; monthKey?: string }
): GTR30SalarySummary {
  const basic = Number(emp.currentPay || 0);
  let effectiveDaPercent = opts?.daPercent;
  if (effectiveDaPercent === undefined || effectiveDaPercent === null) {
    if (opts?.monthKey) {
      try {
        const rates = gtr30SettingsService.loadSettings().daRates;
        effectiveDaPercent = resolveDARateForMonthKey(rates, opts.monthKey);
      } catch {
        effectiveDaPercent = DEFAULT_DA_PERCENT;
      }
    } else {
      // Fallback to latest DA rate from settings or default
      try {
        const rates = gtr30SettingsService.loadSettings().daRates;
        effectiveDaPercent = resolveDARateForMonthKey(rates, new Date().toISOString().slice(0, 10));
      } catch {
        effectiveDaPercent = DEFAULT_DA_PERCENT;
      }
    }
  }
  const da = emp.da !== undefined && emp.da !== null && Number(emp.da) > 0 ? Number(emp.da) : Math.round(basic * (effectiveDaPercent / 100));
  const hra = Math.round((basic * (emp.hraPercent || 0)) / 100);
  
  const allowances = Number(emp.transportAllowance || 0) + Number(emp.medicalAllowance || 0) + Number(emp.claAllowance || 0);
  const grossPay = basic + da + hra + allowances;
  
  const nps = emp.npsPension !== undefined && emp.npsPension > 0 ? emp.npsPension : Math.round((basic + da) * 0.1);
  
  const rent = Number(emp.rentOfBuilding || 0);
  const professionalTax = Number(emp.professionalTax || 0);
  const gisInsurance = Number(emp.gis1981Insurance || 0);
  const gisSavings = Number(emp.gis1981Savings || 0);
  const societyDeduction = Number(emp.societyDeduction || 0);
  
  const totalDeductions = rent + professionalTax + gisInsurance + gisSavings + societyDeduction + nps;
  const netTakeHome = Math.max(0, grossPay - totalDeductions);

  return {
    basic,
    da,
    hra,
    allowances,
    grossPay,
    professionalTax,
    nps,
    gisInsurance,
    gisSavings,
    rent,
    societyDeduction,
    totalDeductions,
    netTakeHome,
  };
}

export function calculateGroupTotals(employees: GTR30EmployeeMaster[], opts?: { daPercent?: number; monthKey?: string }): GTR30SalarySummary {
  const initial: GTR30SalarySummary = {
    basic: 0,
    da: 0,
    hra: 0,
    allowances: 0,
    grossPay: 0,
    professionalTax: 0,
    nps: 0,
    gisInsurance: 0,
    gisSavings: 0,
    rent: 0,
    societyDeduction: 0,
    totalDeductions: 0,
    netTakeHome: 0,
  };

  return employees.reduce((acc, emp) => {
    const salary = calculateEmployeeSalary(emp, opts);
    return {
      basic: acc.basic + salary.basic,
      da: acc.da + salary.da,
      hra: acc.hra + salary.hra,
      allowances: acc.allowances + salary.allowances,
      grossPay: acc.grossPay + salary.grossPay,
      professionalTax: acc.professionalTax + salary.professionalTax,
      nps: acc.nps + salary.nps,
      gisInsurance: acc.gisInsurance + salary.gisInsurance,
      gisSavings: acc.gisSavings + salary.gisSavings,
      rent: acc.rent + salary.rent,
      societyDeduction: acc.societyDeduction + salary.societyDeduction,
      totalDeductions: acc.totalDeductions + salary.totalDeductions,
      netTakeHome: acc.netTakeHome + salary.netTakeHome,
    };
  }, initial);
}

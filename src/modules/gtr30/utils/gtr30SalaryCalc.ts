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



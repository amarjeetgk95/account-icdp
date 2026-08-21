import type { GTR30Employee, GTR30EmployeeMaster } from '../types';
import { createDefaultEmployee } from '../constants';
import { monthStartFromKey, resolveBasicPayForMonth } from '../utils/gtr30PayMatrix';
import { resolveDARateForMonthKey, DEFAULT_DA_PERCENT } from '../utils/gtr30GovRules';
import { gtr30SettingsService } from './gtr30Settings.service';

interface Gtr30EmployeeTransformService {
  masterToBillEmployee(
    master: GTR30EmployeeMaster,
    srNo: number,
    base?: Partial<GTR30Employee>,
    opts?: { monthKey?: string; daRate?: number; forceDaRecalc?: boolean }
  ): GTR30Employee;
}

class Gtr30EmployeeTransformServiceImpl implements Gtr30EmployeeTransformService {
  masterToBillEmployee(
    master: GTR30EmployeeMaster,
    srNo: number,
    base?: Partial<GTR30Employee>,
    opts?: { monthKey?: string; daRate?: number; forceDaRecalc?: boolean }
  ): GTR30Employee {
    const monthStart = opts?.monthKey ? monthStartFromKey(opts.monthKey) : null;
    const payEntries = master.payEntries ?? [];
    const resolved = monthStart && payEntries.length > 0
      ? resolveBasicPayForMonth(payEntries, monthStart)
      : null;
    const currentPay = resolved ? resolved.basicPay : master.currentPay || 0;
    const defaultTemplate = createDefaultEmployee(srNo);

    // Resolve effective DA rate: opts.daRate > settings lookup > default
    let effectiveDaRate = opts?.daRate;
    if (effectiveDaRate === undefined || effectiveDaRate === null) {
      try {
        const payload = gtr30SettingsService.loadSettings();
        effectiveDaRate = opts?.monthKey
          ? resolveDARateForMonthKey(payload.daRates, opts.monthKey)
          : resolveDARateForMonthKey(payload.daRates, monthStart ?? new Date().toISOString().slice(0, 10));
      } catch {
        effectiveDaRate = DEFAULT_DA_PERCENT;
      }
      if (!effectiveDaRate) effectiveDaRate = DEFAULT_DA_PERCENT;
    }

    // Calculate DA: if forceDaRecalc or master DA was auto-calculated at old rate, recompute to current effective rate
    const autoDaFromRate = currentPay > 0 ? Math.round(currentPay * (effectiveDaRate / 100)) : defaultTemplate.da;
    const shouldForceRecalc = opts?.forceDaRecalc === true;
    // Detect if stored DA looks like auto-calculated at a different rate (e.g. 53% vs 60%)
    // If stored DA equals 53% of pay but effective is 60%, we should update
    const storedDaIsAuto = master.da !== undefined && master.da > 0 && currentPay > 0 && Math.abs(master.da - Math.round(currentPay * 0.53)) < 2;
    const da = shouldForceRecalc || storedDaIsAuto || master.da === undefined || master.da === 0 ? autoDaFromRate : master.da;

    // Calculate HRA % if provided
    const hra =
      master.hraPercent !== undefined && master.hraPercent > 0
        ? Math.round((currentPay * master.hraPercent) / 100)
        : defaultTemplate.hra;

    // Calculate NPS (10% of Basic + DA if not explicitly provided)
    const npsPension =
      master.npsPension !== undefined && master.npsPension > 0
        ? master.npsPension
        : currentPay > 0
        ? Math.round((currentPay + da) * 0.1)
        : defaultTemplate.npsPension;

    return {
      ...defaultTemplate,
      ...base,
      id: crypto.randomUUID(),
      srNo,
      masterId: master.id,
      name: master.name || defaultTemplate.name,
      designation: master.designation || defaultTemplate.designation,
      designationGujarati: master.designationGujarati || defaultTemplate.designationGujarati,
      cadreClass: master.cadreClass || defaultTemplate.cadreClass,
      payScale: master.payScale || defaultTemplate.payScale,
      gradePay: master.gradePay || defaultTemplate.gradePay,
      payLevelCell: master.payLevelCell || defaultTemplate.payLevelCell || `PAY=${currentPay} (LEVEL CELL-7)`,
      ppaNo: master.ppaNo || defaultTemplate.ppaNo,
      quarterAddress: master.quarterAddress || defaultTemplate.quarterAddress,
      insuranceGroup: master.insuranceGroup || defaultTemplate.insuranceGroup,
      insuranceType: master.insuranceType || defaultTemplate.insuranceType,

      payOfEstablishment: currentPay > 0 ? currentPay : defaultTemplate.payOfEstablishment,
      da,
      hra,
      transportAllowance:
        master.transportAllowance !== undefined
          ? master.transportAllowance
          : defaultTemplate.transportAllowance,
      medicalAllowance:
        master.medicalAllowance !== undefined
          ? master.medicalAllowance
          : defaultTemplate.medicalAllowance,
      cla: master.claAllowance !== undefined ? master.claAllowance : defaultTemplate.cla,

      rentOfBuilding:
        master.rentOfBuilding !== undefined
          ? master.rentOfBuilding
          : defaultTemplate.rentOfBuilding,
      professionalTax:
        master.professionalTax !== undefined
          ? master.professionalTax
          : defaultTemplate.professionalTax,
      gis1981Insurance:
        master.gis1981Insurance !== undefined
          ? master.gis1981Insurance
          : defaultTemplate.gis1981Insurance,
      gis1981Savings:
        master.gis1981Savings !== undefined
          ? master.gis1981Savings
          : defaultTemplate.gis1981Savings,
      npsPension,
      societyDeduction:
        master.societyDeduction !== undefined
          ? master.societyDeduction
          : defaultTemplate.societyDeduction,
      remarks: master.remarks || defaultTemplate.remarks,
    };
  }
}

export const gtr30EmployeeTransformService = new Gtr30EmployeeTransformServiceImpl();

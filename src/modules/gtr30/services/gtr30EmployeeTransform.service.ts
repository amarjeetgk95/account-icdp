import type { GTR30Employee, GTR30EmployeeMaster } from '../types';
import { normalizeInsuranceGroup } from '../types/bill';
import { createDefaultEmployee } from '../constants';
import { monthStartFromKey, resolveBasicPayForMonth } from '../utils/gtr30PayMatrix';
import { resolveDARateForMonthKey, calculateDA, calculateNPS, DEFAULT_DA_PERCENT } from '../utils/gtr30GovRules';
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

    const autoDaFromRate = calculateDA(currentPay, effectiveDaRate);
    const shouldForceRecalc = opts?.forceDaRecalc === true;
    const storedDaIsAuto = master.da !== undefined && master.da > 0 && currentPay > 0 && Math.abs(master.da - Math.round(currentPay * 0.53)) < 2;
    const da = shouldForceRecalc || storedDaIsAuto || master.da === undefined || master.da === null ? autoDaFromRate : master.da;

    const hra =
      master.hraPercent !== undefined && master.hraPercent > 0
        ? Math.round((currentPay * master.hraPercent) / 100)
        : defaultTemplate.hra;

    const npsPension =
      master.npsPension !== undefined && master.npsPension > 0
        ? master.npsPension
        : calculateNPS(currentPay, da);

    return {
      ...defaultTemplate,
      ...base,
      id: crypto.randomUUID(),
      srNo,
      masterId: master.id,
      name: master.name || defaultTemplate.name,
      hrpnNo: master.hrpnNo || defaultTemplate.hrpnNo,
      designation: master.designation || defaultTemplate.designation,
      designationGujarati: master.designationGujarati || defaultTemplate.designationGujarati,
      cadreClass: master.cadreClass || defaultTemplate.cadreClass,
      payScale: master.payScale || defaultTemplate.payScale,
      gradePay: master.gradePay || defaultTemplate.gradePay,
      payLevelCell: master.payLevelCell || defaultTemplate.payLevelCell || `PAY=${currentPay} (LEVEL CELL-7)`,
      ppaNo: master.ppaNo || defaultTemplate.ppaNo,
      quarterAddress: master.quarterAddress || defaultTemplate.quarterAddress,
      insuranceGroup: normalizeInsuranceGroup(master.insuranceGroup || defaultTemplate.insuranceGroup),
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

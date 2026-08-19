import type { GTR30Employee, GTR30EmployeeMaster } from '../types';
import { createDefaultEmployee } from '../constants';

interface Gtr30EmployeeTransformService {
  masterToBillEmployee(
    master: GTR30EmployeeMaster,
    srNo: number,
    base?: Partial<GTR30Employee>
  ): GTR30Employee;
}

class Gtr30EmployeeTransformServiceImpl implements Gtr30EmployeeTransformService {
  masterToBillEmployee(
    master: GTR30EmployeeMaster,
    srNo: number,
    base?: Partial<GTR30Employee>
  ): GTR30Employee {
    const currentPay = master.currentPay || 0;
    const defaultTemplate = createDefaultEmployee(srNo);

    // Calculate DA (53% of Basic Pay by default if not set)
    const da =
      master.da !== undefined && master.da > 0
        ? master.da
        : currentPay > 0
        ? Math.round(currentPay * 0.53)
        : defaultTemplate.da;

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

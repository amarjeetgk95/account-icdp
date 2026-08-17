import type { GTR30Employee, GTR30EmployeeMaster } from '../types';
import { createDefaultEmployee } from '../constants';

export interface Gtr30EmployeeTransformService {
  masterToBillEmployee(
    master: GTR30EmployeeMaster,
    srNo: number,
    base?: Partial<GTR30Employee>
  ): GTR30Employee;
}

export class Gtr30EmployeeTransformServiceImpl implements Gtr30EmployeeTransformService {
  masterToBillEmployee(
    master: GTR30EmployeeMaster,
    srNo: number,
    base?: Partial<GTR30Employee>
  ): GTR30Employee {
    const currentPay = master.currentPay || 0;
    const hra = Math.round(currentPay * (master.hraPercent || 0)) / 100;
    return {
      ...createDefaultEmployee(srNo),
      ...base,
      id: crypto.randomUUID(),
      srNo,
      name: master.name,
      designation: master.designation,
      payScale: master.payScale,
      payOfEstablishment: currentPay,
      hra,
      transportAllowance: master.transportAllowance || 0,
      medicalAllowance: master.medicalAllowance || 0,
      cla: master.claAllowance || 0,
    };
  }
}

export const gtr30EmployeeTransformService = new Gtr30EmployeeTransformServiceImpl();

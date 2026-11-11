import type { GTR30Employee, GTR30FormData } from '../types';
import { earningsTotal, deductionsTotal } from './gtr30Calc.service';
import { calculateDA, calculateNPS, DEFAULT_DA_PERCENT } from '../utils/gtr30GovRules';

/**
 * Batch operations service for GTR-30 module
 * Provides bulk operations for salary calculations, employee management, and form updates
 */
export interface BatchOperationResult {
  success: boolean;
  modifiedCount: number;
  errors?: string[];
  details?: any;
}

export interface BulkSalaryCalculationOptions {
  daRate?: number;
  forceRecalc?: boolean;
  calculateNps?: boolean;
}

class Gtr30BatchOperationsService {
  /**
   * Apply batch salary calculations to all employees
   */
  bulkCalculateSalaries(
    data: GTR30FormData,
    opts: BulkSalaryCalculationOptions = {}
  ): BatchOperationResult {
    const { daRate, forceRecalc, calculateNps = true } = opts;
    const effectiveDaRate = daRate ?? DEFAULT_DA_PERCENT;
    const modifiedEmployees: number[] = [];

    const newEmployees = data.employees.map((emp, index) => {
      const pay = Number(emp.payOfEstablishment || emp.payOfOfficer || 0);
      if (pay === 0) return emp;

      let da = emp.da;
      if (forceRecalc || emp.da === 0 || emp.da === null) {
        da = calculateDA(pay, effectiveDaRate);
        if (da !== emp.da) {
          modifiedEmployees.push(index);
        }
      }

      let nps = emp.npsPension;
      if (calculateNps && (forceRecalc || emp.npsPension === 0 || emp.npsPension === null)) {
        nps = calculateNPS(pay, da || 0);
        if (nps !== emp.npsPension) {
          modifiedEmployees.push(index);
        }
      }

      return { ...emp, da, npsPension: nps };
    });

    data.employees = newEmployees;

    return {
      success: true,
      modifiedCount: modifiedEmployees.length,
      details: { daRate: effectiveDaRate, modifiedIndices: modifiedEmployees },
    };
  }

  /**
   * Apply a formula to a specific field across all employees
   */
  bulkApplyFieldFormula(
    data: GTR30FormData,
    field: keyof GTR30Employee,
    formula: (value: number, employee: GTR30Employee, index: number) => number
  ): BatchOperationResult {
    const modifiedEmployees: number[] = [];

    const newEmployees = data.employees.map((emp, index) => {
      const currentValue = Number(emp[field] || 0);
      const newValue = formula(currentValue, emp, index);
      if (newValue !== currentValue) {
        modifiedEmployees.push(index);
      }
      return { ...emp, [field]: newValue };
    });

    data.employees = newEmployees;

    return {
      success: true,
      modifiedCount: modifiedEmployees.length,
      details: { field, modifiedIndices: modifiedEmployees },
    };
  }

  /**
   * Bulk update employee properties based on a mapping function
   */
  bulkUpdateEmployees(
    data: GTR30FormData,
    updateFn: (employee: GTR30Employee, index: number) => Partial<GTR30Employee> | null
  ): BatchOperationResult {
    const modifiedEmployees: number[] = [];
    const newEmployees: GTR30Employee[] = [];

    data.employees.forEach((emp, index) => {
      const updates = updateFn(emp, index);
      if (updates !== null) {
        newEmployees.push({ ...emp, ...updates });
        modifiedEmployees.push(index);
      } else {
        newEmployees.push(emp);
      }
    });

    return {
      success: true,
      modifiedCount: modifiedEmployees.length,
      details: { modifiedIndices: modifiedEmployees, newEmployeeCount: newEmployees.length },
    };
  }

  /**
   * Remove employees who have no pay (both payOfEstablishment and payOfOfficer are zero)
   */
  bulkRemoveZeroPayEmployees(data: GTR30FormData): BatchOperationResult {
    const zeroPayIndices: number[] = [];
    const newEmployees = data.employees.filter((emp, index) => {
      const hasPay = (Number(emp.payOfEstablishment || 0) > 0 || Number(emp.payOfOfficer || 0) > 0);
      if (!hasPay) {
        zeroPayIndices.push(index);
      }
      return hasPay;
    });

    // Renumber remaining employees
    const renumberedEmployees = newEmployees.map((emp, idx) => ({ ...emp, srNo: idx + 1 }));

    return {
      success: true,
      modifiedCount: zeroPayIndices.length,
      details: {
        removedCount: zeroPayIndices.length,
        removedIndices: zeroPayIndices,
        remainingCount: renumberedEmployees.length,
      },
    };
  }

  /**
   * Sort employees by a specific field
   */
  bulkSortEmployees(
    data: GTR30FormData,
    field: keyof GTR30Employee,
    direction: 'asc' | 'desc' = 'asc'
  ): BatchOperationResult {
    const sorted = [...data.employees].sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      // Handle different types
      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = (valB as string).toLowerCase();
      } else {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      let cmp = 0;
      if (valA < valB) cmp = -1;
      else if (valA > valB) cmp = 1;

      return direction === 'asc' ? cmp : -cmp;
    });

    // Renumber after sorting
    const renumbered = sorted.map((emp, idx) => ({ ...emp, srNo: idx + 1 }));
    data.employees = renumbered;

    return {
      success: true,
      modifiedCount: data.employees.length,
      details: {
        field,
        direction,
        sortedIndices: sorted.map((emp) => data.employees.findIndex((e) => e.id === emp.id)),
      },
    };
  }

  /**
   * Duplicate selected employees
   */
  bulkDuplicateEmployees(
    data: GTR30FormData,
    indices: number[]
  ): BatchOperationResult {
    const duplicates: GTR30Employee[] = [];
    indices.forEach((idx) => {
      if (idx >= 0 && idx < data.employees.length) {
        const original = data.employees[idx];
        const duplicate = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name || 'Employee'} (Copy)`,
          ppaNo: '',
        } as GTR30Employee;
        duplicates.push(duplicate);
      }
    });

    const newEmployees = [...data.employees, ...duplicates];
    // Renumber all employees
    const renumbered = newEmployees.map((emp, idx) => ({ ...emp, srNo: idx + 1 }));
    data.employees = renumbered;

    return {
      success: true,
      modifiedCount: duplicates.length,
      details: {
        duplicatedCount: duplicates.length,
        newTotalEmployees: renumbered.length,
      },
    };
  }

  /**
   * Merge employees from another bill into current bill
   */
  bulkMergeEmployees(
    data: GTR30FormData,
    sourceEmployees: GTR30Employee[],
    opts?: { skipExisting?: boolean; overwrite?: boolean }
  ): BatchOperationResult {
    const { skipExisting = false, overwrite = false } = opts || {};
    const existingIds = new Set(data.employees.map((e) => e.id));
    const merged: GTR30Employee[] = [...data.employees];

    sourceEmployees.forEach((sourceEmp) => {
      if (existingIds.has(sourceEmp.id)) {
        if (skipExisting) return;
        if (overwrite) {
          const idx = merged.findIndex((e) => e.id === sourceEmp.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...sourceEmp, srNo: merged[idx].srNo };
          }
        }
      } else {
        merged.push({ ...sourceEmp, id: crypto.randomUUID() });
      }
    });

    // Renumber
    const renumbered = merged.map((emp, idx) => ({ ...emp, srNo: idx + 1 }));
    data.employees = renumbered;

    return {
      success: true,
      modifiedCount: merged.length - existingIds.size,
      details: { newTotalEmployees: renumbered.length, operation: 'merge' },
    };
  }

  /**
   * Export employees as CSV-compatible data
   */
  bulkExportEmployees(data: GTR30FormData): {
    headers: string[];
    rows: any[][];
  } {
    const headers = [
      'srNo',
      'name',
      'hrpnNo',
      'designation',
      'designationGujarati',
      'cadreClass',
      'payScale',
      'gradePay',
      'payOfEstablishment',
      'payOfOfficer',
      'da',
      'hra',
      'transportAllowance',
      'medicalAllowance',
      'cla',
      'professionalTax',
      'npsPension',
      'rentOfBuilding',
      'gis1981Insurance',
      'gis1981Savings',
      'societyDeduction',
    ];

    const rows = data.employees.map((emp) => headers.map((header) => emp[header as keyof GTR30Employee]));

    return { headers, rows };
  }

  /**
   * Import employees from CSV-compatible data
   * Note: This is a simplified importer - full CSV parsing should be done externally
   */
  bulkImportEmployees(
    data: GTR30FormData,
    importedRows: any[][],
    headerMapping?: Record<string, number>
  ): BatchOperationResult {
    const importedEmployees: GTR30Employee[] = [];

    // Default header mapping if not provided
    const mapping = headerMapping || {
      name: 0,
      hrpnNo: 1,
      designation: 2,
      payOfEstablishment: 8,
      da: 10,
      cadreClass: 5,
    };

    importedRows.forEach((row, idx) => {
      const employee: Partial<GTR30Employee> = {
        id: crypto.randomUUID(),
        srNo: idx + 1,
        name: String(row[mapping.name] || ''),
        hrpnNo: String(row[mapping.hrpnNo] || ''),
        designation: String(row[mapping.designation] || ''),
        payOfEstablishment: Number(row[mapping.payOfEstablishment] || 0),
        da: Number(row[mapping.da] || 0),
        cadreClass: String(row[mapping.cadreClass] || '3'),
      };
      importedEmployees.push(employee as GTR30Employee);
    });

    const newEmployees = [...data.employees, ...importedEmployees];
    const renumbered = newEmployees.map((emp, idx) => ({ ...emp, srNo: idx + 1 }));

    return {
      success: true,
      modifiedCount: importedEmployees.length,
      details: { importedCount: importedEmployees.length, newTotalEmployees: renumbered.length },
    };
  }

  /**
   * Calculate batch totals for multiple bills
   */
  batchCalculateTotals(bills: GTR30FormData[]): {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalEmployees: number;
    billCount: number;
  } {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployees = 0;

    bills.forEach((bill) => {
      bill.employees.forEach((emp) => {
        const earnings = earningsTotal(emp);
        const deductions = deductionsTotal(emp);
        totalGross += earnings;
        totalDeductions += deductions;
        totalNet += earnings - deductions;
      });
      totalEmployees += bill.employees.length;
    });

    return {
      totalGross,
      totalDeductions,
      totalNet,
      totalEmployees,
      billCount: bills.length,
    };
  }

  /**
   * Apply DA rate based on pay level (higher pay = higher DA)
   */
  bulkApplyPayLevelBasedDA(
    data: GTR30FormData,
    baseRate: number
  ): BatchOperationResult {
    const modifiedEmployees: number[] = [];

    const newEmployees = data.employees.map((emp, index) => {
      const pay = Number(emp.payOfEstablishment || emp.payOfOfficer || 0);
      if (pay === 0) return emp;

      // Calculate DA based on pay level (simplified tiered approach)
      let daRate = baseRate;
      if (pay >= 100000) daRate = baseRate + 2;
      else if (pay >= 75000) daRate = baseRate + 1.5;
      else if (pay >= 50000) daRate = baseRate + 1;
      else if (pay >= 25000) daRate = baseRate + 0.5;

      const da = calculateDA(pay, daRate);
      if (da !== emp.da) {
        modifiedEmployees.push(index);
      }

      return { ...emp, da };
    });

    data.employees = newEmployees;

    return {
      success: true,
      modifiedCount: modifiedEmployees.length,
      details: {
        baseRate,
        modifiedIndices: modifiedEmployees,
        tieredDA: true,
      },
    };
  }

  /**
   * Validate batch employee data
   */
  bulkValidateEmployees(data: GTR30FormData): {
    isValid: boolean;
    errors: {
      rowIndex: number;
      field: string;
      message: string;
    }[];
  } {
    const errors: { rowIndex: number; field: string; message: string }[] = [];

    data.employees.forEach((emp, index) => {
      if (!emp.name || emp.name.trim() === '') {
        errors.push({ rowIndex: index, field: 'name', message: 'Employee name is required' });
      }
      if ((Number(emp.payOfEstablishment || 0) + Number(emp.payOfOfficer || 0)) === 0) {
        errors.push({ rowIndex: index, field: 'pay', message: 'At least one pay field must be non-zero' });
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}

export const gtr30BatchOperationsService = new Gtr30BatchOperationsService();

import type { GTR30Employee, GTR30FormData } from '../types';
import { earningsTotal, deductionsTotal, billTotals } from '../services/gtr30Calc.service';

/**
 * Real-time validation utilities for GTR-30 module
 * Provides immediate feedback for data entry and calculations
 */

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  elementId?: string;
  severity: 1 | 2 | 3;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  totalIssues: number;
  byType: {
    error: number;
    warning: number;
    info: number;
  };
  bySeverity: {
    critical: number;
    moderate: number;
    minor: number;
  };
}

export interface ValidationOptions {
  checkPayLevels?: boolean;
  checkInsuranceGroups?: boolean;
  checkDAcalculation?: boolean;
  checkNPScalculation?: boolean;
  checkDeductions?: boolean;
}

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  checkPayLevels: true,
  checkInsuranceGroups: true,
  checkDAcalculation: true,
  checkNPScalculation: true,
  checkDeductions: true,
};

/**
 * Validate a single employee
 */
export function validateEmployee(
  employee: GTR30Employee,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ID check
  if (!employee.id || employee.id.trim() === '') {
    issues.push({
      id: `emp-${employee.id || 'new'}-id`,
      type: 'error',
      field: 'id',
      message: 'Employee ID is required',
      severity: 1,
    });
  }

  // Name check
  if (!employee.name || employee.name.trim() === '') {
    issues.push({
      id: `emp-${employee.id || 'new'}-name`,
      type: 'error',
      field: 'name',
      message: 'Employee name is required',
      severity: 1,
    });
  }

  // Pay check - at least one pay field must be non-zero
  const hasPay =
    (employee.payOfEstablishment || 0) > 0 || (employee.payOfOfficer || 0) > 0;
  if (!hasPay) {
    issues.push({
      id: `emp-${employee.id || 'new'}-pay`,
      type: 'error',
      field: 'pay',
      message: 'At least one pay field must be non-zero',
      severity: 1,
    });
  }

  // Pay level validation
  if (options.checkPayLevels && employee.payOfEstablishment > 0) {
    const pay = employee.payOfEstablishment;
    // Suggest pay level based on pay amount (simplified logic)
    if (pay >= 50000) {
      issues.push({
        id: `emp-${employee.id || 'new'}-pay-level-suggestion`,
        type: 'info',
        field: 'payLevelCell',
        message: `Pay level suggestion: Consider LEVEL-8 for ₹${pay.toLocaleString()}`,
        severity: 3,
      });
    } else if (pay >= 25000) {
      issues.push({
        id: `emp-${employee.id || 'new'}-pay-level-suggestion`,
        type: 'info',
        field: 'payLevelCell',
        message: `Pay level suggestion: Consider LEVEL-6 for ₹${pay.toLocaleString()}`,
        severity: 3,
      });
    }
  }

  // Insurance group validation
  if (options.checkInsuranceGroups) {
    const validGroups = ['ક', 'ખ', 'ગ', 'ઘ', 'A', 'B', 'C', 'D', ''];
    if (employee.insuranceGroup && !validGroups.includes(employee.insuranceGroup)) {
      issues.push({
        id: `emp-${employee.id || 'new'}-insurance-group`,
        type: 'error',
        field: 'insuranceGroup',
        message: `Invalid insurance group: ${employee.insuranceGroup}`,
        severity: 1,
      });
    }
  }

  // DA calculation validation
  if (options.checkDAcalculation && employee.payOfEstablishment > 0) {
    const pay = employee.payOfEstablishment;
    const daRate = 53; // Default DA rate
    const expectedDA = Math.round(pay * (daRate / 100));
    const actualDA = employee.da || 0;

    // Check if DA is roughly correct (within 2% tolerance)
    if (Math.abs(actualDA - expectedDA) > expectedDA * 0.02 && actualDA === 0) {
      issues.push({
        id: `emp-${employee.id || 'new'}-da`,
        type: 'warning',
        field: 'da',
        message: `DA appears to be zero. Consider auto-calculation for ₹${pay.toLocaleString()} pay.`,
        severity: 2,
      });
    }
  }

  // NPS calculation validation
  if (options.checkNPScalculation && (employee.payOfEstablishment || 0) > 0) {
    const pay = employee.payOfEstablishment;
    const da = employee.da || 0;
    const expectedNPS = Math.round((pay + da) * 0.1);
    const actualNPS = employee.npsPension || 0;

    if (actualNPS === 0) {
      issues.push({
        id: `emp-${employee.id || 'new'}-nps`,
        type: 'warning',
        field: 'npsPension',
        message: 'NPS pension appears to be zero.',
        severity: 2,
      });
    } else if (Math.abs(actualNPS - expectedNPS) > expectedNPS * 0.05) {
      issues.push({
        id: `emp-${employee.id || 'new'}-nps`,
        type: 'info',
        field: 'npsPension',
        message: `NPS amount differs from calculated value. Current: ${actualNPS}, Calculated: ${expectedNPS}`,
        severity: 3,
      });
    }
  }

  // Deductions validation
  if (options.checkDeductions) {
    const gross = earningsTotal(employee);
    const deductions = deductionsTotal(employee);
    const net = gross - deductions;

    if (net < 0) {
      issues.push({
        id: `emp-${employee.id || 'new'}-negative-pay`,
        type: 'error',
        field: 'net',
        message: 'Net pay is negative. Review deductions.',
        severity: 1,
      });
    }
  }

  return issues;
}

/**
 * Validate entire bill form
 */
export function validateBill(
  data: GTR30FormData,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let isValid = true;

  // Bill-level validations
  if (!data.billRegisterNo || data.billRegisterNo.trim() === '') {
    issues.push({
      id: 'bill-register-no',
      type: 'error',
      field: 'billRegisterNo',
      message: 'Bill Register Number is required',
      severity: 1,
    });
    isValid = false;
  }

  if (!data.monthOf || data.monthOf.trim() === '') {
    issues.push({
      id: 'bill-month',
      type: 'error',
      field: 'monthOf',
      message: 'Month is required',
      severity: 1,
    });
    isValid = false;
  }

  if (!data.officeName || data.officeName.trim() === '') {
    issues.push({
      id: 'bill-office',
      type: 'error',
      field: 'officeName',
      message: 'Office Name is required',
      severity: 1,
    });
    isValid = false;
  }

  // Employee validations
  if (data.employees.length === 0) {
    issues.push({
      id: 'bill-no-employees',
      type: 'error',
      field: 'employees',
      message: 'At least one employee is required',
      severity: 1,
    });
    isValid = false;
  }

  data.employees.forEach((emp) => {
    const empIssues = validateEmployee(emp, options);
    issues.push(...empIssues);
    if (empIssues.some((i) => i.type === 'error')) {
      isValid = false;
    }
  });

  // Totals validation
  const totals = billTotals(data);
  if (totals.gross === 0) {
    issues.push({
      id: 'bill-zero-gross',
      type: 'info',
      field: 'grossTotal',
      message: 'Total gross pay is zero. Verify employee pay entries.',
      severity: 3,
    });
  }

  return {
    isValid,
    issues,
    totalIssues: issues.length,
    byType: {
      error: issues.filter((i) => i.type === 'error').length,
      warning: issues.filter((i) => i.type === 'warning').length,
      info: issues.filter((i) => i.type === 'info').length,
    },
    bySeverity: {
      critical: issues.filter((i) => i.severity === 1).length,
      moderate: issues.filter((i) => i.severity === 2).length,
      minor: issues.filter((i) => i.severity === 3).length,
    },
  };
}

/**
 * Debounce helper for validation
 */
export function createDebouncedValidator<T extends (...args: any[]) => ValidationResult>(
  validateFn: T,
  delay: number = 500
): {
  validate: (...args: Parameters<T>) => ValidationResult;
  clear: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    validate: (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        validateFn(...args);
      }, delay);
      return validateFn(...args);
    },
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    },
  };
}

/**
 * Real-time validation hook for React components
 */
export function useRealtimeValidation(
  data: GTR30FormData,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
) {
  // This would be implemented as a React hook
  // For now, just return the validation result
  return validateBill(data, options);
}

/**
 * Get validation status badge color
 */
export function getValidationStatusColor(issues: ValidationIssue[]): {
  color: string;
  label: string;
} {
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;

  if (errorCount > 0) {
    return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Has Errors' };
  }
  if (warningCount > 0) {
    return { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', label: 'Has Warnings' };
  }
  return { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', label: 'Valid' };
}

/**
 * Sort issues by severity
 */
export function sortIssuesBySeverity(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => b.severity - a.severity);
}

/**
 * Group issues by category
 */
export function groupIssuesByCategory(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
  const groups: Record<string, ValidationIssue[]> = {};
  issues.forEach((issue) => {
    const category = issue.field.split('.')[0] || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(issue);
  });
  return groups;
}

/**
 * Clear validation issues for a specific field
 */
export function clearFieldIssues(issues: ValidationIssue[], field: string): ValidationIssue[] {
  return issues.filter((i) => i.field !== field);
}

/**
 * Clear all validation issues
 */
export function clearAllIssues(): ValidationIssue[] {
  return [];
}

/**
 * Merge validation issues from multiple sources
 */
export function mergeValidationIssues(...issueArrays: ValidationIssue[][]): ValidationIssue[] {
  const allIssues: ValidationIssue[] = [];
  const seen = new Set<string>();

  issueArrays.forEach((issues) => {
    issues.forEach((issue) => {
      if (!seen.has(issue.id)) {
        seen.add(issue.id);
        allIssues.push(issue);
      }
    });
  });

  return allIssues;
}

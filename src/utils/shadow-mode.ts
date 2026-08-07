/**
 * Shadow Mode Validation Utilities
 * 
 * Compare outputs between legacy (vanilla JS) and modern (React) implementations
 * to ensure data integrity during migration.
 */

export interface ValidationResult {
  module: string;
  operation: string;
  passed: boolean;
  legacyOutput?: unknown;
  modernOutput?: unknown;
  differences?: string[];
  timestamp: string;
}

export interface ValidationReport {
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

/**
 * Compare two objects deeply and return differences
 */
export function deepCompare(obj1: unknown, obj2: unknown, path = ''): string[] {
  const differences: string[] = [];

  if (typeof obj1 !== typeof obj2) {
    differences.push(`${path}: type mismatch (${typeof obj1} vs ${typeof obj2})`);
    return differences;
  }

  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      differences.push(`${path}: null mismatch (${obj1} vs ${obj2})`);
    }
    return differences;
  }

  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      differences.push(`${path}: value mismatch (${obj1} vs ${obj2})`);
    }
    return differences;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      differences.push(`${path}: array length mismatch (${obj1.length} vs ${obj2.length})`);
    }
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      differences.push(...deepCompare(obj1[i], obj2[i], `${path}[${i}]`));
    }
    return differences;
  }

  const keys1 = Object.keys(obj1 as object);
  const keys2 = Object.keys(obj2 as object);
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in (obj1 as object))) {
      differences.push(`${newPath}: missing in legacy`);
    } else if (!(key in (obj2 as object))) {
      differences.push(`${newPath}: missing in modern`);
    } else {
      differences.push(
        ...deepCompare(
          (obj1 as Record<string, unknown>)[key],
          (obj2 as Record<string, unknown>)[key],
          newPath
        )
      );
    }
  }

  return differences;
}

/**
 * Validate a single operation
 */
export function validateOperation(
  module: string,
  operation: string,
  legacyOutput: unknown,
  modernOutput: unknown
): ValidationResult {
  const differences = deepCompare(legacyOutput, modernOutput);
  return {
    module,
    operation,
    passed: differences.length === 0,
    legacyOutput,
    modernOutput,
    differences: differences.length > 0 ? differences : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate validation report
 */
export function generateReport(results: ValidationResult[]): ValidationReport {
  const passed = results.filter((r) => r.passed).length;
  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
    },
  };
}

/**
 * Format report for display
 */
export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push('=== Shadow Mode Validation Report ===');
  lines.push(`Total: ${report.summary.total}`);
  lines.push(`Passed: ${report.summary.passed}`);
  lines.push(`Failed: ${report.summary.failed}`);
  lines.push(`Pass Rate: ${report.summary.passRate.toFixed(1)}%`);
  lines.push('');

  for (const result of report.results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    lines.push(`${status} | ${result.module}.${result.operation}`);
    if (result.differences) {
      for (const diff of result.differences) {
        lines.push(`  - ${diff}`);
      }
    }
  }

  return lines.join('\n');
}

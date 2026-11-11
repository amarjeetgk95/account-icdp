/**
 * Single-Office Utility for ICDP Surat
 * Single-office mode: no office switching. All data is global.
 * Kept as a thin shim so existing imports keep working; new code should not use office scoping.
 */

export const DEFAULT_OFFICE_ID = '1';

export interface OfficeScope {
  all: boolean;
  officeId: string;
}

export function getOfficeId(): string {
  return DEFAULT_OFFICE_ID;
}

export function isAllOfficesMode(): boolean {
  return false;
}

/**
 * Single-office: always global scope.
 */
export function getOfficeScope(): OfficeScope {
  return { all: true, officeId: DEFAULT_OFFICE_ID };
}

export function requireOfficeId(): string {
  return DEFAULT_OFFICE_ID;
}

/**
 * Branded types for enhanced type safety in GTR-30 module
 * These provide compile-time guarantees about specific value constraints
 */

/**
 * Branded type for GTR-30 Bill Register Number
 * Format: GTR-30-YYYY-MM-#### (e.g., GTR-30-2026-0001)
 */
export type BillRegisterNumber = string & { __brand: 'BillRegisterNumber' };

/**
 * Branded type for GTR-30 Month Key
 * Format: "Month-Year" (e.g., "April-2026", "March-2026")
 */
export type MonthKey = string & { __brand: 'MonthKey' };

/**
 * Branded type for GTR-30 Bill Code
 * Format: GTR-30-{CATEGORY}-{TYPE} (e.g., GTR-30-GO-STATS)
 */
export type BillCode = string & { __brand: 'BillCode' };

/**
 * Branded type for HRPN (Hastakshar Person Number)
 * Format: Numeric string, 10-12 digits
 */
export type HRPN = string & { __brand: 'HRPN' };

/**
 * Branded type for Pay Amount (in Rupees)
 * Must be non-negative integer
 */
export type PayAmount = number & { __brand: 'PayAmount' };

/**
 * Branded type for Percentage (0-100)
 */
export type Percentage = number & { __brand: 'Percentage' };

/**
 * Branded type for GTR-30 Employee ID
 * UUID format
 */
export type EmployeeId = string & { __brand: 'EmployeeId' };

/**
 * Branded type for GTR-30 Bill ID
 * UUID format
 */
export type BillId = string & { __brand: 'BillId' };

/**
 * Branded type for GTR-30 Master ID
 * UUID format
 */
export type MasterId = string & { __brand: 'MasterId' };

/**
 * Branded type for Post ID
 * UUID format
 */
export type PostId = string & { __brand: 'PostId' };

/**
 * Branded type for GTR-30 Insurance Group
 * Valid values: 'ક', 'ખ', 'ગ', 'ઘ', 'A', 'B', 'C', 'D', ''
 */
export type InsuranceGroup = string & { __brand: 'InsuranceGroup' };

/**
 * Branded type for GTR-30 CADRE CLASS
 * Valid values: '૧', '૨', '૩', '૪'
 */
export type CadreClass = string & { __brand: 'CadreClass' };

/**
 * Branded type for GTR-30 Bill Status
 * Valid values: 'draft', 'submitted', 'passed', 'rejected'
 */
export type BillStatus = string & { __brand: 'BillStatus' };

/**
 * Branded type for Budget Year
 * Format: YYYY-YY (e.g., "2026-27")
 */
export type BudgetYear = string & { __brand: 'BudgetYear' };

/**
 * Branded type for Financial Year
 * Format: YYYY (e.g., 2026)
 */
export type FinancialYear = number & { __brand: 'FinancialYear' };

/**
 * Branded type for DA Rate
 * Valid range: 0-100
 */
export type DARate = Percentage;

/**
 * Branded type for NPS Rate
 * Valid range: 0-100
 */
export type NPSPensionRate = Percentage;

/**
 * Branded type for HRA Percentage
 * Valid range: 0-50
 */
export type HRAPercentage = number & { __brand: 'HRAPercentage' };

/**
 * Branded type for Budget Head
 * Format: 13-digit numeric string
 */
export type BudgetHead = string & { __brand: 'BudgetHead' };

/**
 * Branded type for Controlling Officer Code
 * Format: 4-digit numeric string
 */
export type ControllingOfficerCode = string & { __brand: 'ControllingOfficerCode' };

/**
 * Branded type for Drawing Officer Code
 * Format: 3-digit numeric string
 */
export type DrawingOfficerCode = string & { __brand: 'DrawingOfficerCode' };

/**
 * Branded type for Demand Number
 * Format: 3-digit numeric string
 */
export type DemandNumber = string & { __brand: 'DemandNumber' };

/**
 * Branded type for Scheme Number
 * Format: 7-digit numeric string
 */
export type SchemeNumber = string & { __brand: 'SchemeNumber' };

/**
 * Branded type for DDO Code
 * Format: 4-6 character alphanumeric
 */
export type DDOCode = string & { __brand: 'DDOCode' };

/**
 * Branded type for Cardex Number
 */
export type CardexNumber = string & { __brand: 'CardexNumber' };

/**
 * Branded type for Phone Number (Indian format)
 */
export type PhoneNumber = string & { __brand: 'PhoneNumber' };

/**
 * Branded type for Email (Gujarat government domain)
 */
export type GovernmentEmail = string & { __brand: 'GovernmentEmail' };

/**
 * Branded type for PPA Number
 */
export type PPANumber = string & { __brand: 'PPANumber' };

/**
 * Branded type for File Size (in bytes)
 */
export type FileSize = number & { __brand: 'FileSize' };

/**
 * Branded type for Page Number
 */
export type PageNumber = number & { __brand: 'PageNumber' };

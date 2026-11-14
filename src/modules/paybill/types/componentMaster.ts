/**
 * Payroll Component Master types.
 *
 * The component master is the single authoritative definition of every earning /
 * deduction component the application recognizes. The PDF parser matches detected
 * table headers against this master so new payroll components can be introduced
 * through configuration instead of parser code changes.
 */

export type PayrollComponentType = 'EARNING' | 'DEDUCTION';

/** Semantic kind of a component. TOTAL / NET_PAY fields are calculated summary columns. */
export type PayrollComponentKind = 'COMPONENT' | 'TOTAL' | 'NET_PAY';

export interface PayrollComponentValidationRule {
  type:
    | 'NON_NEGATIVE'
    | 'INTEGER'
    | 'DECIMAL'
    | 'MAX_VALUE'
    | 'MIN_VALUE'
    | 'PERCENTAGE';
  max?: number;
  min?: number;
}

export interface PayrollComponent {
  id: string;
  componentCode: string | null;
  componentName: string;
  shortName?: string | null;
  type: PayrollComponentType;
  kind: PayrollComponentKind;
  category?: string | null;
  subCategory?: string | null;
  active: boolean;
  displayOrder: number;
  pdfHeaderAliases: string[];
  pdfCodeAliases: string[];
  isMandatory: boolean;
  isTotalField: boolean;
  isSystemGenerated: boolean;
  validationRule?: PayrollComponentValidationRule | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollComponentAlias {
  id: string;
  componentId: string;
  aliasText: string;
  aliasType: 'HEADER' | 'CODE';
  createdAt: string;
}

/**
 * A single component value extracted from a pay bill for one employee.
 * componentName is a snapshot so future master renames never change historical reports.
 */
export interface PayBillEmployeeComponent {
  componentId?: string;
  componentCode: string | null;
  componentName: string;
  type?: PayrollComponentType | 'TOTAL' | 'NET_PAY';
  amount: number;
  isTotalField?: boolean;
}

export type ComponentMatchMethod =
  | 'CODE'
  | 'NAME'
  | 'ALIAS'
  | 'NORMALIZED'
  | 'FUZZY'
  | 'UNKNOWN';

/**
 * Result of matching a detected PDF header fragment against the component master.
 * confidence is 0..1; UNKNOWN matches always have confidence 0.
 */
export interface ComponentMatchResult {
  detectedText: string;
  detectedCode?: string;
  component?: PayrollComponent;
  matchedComponentId?: string;
  matchMethod: ComponentMatchMethod;
  confidence: number;
}

/** A component column detected in the PDF table header, in PDF (left-to-right) order. */
export interface DetectedComponentInfo {
  componentId?: string;
  componentCode: string | null;
  componentName: string;
  shortName?: string | null;
  type: PayrollComponentType | 'TOTAL' | 'NET_PAY';
  kind: PayrollComponentKind;
  detectedText: string;
  detectedCode?: string;
  matchMethod: ComponentMatchMethod;
  confidence: number;
  order: number;
  isTotalField: boolean;
}
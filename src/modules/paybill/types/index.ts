import type { PayBillEmployeeComponent, DetectedComponentInfo } from './componentMaster';

export * from './componentMaster';

export type PayBillSheetType = 'EARNING' | 'DEDUCTION' | 'COMBINED';

export interface PayBillParameterMatrixRow {
  key: string;
  parameter: string;
  months: {
    April: number;
    May: number;
    June: number;
    July: number;
    August: number;
    September: number;
    October: number;
    November: number;
    December: number;
    January: number;
    February: number;
    March: number;
    [key: string]: number;
  };
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

export interface PayBillAllowanceMatrixReport {
  financialYear: number;
  hrpn?: string | null;
  employeeName?: string | null;
  monthLabels: string[];
  rows: PayBillParameterMatrixRow[];
  totalGross: number;
}

export interface PayBillMonthlyMatrixColumn {
  key: string;
  label: string;
  group: 'EARNING' | 'DEDUCTION';
}

export interface PayBillMonthlyEmployeeMatrixRow {
  hrpn: string;
  employeeName: string;
  designation: string | null;
  values: Record<string, number>;
}

export interface PayBillMonthlyEmployeeMatrixReport {
  month: string;
  financialYear: number;
  columns: PayBillMonthlyMatrixColumn[];
  rows: PayBillMonthlyEmployeeMatrixRow[];
  totals: Record<string, number>;
}

export interface PayBillBatchMatrixMonth {
  monthLabel: string;
  month: string;
  financialYear: number;
  rows: PayBillMonthlyEmployeeMatrixRow[];
  totals: Record<string, number>;
}

export interface PayBillBatchMatrix {
  months: PayBillBatchMatrixMonth[];
  totalEmployees: number;
  totalFiles: number;
}

export interface PayBillMetadata {
  month: string;
  ddoHrpn: string;
  ddoName: string;
  officeName: string;
  billNo: string;
  majorHead: string;
  ddoCode: string;
  department: string;
  tanNo: string;
  cardexNo: string;
  address: string;
  mobileNo: string;
  ministry?: string;
  email?: string;
  phone?: string;
  taluka?: string;
  generatedDate?: string;
  billCode?: string;
  rawHeaderDump?: string;
}

export interface PayBillEmployeeRow {
  srNo?: number;
  hrpn: string;
  employeeName: string;
  designation: string;
  payScale: string;
  ph: string;
  slo: string;
  basicPay: number;
  da: number;
  hra: number;
  cla: number;
  medicalAllowance: number;
  transportAllowance: number;
  specialPay?: number;
  washingAllowance?: number;
  nonPrivatePracticeAllowance: number;
  otherAllowance?: number;
  grossAmount: number;
  /** Dynamic per-component values in PDF column order (future-proof storage). */
  components?: PayBillEmployeeComponent[];
}

export interface PayBillTotalRow {
  basicPay: number;
  da: number;
  hra: number;
  cla: number;
  medicalAllowance: number;
  transportAllowance: number;
  specialPay?: number;
  washingAllowance?: number;
  nonPrivatePracticeAllowance: number;
  otherAllowance?: number;
  grossAmount: number;
}

export type MappingStatus = 'MATCHED' | 'NOT_FOUND' | 'DUPLICATE' | 'INVALID_HRPN';

export type ValidationStatus = 'VALID' | 'WARNING' | 'ERROR';

export interface MasterEmployeeInfo {
  id: string;
  name: string;
  pan?: string;
  hprnNo?: string | null;
  officeId?: string;
  designation?: string;
  budgetHeadId?: string | null;
}

export interface PayBillExtractedRecord {
  id: string;
  row: PayBillEmployeeRow;
  mappingStatus: MappingStatus;
  mappingMessage?: string;
  matchedEmployee?: MasterEmployeeInfo | null;
  nameMismatch?: boolean;
  validationStatus: ValidationStatus;
  errors: string[];
  warnings: string[];
  normalizedString: string; // e.g. HRPN=20014113|NAME=...|BASIC=...|...
}

export interface ReconciliationItem {
  key: keyof PayBillTotalRow;
  label: string;
  pdfTotal: number;
  calculatedTotal: number;
  diff: number;
  isMatched: boolean;
}

export interface PayBillReconciliation {
  isGrossMatched: boolean;
  isAllMatched: boolean;
  pdfGross: number;
  calculatedGross: number;
  diff: number;
  status: 'MATCHED' | 'MISMATCH';
  message: string;
  items: ReconciliationItem[];
}

export type ProcessingStage =
  | 'IDLE'
  | 'UPLOADED'
  | 'READING'
  | 'DETECTING_TABLE'
  | 'EXTRACTING_HRPN'
  | 'MAPPING_EMPLOYEES'
  | 'VALIDATING_DATA'
  | 'READY'
  | 'ERROR';

export interface PayBillProcessingState {
  stage: ProcessingStage;
  stageName: string;
  progress: number; // 0 to 100
  details?: string;
  error?: string | null;
}

export interface PayBillImportSummary {
  totalRecords: number;
  matchedCount: number;
  notFoundCount: number;
  duplicateCount: number;
  invalidHrpnCount: number;
  errorCount: number;
  warningCount: number;
  readyCount: number;
  reconciliationStatus: 'MATCHED' | 'MISMATCH';
  pdfGrossTotal: number;
  calculatedGrossTotal: number;
}

export interface PayBillParsedResult {
  sheetType: PayBillSheetType;
  metadata: PayBillMetadata;
  rows: PayBillEmployeeRow[];
  pdfTotals: PayBillTotalRow | null;
  deductionRows?: PayBillDeductionRow[];
  pdfDeductionTotals?: PayBillDeductionTotalRow | null;
  rawText: string;
  pageCount: number;
  parsingWarnings: string[];
  detection?: PayBillDetectionInfo;
  /** Component columns detected in the PDF header, in PDF (left-to-right) order. */
  detectedComponents?: DetectedComponentInfo[];
}

export interface PayBillImportResult {
  importId: string;
  billNo: string;
  month: string;
  financialYear: number;
  sheetType?: PayBillSheetType;
  totalRecords: number;
  matchedCount: number;
  notFoundCount: number;
  appliedToPayrollGrid: number;
  createdAt: string;
}

export interface PayBillStoredImport {
  id: string;
  officeId: string;
  billNo: string;
  month: string;
  financialYear: number;
  sheetType?: PayBillSheetType;
  ddoHrpn: string | null;
  ddoName: string | null;
  majorHead: string | null;
  ddoCode: string | null;
  department: string | null;
  officeName: string | null;
  tanNo: string | null;
  cardexNo: string | null;
  totalRecords: number;
  matchedCount: number;
  grossTotal: number;
  totalDeductions?: number;
  netPayTotal?: number;
  uploadedFile: string | null;
  createdAt: string;
}

export interface PayBillValidationFlags {
  hrpnMatch: boolean;
  nameMatch: boolean;
  designationMatch: boolean;
  columnMappingValid: boolean;
  grossValidation: boolean;
  totalReconciled: boolean;
}

export interface PayBillStoredEarning {
  id: string;
  importId: string;
  officeId: string;
  employeeId: string | null;
  hrpn: string;
  employeeName: string;
  designation: string | null;
  payScale: string | null;
  ph: string | null;
  slo: string | null;
  month: string;
  financialYear: number;
  basicPay: number;
  da: number;
  hra: number;
  cla: number;
  medicalAllowance: number;
  transportAllowance: number;
  specialPay?: number;
  washingAllowance?: number;
  nppAllowance: number;
  otherAllowance?: number;
  grossAmount: number;
  mappingStatus: MappingStatus;
  validationStatus?: ValidationStatus;
  mappingMessage?: string | null;
  nameMismatch?: boolean;
  errors?: string[];
  warnings?: string[];
  validationFlags?: PayBillValidationFlags;
  createdAt: string;
}

export interface PayBillStoredDeduction {
  id: string;
  importId: string;
  officeId: string;
  employeeId: string | null;
  hrpn: string;
  employeeName: string;
  designation: string | null;
  month: string;
  financialYear: number;
  incomeTax: number; // 9510
  profTax: number; // 9570
  hbaInterest: number; // 9591
  gpfRegular: number; // 9670
  gpfClass4: number; // 9531
  npsRegular: number; // 9534
  gisGovtFund: number; // 9581
  gisGovtSaving: number; // 9582
  otherDeductions?: number;
  totalDeductions: number;
  netPay: number;
  mappingStatus: MappingStatus;
  validationStatus?: ValidationStatus;
  mappingMessage?: string | null;
  nameMismatch?: boolean;
  errors?: string[];
  warnings?: string[];
  validationFlags?: PayBillValidationFlags;
  createdAt: string;
}

export interface PayBillDeductionRow {
  srNo?: number;
  hrpn: string;
  employeeName: string;
  designation: string;
  incomeTax: number; // 9510
  profTax: number; // 9570
  hbaInterest: number; // 9591
  gpfRegular: number; // 9670
  gpfClass4: number; // 9531
  npsRegular: number; // 9534
  gisGovtFund: number; // 9581
  gisGovtSaving: number; // 9582
  otherDeductions?: number;
  totalDeductions: number;
  netPay: number;
  /** Dynamic per-component values in PDF column order (future-proof storage). */
  components?: PayBillEmployeeComponent[];
}

export interface PayBillDeductionTotalRow {
  incomeTax: number;
  profTax: number;
  hbaInterest: number;
  gpfRegular: number;
  gpfClass4: number;
  npsRegular: number;
  gisGovtFund: number;
  gisGovtSaving: number;
  otherDeductions?: number;
  totalDeductions: number;
  netPay: number;
}

export interface PayBillDeductionExtractedRecord {
  id: string;
  row: PayBillDeductionRow;
  mappingStatus: MappingStatus;
  mappingMessage?: string;
  matchedEmployee?: MasterEmployeeInfo | null;
  nameMismatch?: boolean;
  validationStatus: ValidationStatus;
  errors: string[];
  warnings: string[];
  normalizedString: string;
}

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'PENDING' | 'PARSING' | 'SUCCESS' | 'ERROR';
  month?: string;
  billNo?: string;
  sheetType?: PayBillSheetType;
  parsedResult?: PayBillParsedResult;
  recordCount?: number;
  grossTotal?: number;
  error?: string;
}

export type AuditAnomalyType =
  | 'DA_HIKE'
  | 'BASIC_INCREMENT'
  | 'OUTLIER_ALLOWANCE'
  | 'NET_MISMATCH'
  | 'NEW_EMPLOYEE'
  | 'PROMOTION';

export interface PayBillAuditAnomaly {
  id: string;
  hrpn: string;
  employeeName: string;
  type: AuditAnomalyType;
  severity: 'INFO' | 'WARNING' | 'ALERT';
  title: string;
  description: string;
  oldValue?: string | number;
  newValue?: string | number;
}

export interface PayBillAuditReport {
  month: string;
  daPercentage: number;
  previousDaPercentage?: number;
  isDaHiked: boolean;
  incrementCount: number;
  anomalies: PayBillAuditAnomaly[];
  healthyRecordCount: number;
}

export interface PostToLedgerPayload {
  month: string;
  financialYear: number;
  billNo: string;
  voucherDate: string;
  majorHead: string; // e.g. "2403-00-101-02-00"
  basicPayTotal: number; // 0101
  daTotal: number; // 0103
  hraTotal: number; // 0110
  claTotal: number; // 0111
  medTotal: number; // 0107
  transTotal: number; // 0113
  specialPayTotal: number; // 0101/0102
  washingTotal: number; // 0132
  nppTotal: number; // 0128
  grossTotal: number;
  gpfTotal?: number;
  npsTotal?: number;
  incomeTaxTotal?: number;
  ptTotal?: number;
  gisTotal?: number;
  netTotal?: number;
  remarks?: string;
}

export type PayBillSortField =
  | 'hrpn'
  | 'employeeName'
  | 'designation'
  | 'payScale'
  | 'basicPay'
  | 'da'
  | 'hra'
  | 'grossAmount'
  | 'month'
  | 'createdAt';

export type PayBillSortDirection = 'asc' | 'desc';

export interface PayBillDetectionInfo {
  confidence: number; // 0 to 100
  issues: string[];
}

export interface PayBillSettings {
  ddoHrpn?: string;
  ddoName?: string;
  officeName?: string;
  billNo?: string;
  majorHead?: string;
  ddoCode?: string;
  department?: string;
  tanNo?: string;
  cardexNo?: string;
  address?: string;
  mobileNo?: string;
  daRates: number[]; // DA percentage accepted for the current financial year
  daHikeThreshold: number; // DA % above which an ALERT is raised (default 50)
  basicPayChangeTolerance: number; // % basic-pay delta vs previous month that raises a WARNING (default 10)
  manualAllowances?: string[]; // custom allowance parameters entered manually in the employee ledger
  manualDeductions?: string[]; // custom deduction parameters entered manually in the employee ledger
  earningColumnOrder?: string[]; // display order of EARNING parameter keys (standard + `manual::label`); empty = default
  deductionColumnOrder?: string[]; // display order of DEDUCTION parameter keys (standard + `manual::label`); empty = default
}

export interface PayBillLedgerVoucher {
  id: string;
  voucherNo: string;
  billNo: string;
  month: string;
  financialYear: number;
  voucherDate: string;
  majorHead: string | null;
  grossTotal: number;
  status: string;
  createdAt: string;
}

export interface PayBillAuditConfig {
  daRates?: number[];
  daHikeThreshold?: number;
  basicPayChangeTolerance?: number;
  previousDaPercentage?: number;
  previousMonthRecords?: Array<{
    hrpn: string;
    basicPay: number;
    da: number;
    grossAmount: number;
    month: string;
  }>;
}

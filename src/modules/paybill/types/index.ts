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
  metadata: PayBillMetadata;
  rows: PayBillEmployeeRow[];
  pdfTotals: PayBillTotalRow | null;
  rawText: string;
  pageCount: number;
  parsingWarnings: string[];
}

export interface PayBillImportResult {
  importId: string;
  billNo: string;
  month: string;
  financialYear: number;
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
  uploadedFile: string | null;
  createdAt: string;
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
  createdAt: string;
}

export interface PayBillParameterMatrixRow {
  parameter: string; // e.g. "Basic Pay", "DA (0103)", "Gross Amount"
  key: string; // e.g. "basic_pay", "da", "gross_amount"
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
  };
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

export interface PayBillAllowanceMatrixReport {
  financialYear: number;
  hrpn: string | null;
  employeeName?: string | null;
  monthLabels: string[];
  rows: PayBillParameterMatrixRow[];
  totalGross: number;
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

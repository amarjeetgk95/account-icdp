export interface Party {
  id: string;
  name: string;
  gst_no: string | null;
  pan_no: string | null;
}

export interface PartyTransaction {
  id: string;
  party_id: string;
  party_name: string;
  bill_no: string;
  transaction_date: string;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  income_tax: number;
}

export interface TransactionInput {
  partyName: string;
  billNo: string;
  date: string;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  incomeTax: number;
  cpinNo?: string;
  gstNo?: string;
  panNo?: string;
}

export interface GSTReportRow {
  partyName: string;
  gstNo: string;
  cpinNo: string;
  billNo: string;
  date: string;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
}

export interface GSTReport {
  fy: number;
  quarter: string;
  rows: GSTReportRow[];
  totals: {
    amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalGst: number;
  };
}

export interface IncomeTaxReportRow {
  partyName: string;
  panNo: string;
  billNo: string;
  date: string;
  amount: number;
  incomeTax: number;
}

export interface IncomeTaxReport {
  fy: number;
  quarter: string;
  rows: IncomeTaxReportRow[];
  totals: {
    amount: number;
    incomeTax: number;
  };
}

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
  ddo_bill_no?: string | null;
  bill_no: string; // Vendor invoice number
  invoice_date?: string;
  settlement_date?: string;
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
  ddoBillNo?: string;
  billNo: string;
  invoiceDate?: string;
  settlementDate?: string;
  date?: string;
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
  ddoBillNo?: string;
  billNo: string;
  invoiceDate?: string;
  settlementDate?: string;
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
  ddoBillNo?: string;
  billNo: string;
  invoiceDate?: string;
  settlementDate?: string;
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

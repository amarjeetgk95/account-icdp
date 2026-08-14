export interface YearlyEmployeeRecord {
  name: string;
  pan: string;
  months: number;
  gross: number;
  da: number;
  tax: number;
  qGross: Record<string, number>;
  qTax: Record<string, number>;
}

export interface YearlyVendorRecord {
  name: string;
  gstNo: string;
  panNo: string;
  billCount: number;
  totalAmount: number;
  totalIncomeTax: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGst: number;
}

export interface YearlyReport {
  fy: number;
  fyLabel: string;
  ayLabel: string;
  employees: YearlyEmployeeRecord[];
  vendors: YearlyVendorRecord[];
  summary: {
    totalEmployees: number;
    totalGross: number;
    totalDA: number;
    totalTax: number;
    totalVendors: number;
    totalVendorAmount: number;
    totalIncomeTax: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalGst: number;
  };
}

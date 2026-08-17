export interface GTR30EmployeeMaster {
  id: string;
  srNo: number;
  hrpnNo?: string;
  name: string;
  designation: string;
  payScale: string;
  currentPay: number;
  currentPayDate: string;
  hraPercent: number;
  transportAllowance: number;
  medicalAllowance: number;
  claAllowance: number;
}

export interface GTR30BillCodeMapping {
  id: string;
  billCode: string;
  description: string;
  monthKey?: string;
}

export interface GTR30MasterGroup {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
}

export interface GTR30MasterGroupDto {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
}

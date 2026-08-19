export interface GTR30EmployeeMaster {
  id: string;
  srNo: number;
  hrpnNo?: string;
  name: string;
  designation: string;
  designationGujarati?: string;
  cadreClass?: string;
  payScale: string;
  gradePay?: string;
  payLevelCell?: string;
  ppaNo?: string;
  currentPay: number;
  currentPayDate?: string;
  quarterAddress?: string;
  insuranceGroup?: string;
  insuranceType?: 'savings_and_insurance' | 'insurance_only';
  hraPercent: number;
  da?: number;
  transportAllowance: number;
  medicalAllowance: number;
  claAllowance: number;
  rentOfBuilding?: number;
  professionalTax?: number;
  gis1981Insurance?: number;
  gis1981Savings?: number;
  npsPension?: number;
  societyDeduction?: number;
  remarks?: string;
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

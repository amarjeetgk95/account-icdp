export interface GTR30PostItem {
  id: string;
  srNo: number | string;
  designation: string;
  cadreClass: string;
  sanctioned: number;
  filled: number;
  vacant: number;
  total: number;
}

export interface GTR30TransitItem {
  srNo: string;
  date: string;
  tokenNo: string;
  tokenDate: string;
}

export interface GTR30Employee {
  id: string;
  srNo: number;
  masterId?: string;
  name: string;
  designation: string;
  designationGujarati?: string;
  cadreClass?: string;
  payScale: string;
  gradePay: string;
  payLevelCell: string;
  ppaNo: string;
  quarterAddress: string;
  insuranceGroup: 'ક' | 'ખ' | 'ગ' | 'ઘ' | string;
  insuranceType: 'savings_and_insurance' | 'insurance_only';

  payOfOfficer: number;
  payOfEstablishment: number;
  nppa: number;
  leaveSalary: number;
  leaveEncashment: number;
  dearnessPay: number;
  da: number;
  hra: number;
  cla: number;
  otherAllowance: number;
  medicalAllowance: number;
  bonus: number;
  pta: number;
  profSplService: number;
  washingAllowance: number;
  officeExpenseOther: number;
  ca: number;
  transportAllowance: number;
  ropArrearsGaz: number;
  ropArrearsNonGaz: number;
  dpGaz: number;
  dpNonGaz: number;

  recovFestivalAdv: number;
  recovFoodGrainAdv: number;
  recovPay: number;
  leaveSalaryAdv: number;

  incomeTax: number;
  surchargeIT: number;
  housingFund: number;
  rentOfBuilding: number;
  policeHousing: number;
  postalLifeInsurance: number;
  bsiPremium: number;
  professionalTax: number;
  gis1979Insurance: number;
  gis1981Insurance: number;
  gis1981Savings: number;
  aisInsurance: number;
  aisSavings: number;
  diviAcctInsurance: number;
  diviAcctSavings: number;
  pfDeputation: number;
  govtHousingFund: number;
  hba: number;
  motorCarAdv: number;
  securityDeposit: number;
  iasProvidentFund: number;
  gpfOtherThanClass4: number;
  gpfDiviAcct: number;
  contributoryPF: number;
  gpfWorkCharged: number;
  gpfRojamdar: number;
  festivalAdv: number;
  foodGrainAdv: number;
  fanAdv: number;
  otherConveyanceAdv: number;
  interestOnAdv: number;
  jeepRent: number;
  pfAdjustableByAO: number;
  recovPayLeaveSalary: number;
  miscRecoveries: number;
  npsPension: number;
  societyDeduction: number;
  remarks: string;
}

export interface GTR30FormData {
  billRegisterNo: string;
  billDate: string;
  monthOf: string;
  billCode: string;
  monthYearDigits: string;
  district: string;
  branchName: string;
  officeName: string;
  officeFullName: string;
  treasuryName: string;
  phoneNo: string;
  cardexNo: string;
  ddoCode: string;
  station: string;
  controllingOfficer: string;
  classOfExpenditure: string;
  fund: string;
  drawingOfficer: string;
  demandNo: string;
  typeOfBudget: string;
  schemeNo: string;
  headChargeable: string;
  sector: string;
  demandNoLabel: string;
  majorHead: string;
  subMajorHead?: string;
  minorHead: string;
  subHead: string;
  budgetYear: string;
  budgetAllotment: number;
  schemeResolutionText: string;
  daResolutionText: string;
  drawingOfficerName: string;
  drawingOfficerNameGujarati: string;
  drawingOfficerDesignation: string;
  drawingOfficerDesignationGujarati: string;
  drawingOfficerOffice: string;
  drawingOfficerOfficeGujarati: string;
  messengerName: string;
  messengerDesignation: string;
  transits: GTR30TransitItem[];
  establishmentPosts: GTR30PostItem[];
  employees: GTR30Employee[];
}

export interface GTR30Bill extends GTR30FormData {
  id: string;
  createdDate: string;
  updatedDate: string;
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  status: 'draft' | 'submitted' | 'passed';
}

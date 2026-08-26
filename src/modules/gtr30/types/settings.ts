import type { GTR30FormData, GTR30Employee } from './bill';

export interface GTR30DARateEntry {
  id: string;
  effectiveFrom: string; // ISO date YYYY-MM-DD
  rate: number; // percent, e.g. 53
  description?: string;
  resolutionNo?: string;
}

export type GTR30DefaultSettings = Pick<
  GTR30FormData,
  | 'officeName'
  | 'officeFullName'
  | 'branchName'
  | 'treasuryName'
  | 'phoneNo'
  | 'district'
  | 'station'
  | 'cardexNo'
  | 'ddoCode'
  | 'controllingOfficer'
  | 'classOfExpenditure'
  | 'fund'
  | 'drawingOfficer'
  | 'demandNo'
  | 'typeOfBudget'
  | 'schemeNo'
  | 'headChargeable'
  | 'sector'
  | 'majorHead'
  | 'minorHead'
  | 'subHead'
  | 'budgetYear'
  | 'schemeResolutionText'
  | 'daResolutionText'
  | 'drawingOfficerName'
  | 'drawingOfficerNameGujarati'
  | 'drawingOfficerDesignation'
  | 'drawingOfficerDesignationGujarati'
  | 'drawingOfficerOffice'
  | 'drawingOfficerOfficeGujarati'
  | 'messengerName'
  | 'messengerDesignation'
>;

export type GTR30DefaultEmployeeTemplate = Pick<
  GTR30Employee,
  | 'designation'
  | 'designationGujarati'
  | 'cadreClass'
  | 'payScale'
  | 'gradePay'
  | 'payLevelCell'
  | 'ppaNo'
  | 'quarterAddress'
  | 'insuranceGroup'
  | 'insuranceType'
>;

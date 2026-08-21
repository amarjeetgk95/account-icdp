import type { GTR30DARateEntry, GTR30DefaultSettings, GTR30DefaultEmployeeTemplate } from '../types/settings';
import type { GTR30PostItem } from '../types';
import {
  sampleGTR30FormData,
  defaultEstablishmentPosts,
} from './defaults';

export const GTR30_SETTINGS_STORAGE_KEY = 'gtr30-settings-v1';

export const DEFAULT_GTR30_SETTINGS: GTR30DefaultSettings = {
  officeName: sampleGTR30FormData.officeName,
  officeFullName: sampleGTR30FormData.officeFullName,
  branchName: sampleGTR30FormData.branchName,
  treasuryName: sampleGTR30FormData.treasuryName,
  phoneNo: sampleGTR30FormData.phoneNo,
  district: sampleGTR30FormData.district,
  station: sampleGTR30FormData.station,
  cardexNo: sampleGTR30FormData.cardexNo,
  ddoCode: sampleGTR30FormData.ddoCode,
  classOfExpenditure: sampleGTR30FormData.classOfExpenditure,
  fund: sampleGTR30FormData.fund,
  drawingOfficer: sampleGTR30FormData.drawingOfficer,
  demandNo: sampleGTR30FormData.demandNo,
  typeOfBudget: sampleGTR30FormData.typeOfBudget,
  schemeNo: sampleGTR30FormData.schemeNo,
  headChargeable: sampleGTR30FormData.headChargeable,
  sector: sampleGTR30FormData.sector,
  majorHead: sampleGTR30FormData.majorHead,
  minorHead: sampleGTR30FormData.minorHead,
  subHead: sampleGTR30FormData.subHead,
  budgetYear: sampleGTR30FormData.budgetYear,
  schemeResolutionText: sampleGTR30FormData.schemeResolutionText,
  daResolutionText: sampleGTR30FormData.daResolutionText,
  drawingOfficerName: sampleGTR30FormData.drawingOfficerName,
  drawingOfficerNameGujarati: sampleGTR30FormData.drawingOfficerNameGujarati,
  drawingOfficerDesignation: sampleGTR30FormData.drawingOfficerDesignation,
  drawingOfficerDesignationGujarati: sampleGTR30FormData.drawingOfficerDesignationGujarati,
  drawingOfficerOffice: sampleGTR30FormData.drawingOfficerOffice,
  drawingOfficerOfficeGujarati: sampleGTR30FormData.drawingOfficerOfficeGujarati,
  messengerName: sampleGTR30FormData.messengerName,
  messengerDesignation: sampleGTR30FormData.messengerDesignation,
};

export const DEFAULT_GTR30_EMPLOYEE_TEMPLATE: GTR30DefaultEmployeeTemplate = {
  designation: sampleGTR30FormData.employees[0].designation,
  designationGujarati: sampleGTR30FormData.employees[0].designationGujarati ?? '',
  cadreClass: sampleGTR30FormData.employees[0].cadreClass ?? '3',
  payScale: sampleGTR30FormData.employees[0].payScale,
  gradePay: sampleGTR30FormData.employees[0].gradePay,
  payLevelCell: sampleGTR30FormData.employees[0].payLevelCell,
  ppaNo: sampleGTR30FormData.employees[0].ppaNo,
  quarterAddress: sampleGTR30FormData.employees[0].quarterAddress,
  insuranceGroup: sampleGTR30FormData.employees[0].insuranceGroup,
  insuranceType: sampleGTR30FormData.employees[0].insuranceType,
};

const DEFAULT_GTR30_POSTS: GTR30PostItem[] = defaultEstablishmentPosts.map((post) => ({
  ...post,
}));

export function freshDefaultPosts(): GTR30PostItem[] {
  return DEFAULT_GTR30_POSTS.map((post) => ({ ...post, id: crypto.randomUUID() }));
}

export const DEFAULT_GTR30_DA_RATES: GTR30DARateEntry[] = [
  {
    id: 'da-2024-12-04',
    effectiveFrom: '2024-12-04',
    rate: 53,
    description: '7th Pay Commission DA 53% (Gujarat GR 04-12-2024)',
    resolutionNo: 'વલભ-૧૦૨૦૧૬-જીઓઆઈ-૭-ચ તા:૦૪-૧૨-૨૦૨૪',
  },
];

export function freshDefaultDaRates(): GTR30DARateEntry[] {
  return DEFAULT_GTR30_DA_RATES.map((rate) => ({ ...rate }));
}

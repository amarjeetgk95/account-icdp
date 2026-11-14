import type { EstablishmentEmployee } from '../types';

export function createBlankEstablishmentEmployee(): EstablishmentEmployee {
  return {
    id: crypto.randomUUID(),
    hrpnNo: '',
    name: '',
    nameGu: '',
    mobileNo: '',
    designation: '',
    designationGu: '',
    cadreClass: '',
    pan: '',
    payScale: '',
    gradePay: '',
    payLevel: '',
    payCell: '',
    ppaNo: '',
    joinDate: '',
    transferDate: '',
    budgetHeadId: '',
    active: true,
    quartersAddress: '',
    gisGroup: '',
    allowances: {},
    deductions: {},
    payEntries: [],
  };
}

import React from 'react';
import { GTR44Document } from './GTR44Document';
import { GTR44Bill, GTR44FormData, SubVoucher } from '../types';
import { DEFAULT_GTR44_FORM_DATA } from '../store/gtr44Store';

interface GTR44PrintableFormProps {
  className?: string;
  bill?: GTR44Bill;
  formData?: GTR44FormData;
}

export const GTR44PrintableForm: React.FC<GTR44PrintableFormProps> = ({
  className = '',
  bill,
  formData,
}) => {
  let data: GTR44FormData;

  if (formData) {
    data = formData;
  } else if (bill?.formData) {
    data = bill.formData;
  } else if (bill) {
    // Legacy bill without formData - convert from bill fields
    data = {
      ...DEFAULT_GTR44_FORM_DATA,
      officeName: bill.officeName || DEFAULT_GTR44_FORM_DATA.officeName,
      billRegisterNo: bill.billNo || DEFAULT_GTR44_FORM_DATA.billRegisterNo,
      billRegisterDate: bill.billDate || DEFAULT_GTR44_FORM_DATA.billRegisterDate,
      tokenNo1: bill.tokenNo || '',
      tokenDate1: bill.tokenDate || '',
      monthOf: bill.month || DEFAULT_GTR44_FORM_DATA.monthOf,
      district: bill.district || DEFAULT_GTR44_FORM_DATA.district,
      sector: bill.sector || DEFAULT_GTR44_FORM_DATA.sector,
      demandNo: bill.demandNo || DEFAULT_GTR44_FORM_DATA.demandNo,
      majorHead: bill.majorHead || DEFAULT_GTR44_FORM_DATA.majorHead,
      subMajorHead: bill.subMajorHead || DEFAULT_GTR44_FORM_DATA.subMajorHead,
      minorHead: bill.minorHead || DEFAULT_GTR44_FORM_DATA.minorHead,
      subHead: bill.subHead || DEFAULT_GTR44_FORM_DATA.subHead,
      detailedHead: bill.detailedHead || DEFAULT_GTR44_FORM_DATA.detailedHead,
      budgetGrant: bill.budgetAllotment || DEFAULT_GTR44_FORM_DATA.budgetGrant,
      ddoCardexCode: bill.ddoCardexCode || DEFAULT_GTR44_FORM_DATA.ddoCardexCode,
      partyEntries: (bill.subVouchers || []).map((sv: SubVoucher, idx: number) => ({
        id: sv.id || `sv-${idx}`,
        srNo: idx + 1,
        subVoucherNo: sv.subVoucherNo || String(idx + 1),
        partyName: sv.payeeName,
        billNo: sv.sanctionOrderNo || `BILL-${idx + 1}`,
        date: sv.sanctionDate || new Date().toISOString().split('T')[0],
        details: sv.description,
        amount: sv.amount,
      })),
    };
  } else {
    data = DEFAULT_GTR44_FORM_DATA;
  }

  return (
    <div className={className}>
      <GTR44Document data={data} containerId="gtr44-printable-form-container" />
    </div>
  );
};

export default GTR44PrintableForm;

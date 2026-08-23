import React from 'react';
import type { GTR30FormData } from '../types';
import { gtr30ParseMonthKey } from '../utils/gtr30MonthKey';

interface Props {
  data: GTR30FormData;
  side: 'Earning' | 'Deduction';
}

/**
 * Shared top-of-page header for both GTR-30 inner sheets (Earning & Deduction).
 * Emulates the karmyogi.gujarat.gov.in "Pay Bill Inner Sheet" layout:
 *   • Bold centred title with the payment month
 *   • 5-row × 3-column DDO / bill metadata grid (label:value pairs)
 */
export const GTR30InnerSheetMetadata: React.FC<Props> = ({ data, side }) => {
  const parsed = gtr30ParseMonthKey(data.monthOf);
  const monthLabel = parsed ? `${parsed.month}-${parsed.year}` : data.monthOf?.trim() || 'August-2026';

  const ddoName = data.drawingOfficerName || data.controllingOfficer || '';
  const officeName = data.officeFullName || data.officeName || '';

  const cols: [string, string][] = [
    ['D.D.O HRPN', ''],
    ['Name of D.D.O', ddoName],
    ['D.D.O Code No', data.ddoCode || ''],
    ['E-Mail ID', ''],
    ['Phone no.', data.phoneNo || ''],
  ];
  const cols2: [string, string][] = [
    ['Name of Office', officeName],
    ['Name of Ministry', ''],
    ['Department', officeName],
    ['Address', data.station || data.district || ''],
    ['Taluka', ''],
  ];
  const cols3: [string, string][] = [
    ['Bill No.', data.billRegisterNo || ''],
    ['Major Head', data.majorHead || ''],
    ['TAN No.', ''],
    ['Cardex No.', data.cardexNo || ''],
    ['Mobile No.', data.phoneNo || ''],
  ];

  const renderGroup = (rows: [string, string][]) => (
    <div className="flex flex-col">
      {rows.map(([label, value], i) => (
        <div key={i} className={`${i === 0 ? 'border border-black' : ''} flex`}>
          <span className="w-[64px] border border-black px-1.5 py-[1px] text-left text-[6.8pt] font-semibold leading-none text-black">
            {label} :
          </span>
          <span className="flex-1 min-w-0 border border-black px-1 py-[1px] text-left text-[6.8pt] leading-none text-black">
            {value}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <React.Fragment>
      <div className="text-center font-sans text-[10.5pt] font-extrabold tracking-tight text-black leading-snug">
        <span className="break-words">
          PAYBILL INNER SHEET - {side} Side for the Month of : {monthLabel}
        </span>
      </div>
      <div
        className="grid grid-cols-3 border border-black mt-[2px]"
      >
        {renderGroup(cols)}
        {renderGroup(cols2)}
        {renderGroup(cols3)}
      </div>
    </React.Fragment>
  );
};
import React from 'react';
import { GTR44FormData } from '../types';
import { GTR44CertificationPage3 } from './GTR44Certification';
import { splitAmount, formatDateDDMMYYYY, numberToWordsINR, formatIndianCurrency } from '../utils/gtr44Utils';
import { sumPartyEntries } from '../services/gtr44Calc.service';

interface GTR44Page3Props {
  data: GTR44FormData;
  readOnly?: boolean;
}

const PAGE_2_ROW_COUNT = 13;
const PAGE_3_ROW_COUNT = 5;

export const GTR44Page3: React.FC<GTR44Page3Props> = ({ data }) => {
  const page2Entries = data.partyEntries.slice(0, PAGE_2_ROW_COUNT);
  const page2Total = sumPartyEntries(page2Entries);

  const page3Entries = data.partyEntries.slice(PAGE_2_ROW_COUNT, PAGE_2_ROW_COUNT + PAGE_3_ROW_COUNT);
  const totalAmount = sumPartyEntries(data.partyEntries);

  const broughtForwardSplit = splitAmount(page2Total);
  const totalSplit = splitAmount(totalAmount);

  const emptyRowsNeeded = Math.max(0, PAGE_3_ROW_COUNT - page3Entries.length);
  const wordsEN = numberToWordsINR(totalAmount);
  const underRs = data.underRsAmount || Math.ceil(totalAmount + 1);

  return (
    <div className="gtr-page" id="gtr44-page-3">
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: '11.5pt',
          color: '#000000',
        }}
      >
        {/* Table Top Section */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            tableLayout: 'fixed',
            marginBottom: '14px',
          }}
        >
          <thead>
            {/* Brought Forward Header Row */}
            <tr style={{ borderBottom: '1px solid #000', height: '32px', fontWeight: 700 }}>
              <th
                colSpan={2}
                style={{
                  width: '78%',
                  borderRight: '1px solid #000',
                  textAlign: 'right',
                  paddingRight: '20px',
                  fontSize: '11.5pt',
                }}
              >
                <span>Brought Forward Rs.&nbsp;&nbsp;</span>
                <span style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '11pt' }}>આગળથી ખેંચ્યા રૂ.</span>
              </th>
              <th style={{ width: '22%', padding: 0 }}>
                <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
                  <div
                    style={{
                      flex: '1 1 65%',
                      textAlign: 'right',
                      paddingRight: '8px',
                      borderRight: '1px solid #000',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '11.5pt',
                    }}
                  >
                    {page2Total > 0 ? broughtForwardSplit.rs : ''}
                  </div>
                  <div
                    style={{
                      flex: '1 1 35%',
                      textAlign: 'center',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '11.5pt',
                    }}
                  >
                    {page2Total > 0 ? broughtForwardSplit.ps : ''}
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Continuation Entries */}
            {page3Entries.map((entry, idx) => {
              const s = splitAmount(entry.amount);
              return (
                <tr key={entry.id || idx} style={{ borderBottom: '1px solid #000', height: '42px', verticalAlign: 'top' }}>
                  <td style={{ width: '22%', borderRight: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontWeight: 700, fontSize: '12pt' }}>
                    {entry.subVoucherNo || entry.srNo}
                  </td>
                  <td style={{ width: '56%', borderRight: '1px solid #000', padding: '4px 10px', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 700, fontSize: '12pt' }}>{entry.partyName}</div>
                    <div style={{ fontSize: '11pt', color: '#111', marginTop: '1px' }}>{entry.details}</div>
                    {(entry.billNo || entry.date) && (
                      <div style={{ fontSize: '10.5pt', color: '#333', marginTop: '2px' }}>
                        {entry.billNo && <span>Bill No: {entry.billNo}</span>}
                        {entry.billNo && entry.date && <span> · </span>}
                        {entry.date && <span>Date: {formatDateDDMMYYYY(entry.date)}</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ width: '22%', padding: 0 }}>
                    <div style={{ display: 'flex', height: '100%' }}>
                      <div
                        style={{
                          flex: '1 1 65%',
                          textAlign: 'right',
                          paddingRight: '8px',
                          paddingTop: '4px',
                          borderRight: '1px solid #000',
                          fontFamily: "'Courier New', monospace",
                          fontWeight: 700,
                          fontSize: '11.5pt',
                        }}
                      >
                        {s.rs}
                      </div>
                      <div
                        style={{
                          flex: '1 1 35%',
                          textAlign: 'center',
                          paddingTop: '4px',
                          fontFamily: "'Courier New', monospace",
                          fontWeight: 700,
          fontSize: '11.5pt',
                        }}
                      >
                        {s.ps}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Empty rows to preserve geometry */}
            {Array.from({ length: emptyRowsNeeded }).map((_, idx) => (
              <tr key={`empty-p3-${idx}`} style={{ borderBottom: '1px solid #000', height: '42px' }}>
                <td style={{ width: '22%', borderRight: '1px solid #000' }}></td>
                <td style={{ width: '56%', borderRight: '1px solid #000' }}></td>
                <td style={{ width: '22%', padding: 0 }}>
                  <div style={{ display: 'flex', height: '100%' }}>
                    <div style={{ flex: '1 1 65%', borderRight: '1px solid #000' }}></div>
                    <div style={{ flex: '1 1 35%' }}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            {/* Total Rs. (In Words) Row */}
            <tr style={{ borderTop: '1px solid #000', minHeight: '44px', fontWeight: 700 }}>
              <td
                colSpan={2}
                style={{
                  borderRight: '1px solid #000',
                  padding: '8px 12px',
                  verticalAlign: 'middle',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5pt' }}>Total Rs. (In Words)</span>
                  <span style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '11pt' }}>
                    કુલ રૂપિયા (શબ્દોમાં)
                  </span>
                  <span
                    style={{
                      fontStyle: 'italic',
                      fontWeight: 700,
                      fontSize: '11.5pt',
                      borderBottom: '1px solid #000',
                      flex: 1,
                      paddingLeft: '6px',
                    }}
                  >
                    {totalAmount > 0 ? wordsEN : ''}
                  </span>
                </div>
              </td>
              <td style={{ padding: 0 }}>
                <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
                  <div
                    style={{
                      flex: '1 1 65%',
                      textAlign: 'right',
                      paddingRight: '8px',
                      borderRight: '1px solid #000',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '11.5pt',
                    }}
                  >
                    {totalAmount > 0 ? totalSplit.rs : ''}
                  </div>
                  <div
                    style={{
                      flex: '1 1 35%',
                      textAlign: 'center',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '11.5pt',
                    }}
                  >
                    {totalAmount > 0 ? totalSplit.ps : ''}
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Under Rs. line */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '14px', fontSize: '11.5pt' }}>
          <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Under Rs.&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '6px',
              fontStyle: 'italic',
              minHeight: '16px',
            }}
          >
            {totalAmount > 0 ? `${formatIndianCurrency(underRs)} (${numberToWordsINR(underRs)})` : ''}
          </span>
        </div>

        {/* GST Deduction Details (checklist on the third page) */}
        <div
          style={{
            border: '1px solid #000',
            marginBottom: '14px',
            fontSize: '11pt',
            padding: '8px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Deduction on account of GST :&nbsp;</span>
            <span style={{ fontFamily: "'Courier New', monospace" }}>
              {data.deductions.gst ? `Rs. ${formatIndianCurrency(data.deductions.gst)}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '6px', fontSize: '10.5pt', flexWrap: 'wrap' }}>
            <span>
              CGST&nbsp;
              <span style={{ borderBottom: '1px solid #000', minWidth: '90px', display: 'inline-block', textAlign: 'center', fontWeight: 700 }}>
                {data.deductions.gstCgst ? formatIndianCurrency(data.deductions.gstCgst) : ''}
              </span>
            </span>
            <span>
              SGST&nbsp;
              <span style={{ borderBottom: '1px solid #000', minWidth: '90px', display: 'inline-block', textAlign: 'center', fontWeight: 700 }}>
                {data.deductions.gstSgst ? formatIndianCurrency(data.deductions.gstSgst) : ''}
              </span>
            </span>
            <span>
              GSTIN&nbsp;
              <span style={{ borderBottom: '1px solid #000', minWidth: '150px', display: 'inline-block', textAlign: 'center', fontWeight: 700 }}>
                {data.deductions.gstNo || ''}
              </span>
            </span>
          </div>
        </div>

        {/* Certifications 1, 2, 3, 4 */}
        <div style={{ flex: 1 }}>
          <GTR44CertificationPage3 data={data} />
        </div>
      </div>
    </div>
  );
};

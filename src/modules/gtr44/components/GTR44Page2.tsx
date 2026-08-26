import React from 'react';
import { GTR44FormData } from '../types';
import { splitAmount, formatDateDDMMYYYY } from '../utils/gtr44Utils';
import { sumPartyEntries } from '../services/gtr44Calc.service';

interface GTR44Page2Props {
  data: GTR44FormData;
  readOnly?: boolean;
}

const PAGE_2_ROW_COUNT = 13; // 13 rows with larger height (48px) fills Page 2 A4 geometry

export const GTR44Page2: React.FC<GTR44Page2Props> = ({ data }) => {
  // Page 2 displays up to first 13 entries
  const page2Entries = data.partyEntries.slice(0, PAGE_2_ROW_COUNT);
  const page2Total = sumPartyEntries(page2Entries);
  const carriedOverSplit = splitAmount(page2Total);

  // Fill remaining blank rows up to PAGE_2_ROW_COUNT
  const emptyRowsNeeded = Math.max(0, PAGE_2_ROW_COUNT - page2Entries.length);

  return (
    <div className="gtr-page" id="gtr44-page-2">
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: '11pt',
          color: '#000000',
        }}
      >
        <table
          style={{
            width: '100%',
            height: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            {/* Header Row 1 */}
            <tr style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>
              <th
                style={{
                  width: '22%',
                  borderRight: '1px solid #000',
                  padding: '8px 6px',
                  verticalAlign: 'middle',
                  fontSize: '11pt',
                }}
              >
                <div>Details of Nos.</div>
                <div>of Sub-voucher</div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10.5pt', fontWeight: 600, marginTop: '3px' }}>
                  પેટા-વાઉચરની
                </div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10.5pt', fontWeight: 600 }}>
                  વિગતો
                </div>
              </th>

              <th
                style={{
                  width: '56%',
                  borderRight: '1px solid #000',
                  padding: '8px 8px',
                  verticalAlign: 'middle',
                  fontSize: '11pt',
                }}
              >
                <div>Description of Charges and No. and date of Authority</div>
                <div>for all charges requiring special sanction</div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10.5pt', fontWeight: 600, marginTop: '3px' }}>
                  ખાસ મંજૂરીની જરૂર હોય તેવા તમામ ખર્ચની વિગત અને
                </div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10.5pt', fontWeight: 600 }}>
                  આધાર હુકમના નંબર અને તારીખ
                </div>
              </th>

              <th style={{ width: '22%', padding: 0, verticalAlign: 'middle' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid #000', padding: '6px 0', fontSize: '11pt' }}>
                  <div>Amount</div>
                  <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10.5pt', fontWeight: 600 }}>રકમ</div>
                </div>
                <div style={{ display: 'flex', fontSize: '10.5pt', fontWeight: 700 }}>
                  <div style={{ flex: '1 1 65%', textAlign: 'center', borderRight: '1px solid #000', padding: '3px 0' }}>
                    <div>Rs.</div>
                    <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10pt' }}>રૂ.</div>
                  </div>
                  <div style={{ flex: '1 1 35%', textAlign: 'center', padding: '3px 0' }}>
                    <div>Ps.</div>
                    <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '10pt' }}>પૈ.</div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Populated Rows */}
            {page2Entries.map((entry, idx) => {
              const s = splitAmount(entry.amount);
              return (
                <tr key={entry.id || idx} style={{ borderBottom: '1px solid #000', verticalAlign: 'top', height: '48px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 700, fontSize: '11.5pt' }}>
                    {entry.subVoucherNo || entry.srNo}
                  </td>
                  <td style={{ borderRight: '1px solid #000', padding: '6px 10px', lineHeight: 1.35 }}>
                    <div style={{ fontWeight: 700, fontSize: '11.5pt' }}>{entry.partyName}</div>
                    <div style={{ fontSize: '10.5pt', color: '#111', marginTop: '1px' }}>{entry.details}</div>
                    {(entry.billNo || entry.date) && (
                      <div style={{ fontSize: '10pt', color: '#333', marginTop: '2px' }}>
                        {entry.billNo && <span>Bill No: {entry.billNo}</span>}
                        {entry.billNo && entry.date && <span> · </span>}
                        {entry.date && <span>Date: {formatDateDDMMYYYY(entry.date)}</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', height: '100%' }}>
                      <div
                        style={{
                          flex: '1 1 65%',
                          textAlign: 'right',
                          paddingRight: '8px',
                          paddingTop: '6px',
                          borderRight: '1px solid #000',
                          fontFamily: "'Courier New', monospace",
                          fontWeight: 700,
                          fontSize: '11pt',
                        }}
                      >
                        {s.rs}
                      </div>
                      <div
                        style={{
                          flex: '1 1 35%',
                          textAlign: 'center',
                          paddingTop: '6px',
                          fontFamily: "'Courier New', monospace",
                          fontWeight: 700,
          fontSize: '11pt',
                        }}
                      >
                        {s.ps}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Empty Rows to preserve exact layout */}
            {Array.from({ length: emptyRowsNeeded }).map((_, idx) => (
              <tr key={`empty-${idx}`} style={{ borderBottom: '1px solid #000', height: '48px' }}>
                <td style={{ borderRight: '1px solid #000' }}></td>
                <td style={{ borderRight: '1px solid #000' }}></td>
                <td style={{ padding: 0 }}>
                  <div style={{ display: 'flex', height: '100%' }}>
                    <div style={{ flex: '1 1 65%', borderRight: '1px solid #000' }}></div>
                    <div style={{ flex: '1 1 35%' }}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            {/* Carried Over Rupees Footer */}
            <tr style={{ borderTop: '1px solid #000', height: '36px', fontWeight: 700 }}>
              <td colSpan={2} style={{ borderRight: '1px solid #000', textAlign: 'right', paddingRight: '20px', fontSize: '11.5pt' }}>
                <span>Carried Over rupees&nbsp;&nbsp;</span>
                <span style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '11pt' }}>આગળ ખેંચ્યા રૂપિયા</span>
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
                      fontSize: '11pt',
                    }}
                  >
                    {page2Total > 0 ? carriedOverSplit.rs : ''}
                  </div>
                  <div
                    style={{
                      flex: '1 1 35%',
                      textAlign: 'center',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '11pt',
                    }}
                  >
                    {page2Total > 0 ? carriedOverSplit.ps : ''}
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

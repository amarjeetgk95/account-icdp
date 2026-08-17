import React from 'react';
import type { GTR30FormData } from '../types';
import { formatMoney, groupInsuranceBreakdown, numberToWords } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page8InsuranceGroup: React.FC<Props> = ({ data }) => {
  const rows = groupInsuranceBreakdown(data.employees || []);

  const totalInsOnlyCount = rows.reduce((s, r) => s + r.countInsOnly, 0);
  const totalSavingsAndInsCount = rows.reduce((s, r) => s + r.countSavingsAndIns, 0);
  const totalInsFund = rows.reduce((s, r) => s + r.insFund, 0);
  const totalSavingsFund = rows.reduce((s, r) => s + r.savingsFund, 0);
  const grandTotal = totalInsFund + totalSavingsFund;

  return (
    <div className="gtr30-page gtr30-portrait" id="gtr30-page-8">
      <div style={{ maxWidth: '780px', margin: '0 auto', fontSize: '9pt', lineHeight: 1.3 }}>
        {/* Header */}
        <h2
          style={{
            textAlign: 'center',
            fontSize: '14pt',
            fontWeight: 800,
            fontFamily: "'Noto Serif Gujarati', serif",
            margin: '0 0 10px 0',
            letterSpacing: '0.5px',
          }}
        >
          જૂથ વીમા કપાત (જૂથ વાઈઝ)
        </h2>

        <div style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 700, marginBottom: '8px' }}>
          For The Month of : {data.monthOf || 'December-2024'}
        </div>

        <div style={{ fontSize: '8.5pt', marginBottom: '6px' }}>
          Name of the office:- <strong>{data.officeFullName || 'Deputy Director of A.H., Intensive Cattle Development Programme'}</strong>
        </div>

        <div style={{ fontWeight: 700, fontSize: '9.5pt', marginBottom: '10px' }}>
          Code No. : <span style={{ textDecoration: 'underline' }}>8011 Insurance &amp; Savings Fund</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '5px 2px', width: '36px' }} rowSpan={2}>અ.<br />નં.</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '90px' }} rowSpan={2}>જૂથ<br />(નવા દર મુજબ)</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px' }} colSpan={2}>જૂથ હેઠળના કર્મચારીઓની સંખ્યા</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '90px' }} rowSpan={2}>વીમા ફંડમાં<br />ફાળો<br />(રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '90px' }} rowSpan={2}>બચત ફંડમાં<br />ફાળો<br />(રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '90px' }} rowSpan={2}>કુલ કપાત<br />(રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '5px 2px', width: '60px' }} rowSpan={2}>રીમાર્ક્સ</th>
            </tr>
            <tr style={{ background: '#f5f5f5', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '4px 4px', width: '120px' }}>
                ફક્ત વીમા ફંડમાં<br />ફાળો ભરનાર
              </th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', width: '130px' }}>
                વીમા ફંડમાં અને<br />બચત ફંડમાં<br />ફાળો ભરનાર
              </th>
            </tr>
            <tr style={{ background: '#e9ecef', textAlign: 'center', fontSize: '7.5pt', fontWeight: 700 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <th key={num} style={{ border: '1px solid #000', padding: '2px 0' }}>{num}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.groupCode} style={{ verticalAlign: 'middle', height: '32px' }}>
                <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}>
                  {idx + 1}.
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
                  {r.groupNameGujarati}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>
                  {r.countInsOnly}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: r.countSavingsAndIns > 0 ? 700 : 400 }}>
                  {r.countSavingsAndIns}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: r.insFund > 0 ? 600 : 400 }}>
                  {formatMoney(r.insFund)}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: r.savingsFund > 0 ? 600 : 400 }}>
                  {formatMoney(r.savingsFund)}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: r.total > 0 ? 700 : 400 }}>
                  {formatMoney(r.total)}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center' }}>---</td>
              </tr>
            ))}

            {/* Total Row */}
            <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 800 }}>Total</td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 800 }}>
                {totalInsOnlyCount}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 800 }}>
                {totalSavingsAndInsCount}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalInsFund)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalSavingsFund)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(grandTotal)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 2px' }}></td>
            </tr>
          </tbody>
        </table>

        {/* Words */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9.5pt', marginTop: '12px' }}>
          Rupees {numberToWords(grandTotal)} Only
        </div>

        {/* Signature Block */}
        <div style={{ marginTop: '75px', textAlign: 'center', fontSize: '8.5pt', lineHeight: 1.3, width: '340px', marginLeft: 'auto' }}>
          <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
          <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
          <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat'}</div>
          <div style={{ fontWeight: 700, marginTop: '2px' }}>
            Code No.-{data.ddoCode || '299'} Cardex No.-{data.cardexNo || '22'}
          </div>
        </div>
      </div>
    </div>
  );
};

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
      <div style={{ maxWidth: '680px', margin: '0 auto', fontSize: '9pt', lineHeight: 1.35, paddingTop: '15px', fontFamily: "'Times New Roman', Times, serif" }}>
        {/* Header */}
        <h2
          style={{
            textAlign: 'center',
            fontSize: '15pt',
            fontWeight: 800,
            fontFamily: "'Noto Serif Gujarati', serif",
            margin: '0 0 10px 0',
            letterSpacing: '0.5px',
          }}
        >
          જૂથ વીમા કપાત (જૂથ વાઈઝ)
        </h2>

        <div style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 700, marginBottom: '8px' }}>
          For The Month of : {data.monthOf || 'July-2026'}
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
            <tr style={{ background: '#ffffff', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '6px 2px', width: '32px', verticalAlign: 'middle' }}>અ.<br />નં.</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '80px', verticalAlign: 'middle' }}>જૂથ<br />(નવા દર મુજબ)</th>
              <th style={{ border: '1px solid #000', padding: 0, width: '240px', verticalAlign: 'top' }} colSpan={2}>
                <div style={{ borderBottom: '1px solid #000', padding: '3px 4px', fontWeight: 700 }}>જૂથ હેઠળના કર્મચારીઓની સંખ્યા</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ borderRight: '1px solid #000', padding: '3px 2px', fontSize: '7.8pt', fontWeight: 700 }}>ફક્ત વીમા ફંડમાં<br />ફાળો ભરનાર</div>
                  <div style={{ padding: '3px 2px', fontSize: '7.8pt', fontWeight: 700 }}>વીમા ફંડમાં અને<br />બચત ફંડમાં ફાળો ભરનાર</div>
                </div>
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '90px', verticalAlign: 'middle' }}>વીમા ફંડમાં<br />ફાળો (રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '90px', verticalAlign: 'middle' }}>બચત ફંડમાં<br />ફાળો (રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '95px', verticalAlign: 'middle' }}>કુલ કપાત<br />(રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '6px 2px', width: '55px', verticalAlign: 'middle' }}>રીમાર્ક્સ</th>
            </tr>
            <tr style={{ background: '#ffffff', textAlign: 'center', fontSize: '8pt', fontWeight: 600 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <th key={num} style={{ border: '1px solid #000', padding: '1px 0' }}>{num}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.groupCode} style={{ verticalAlign: 'middle', height: '36px' }}>
                <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center', fontWeight: 600 }}>
                  {idx + 1}.
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
                  {r.groupNameGujarati}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
                  {r.countInsOnly}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: r.countSavingsAndIns > 0 ? 700 : 400 }}>
                  {r.countSavingsAndIns}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: r.insFund > 0 ? 600 : 400 }}>
                  {formatMoney(r.insFund)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: r.savingsFund > 0 ? 600 : 400 }}>
                  {formatMoney(r.savingsFund)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: r.total > 0 ? 700 : 400 }}>
                  {formatMoney(r.total)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center' }}>---</td>
              </tr>
            ))}

            {/* Total Row */}
            <tr style={{ background: '#ffffff', fontWeight: 700, height: '30px' }}>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 800 }}>Total</td>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 800 }}>
                {totalInsOnlyCount}
              </td>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 800 }}>
                {totalSavingsAndInsCount}
              </td>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalInsFund)}
              </td>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalSavingsFund)}
              </td>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(grandTotal)}
              </td>
              <td style={{ border: '1px solid #000', padding: '5px 2px' }}></td>
            </tr>
          </tbody>
        </table>

        {/* Words */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9.5pt', marginTop: '12px' }}>
          Rupees {numberToWords(grandTotal)} Only
        </div>

        {/* Signature Block */}
        <div style={{ marginTop: '55px', textAlign: 'center', fontSize: '8.5pt', lineHeight: 1.3, width: '340px', marginLeft: 'auto' }}>
          <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'Smt. S.V.Solanki.'})</div>
          <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
          <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat'}</div>
          <div style={{ fontWeight: 600, marginTop: '2px' }}>
            Code No.-299 Cardex No.-22
          </div>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import type { GTR30FormData } from '../types';
import { earningsTotal, formatMoney, numberToWords } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page6ProfTax: React.FC<Props> = ({ data }) => {
  const employees = (data.employees || []).filter((e) => (e.professionalTax || 0) > 0);

  const totalProfTax = employees.reduce((sum, e) => sum + (e.professionalTax || 0), 0);

  return (
    <div className="gtr30-page gtr30-portrait" id="gtr30-page-6">
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
          વ્યવસાય વેરા કપાત
        </h2>

        <div style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 700, marginBottom: '8px' }}>
          For The Month of : {data.monthOf || 'December-2024'}
        </div>

        <div style={{ fontSize: '8.5pt', marginBottom: '6px' }}>
          Name of the Office :- <strong>{data.officeFullName || 'Deputy Director of A.H., Intensive Cattle Development Programme, Nanpur,'}</strong>
        </div>

        <div style={{ fontWeight: 700, fontSize: '9.5pt', marginBottom: '10px' }}>
          Code No. : <span style={{ textDecoration: 'underline' }}>0028 Professional Tax</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '5px 2px', width: '36px' }}>અ.<br />નં.</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '160px' }}>અધિકારી/<br />કર્મચારીનું નામ</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '120px' }}>હોદ્દો</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '100px' }}>પગારની<br />કુલ રકમ</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '100px' }}>વ્યવસાય વેરાનો<br />દર</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '110px' }}>કપાત કરેલ<br />વ્યવસાય વેરાની<br />રકમ</th>
              <th style={{ border: '1px solid #000', padding: '5px 2px', width: '60px' }}>રીમાર્ક્સ</th>
            </tr>
            <tr style={{ background: '#e9ecef', textAlign: 'center', fontSize: '7.5pt', fontWeight: 700 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <th key={num} style={{ border: '1px solid #000', padding: '2px 0' }}>{num}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', color: '#666' }}>
                  No professional tax deductions for this month.
                </td>
              </tr>
            ) : (
              employees.map((emp, idx) => {
                const gross = earningsTotal(emp);
                return (
                  <tr key={emp.id || idx} style={{ verticalAlign: 'middle' }}>
                    <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 700 }}>
                      {emp.name}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontFamily: "'Noto Serif Gujarati', serif" }}>
                      {emp.designationGujarati || emp.designation || 'સંશોધન મદદનીશ'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(gross)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(emp.professionalTax)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 700 }}>
                      {formatMoney(emp.professionalTax)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center' }}>
                      {emp.remarks || ''}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Total Row */}
            <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
              <td colSpan={4} style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Total</td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalProfTax)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalProfTax)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 2px' }}></td>
            </tr>
          </tbody>
        </table>

        {/* Words */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9.5pt', marginTop: '12px' }}>
          Rupees {numberToWords(totalProfTax)} Only
        </div>

        {/* Signature Block */}
        <div style={{ marginTop: '75px', textAlign: 'center', fontSize: '8.5pt', lineHeight: 1.3, width: '340px', marginLeft: 'auto' }}>
          <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
          <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
          <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat.'}</div>
          <div style={{ fontWeight: 700, marginTop: '2px' }}>
            CODE No.- {data.ddoCode || '299'} CARDEX- {data.cardexNo || '22'}
          </div>
        </div>
      </div>
    </div>
  );
};

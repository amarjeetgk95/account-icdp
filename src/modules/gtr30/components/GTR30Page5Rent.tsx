import React from 'react';
import type { GTR30FormData } from '../types';
import { formatMoney, numberToWords } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page5Rent: React.FC<Props> = ({ data }) => {
  const employees = (data.employees || []).filter((e) => (e.rentOfBuilding || 0) > 0);

  const totalBasicPay = employees.reduce((sum, e) => sum + (e.payOfEstablishment || e.payOfOfficer || 0), 0);
  const totalRentDeducted = employees.reduce((sum, e) => sum + (e.rentOfBuilding || 0), 0);

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-5">
      <div style={{ maxWidth: '880px', margin: '0 auto', fontSize: '9pt', lineHeight: 1.35, paddingTop: '15px' }}>
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
          ઘરભાડા કપાત
        </h2>

        <div style={{ textAlign: 'center', fontSize: '10.5pt', fontWeight: 700, marginBottom: '8px' }}>
          For the Month of: {data.monthOf || 'Dec-2024'}
        </div>

        <div style={{ fontSize: '9pt', marginBottom: '6px' }}>
          Name of the Office :- <strong>{data.officeFullName || 'Deputy Director of A.H., Intensive Cattle Development Programme, Nanpura, Surat.'}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '10pt', marginBottom: '12px' }}>
          <div>Code No. : <span style={{ textDecoration: 'underline' }}>0059 Rent of Building - 0216</span></div>
          <div>Tele. No. {data.phoneNo || '0261-2464658'}</div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '6px 2px', width: '36px' }}>અ.<br />નં.</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '160px' }}>કર્મચારીનું નામ</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '130px' }}>હોદ્દો</th>
              <th style={{ border: '1px solid #000', padding: '6px 6px' }}>સરકારી ક્વાર્ટર નંબર<br />અને સરનામું</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '95px' }}>મૂળ પગાર</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '110px' }}>કપાત કરેલ<br />ઘરભાડાની રકમ</th>
              <th style={{ border: '1px solid #000', padding: '6px 2px', width: '50px' }}>નોંધ</th>
            </tr>
            <tr style={{ background: '#e9ecef', textAlign: 'center', fontSize: '8pt', fontWeight: 700 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <th key={num} style={{ border: '1px solid #000', padding: '2px 0' }}>{num}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ border: '1px solid #000', padding: '16px', textAlign: 'center', color: '#666' }}>
                  No rent deductions for this month.
                </td>
              </tr>
            ) : (
              employees.map((emp, idx) => (
                <tr key={emp.id || idx} style={{ verticalAlign: 'middle', height: '38px' }}>
                  <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}>
                    {idx + 1}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 700 }}>
                    {emp.name}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', fontFamily: "'Noto Serif Gujarati', serif" }}>
                    {emp.designationGujarati || emp.designation || 'સંશોધન મદદનીશ'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', fontSize: '8.5pt', lineHeight: 1.3 }}>
                    {emp.quarterAddress || 'H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(emp.payOfEstablishment || emp.payOfOfficer)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 700 }}>
                    {formatMoney(emp.rentOfBuilding)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center' }}>
                    {emp.remarks || '---'}
                  </td>
                </tr>
              ))
            )}

            {/* Total Row */}
            <tr style={{ background: '#f5f5f5', fontWeight: 700, height: '32px' }}>
              <td colSpan={4} style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Total</td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalBasicPay)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalRentDeducted)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center' }}>---</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '10pt', marginTop: '14px' }}>
          Rupees {numberToWords(totalRentDeducted)} Only
        </div>

        {/* Signature Block */}
        <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '9pt', lineHeight: 1.3, width: '360px', marginLeft: 'auto' }}>
          <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'Smt.U.J.Patel'})</div>
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

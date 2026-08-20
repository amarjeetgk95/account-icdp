import React from 'react';
import type { GTR30FormData } from '../types';
import { formatMoney, numberToWords } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page7InsuranceEmp: React.FC<Props> = ({ data }) => {
  const employees = (data.employees || []).filter(
    (e) => (e.gis1981Insurance || 0) > 0 || (e.gis1981Savings || 0) > 0 || (e.gis1979Insurance || 0) > 0
  );

  const totalInsurance = employees.reduce(
    (sum, e) => sum + (e.gis1981Insurance || 0) + (e.gis1979Insurance || 0),
    0
  );
  const totalSavings = employees.reduce((sum, e) => sum + (e.gis1981Savings || 0), 0);
  const grandTotal = totalInsurance + totalSavings;

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-7">
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
          જૂથ વીમા કપાત (કર્મચારી વાઈઝ)
        </h2>

        <div style={{ textAlign: 'center', fontSize: '10.5pt', fontWeight: 700, marginBottom: '8px' }}>
          For The Month of : {data.monthOf || 'December-2024'}
        </div>

        <div style={{ fontSize: '9pt', marginBottom: '6px' }}>
          Name of the office:- <strong>{data.officeFullName || 'Deputy Director of A.H., Intensive Cattle Development Programme'}</strong>
        </div>

        <div style={{ fontWeight: 700, fontSize: '10pt', marginBottom: '12px' }}>
          Code No. : <span style={{ textDecoration: 'underline' }}>8011 Insurance &amp; Savings Fund</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '6px 2px', width: '36px' }} rowSpan={2}>અ.<br />નં.</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '180px' }} rowSpan={2}>અધિકારી/<br />કર્મચારીનું નામ</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '140px' }} rowSpan={2}>હોદ્દો</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '90px' }} rowSpan={2}>જૂથ<br />(નવા દર મુજબ)</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px' }} colSpan={2}>જૂથ વીમા કપાત</th>
              <th style={{ border: '1px solid #000', padding: '6px 4px', width: '100px' }} rowSpan={2}>કુલ કપાત<br />(રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '6px 2px', width: '70px' }} rowSpan={2}>રીમાર્ક્સ</th>
            </tr>
            <tr style={{ background: '#f5f5f5', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '4px 4px', width: '95px' }}>વીમા ફંડ<br />(રૂ.)</th>
              <th style={{ border: '1px solid #000', padding: '4px 4px', width: '95px' }}>બચત ફંડ<br />(રૂ.)</th>
            </tr>
            <tr style={{ background: '#e9ecef', textAlign: 'center', fontSize: '8pt', fontWeight: 700 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <th key={num} style={{ border: '1px solid #000', padding: '2px 0' }}>{num}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ border: '1px solid #000', padding: '16px', textAlign: 'center', color: '#666' }}>
                  No group insurance deductions for this month.
                </td>
              </tr>
            ) : (
              employees.map((emp, idx) => {
                const ins = (emp.gis1981Insurance || 0) + (emp.gis1979Insurance || 0);
                const sav = emp.gis1981Savings || 0;
                const tot = ins + sav;
                return (
                  <tr key={emp.id || idx} style={{ verticalAlign: 'middle', height: '38px' }}>
                    <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}>
                      {idx + 1}.
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 700 }}>
                      {emp.name}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', fontFamily: "'Noto Serif Gujarati', serif" }}>
                      {emp.designationGujarati || emp.designation || 'સંશોધન મદદનીશ'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontFamily: "'Noto Serif Gujarati', serif", fontWeight: 700 }}>
                      {emp.insuranceGroup || 'ખ'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(ins)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(sav)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 700 }}>
                      {formatMoney(tot)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 2px', textAlign: 'center' }}>
                      {emp.remarks || ''}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Total Row */}
            <tr style={{ background: '#f5f5f5', fontWeight: 700, height: '32px' }}>
              <td colSpan={4} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 800 }}>Total</td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalInsurance)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(totalSavings)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'right', fontWeight: 800 }}>
                {formatMoney(grandTotal)}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 2px' }}></td>
            </tr>
          </tbody>
        </table>

        {/* Words */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '10pt', marginTop: '14px' }}>
          Rupees {numberToWords(grandTotal)} Only
        </div>

        {/* Signature Block — refined */}
        <div style={{ marginTop: '48px', textAlign: 'center', fontSize: '9pt', lineHeight: 1.35, width: '360px', marginLeft: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 10px', background: '#f8fafc' }}>
          <div style={{ fontWeight: 800, fontSize: '9.5pt' }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
          <div style={{ color: '#334155' }}>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
          <div style={{ fontSize: '8pt', color: '#64748b' }}>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat'}</div>
          <div style={{ fontWeight: 700, marginTop: '6px', fontFamily: 'monospace', fontSize: '8pt', background: '#ffffff', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            CODE No.- {data.ddoCode || '299'} · CARDEX- {data.cardexNo || '22'}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { GTR44FormData } from '../types';
import { GTR44Header } from './GTR44Header';
import { GTR44ExpenditureTable } from './GTR44ExpenditureTable';
import { formatIndianCurrency } from '../utils/gtr44Utils';
import { getGrossAmount, getTotalDeductions, getNetAmount, getBalance } from '../services/gtr44Calc.service';

interface GTR44Page1Props {
  data: GTR44FormData;
  readOnly?: boolean;
}

// Helper to render boxed single-digit cells
const renderBoxes = (value: string | number | undefined | null, count: number) => {
  const str = value !== undefined && value !== null ? String(value) : '';
  const padded = str.replace(/[^a-zA-Z0-9+]/g, '').padEnd(count, ' ').slice(0, count);
  const chars = padded.split('');

  return (
    <div className="inline-flex border-l border-t border-b border-black align-middle">
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            width: 15,
            height: 19,
            fontSize: '10pt',
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            borderRight: '1px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            lineHeight: 1,
          }}
        >
          {ch !== ' ' ? ch : ''}
        </span>
      ))}
    </div>
  );
};

export const GTR44Page1: React.FC<GTR44Page1Props> = ({ data, readOnly = false }) => {
  const grossTotal = getGrossAmount(data);
  const totalDeduction = getTotalDeductions(data.deductions);
  const netAmount = getNetAmount(grossTotal, totalDeduction);
  const grant = data.budgetGrant || 0;
  const balance = getBalance(data.budgetGrant, grossTotal);

  return (
    <div className="gtr-page" id="gtr44-page-1">
      {/* 1. Header Section */}
      <GTR44Header data={data} readOnly={readOnly} />

      {/* 2. COMPUTER INPUT DATA Box */}
      <div
        style={{
          border: '1px solid #000',
          padding: '4px 8px',
          margin: '3px 0 3px 0',
          backgroundColor: '#ffffff',
          fontFamily: "'Times New Roman', Times, serif",
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: '10pt',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textAlign: 'center',
            margin: '0 0 1px 0',
          }}
        >
          COMPUTER INPUT DATA
        </p>
        <p
          style={{
            fontStyle: 'italic',
            fontSize: '8pt',
            textAlign: 'center',
            margin: '0 0 4px 0',
            color: '#000',
          }}
        >
          (To be filled in by Treasury)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '38% 34% 28%', alignItems: 'center', fontSize: '8.5pt' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>1.&nbsp;&nbsp;District</span>
            {renderBoxes(data.district || '66', 2)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>2.&nbsp;&nbsp;Month &amp; Year</span>
            {renderBoxes(data.monthYear || '0726', 4)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>3.&nbsp;&nbsp;Voucher No.</span>
            {renderBoxes(data.voucherNo || '', 4)}
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Split Box */}
      <div
        style={{
          border: '1px solid #000',
          display: 'grid',
          gridTemplateColumns: '46% 54%',
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: '8.5pt',
          minHeight: '620px',
        }}
      >
        {/* Left Column: Classification 4 to 10 & Treasury Use */}
        <div
          style={{
            borderRight: '1px solid #000',
            padding: '4px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* 4. Class of Expenditure */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span>4.&nbsp;&nbsp;Class of Expenditure</span>
              {renderBoxes(data.classOfExpenditure || '1', 1)}
            </div>

            {/* 5. Fund */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span>5.&nbsp;&nbsp;Fund</span>
              {renderBoxes(data.fund || '3', 1)}
            </div>

            {/* 6. Drawing */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span>6.&nbsp;&nbsp;Drawing</span>
              {renderBoxes(data.drawing || '299', 3)}
            </div>

            {/* 7. Demand No. */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span>7.&nbsp;&nbsp;Demand No.</span>
              {renderBoxes(data.demandNo || '04', 2)}
            </div>

            {/* 8. Type of Budget */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span>8.&nbsp;&nbsp;Type of Budget</span>
              {renderBoxes(data.typeOfBudget || '1', 1)}
            </div>

            {/* 9. Schme No. (Spelled as in PDF) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span>9.&nbsp;&nbsp;Schme No.</span>
              {renderBoxes(data.schemeNo || '110263', 4)}
            </div>

            {/* 10. Head Chargeble (Spelled as in PDF) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span>10.&nbsp;Head Chargeble</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              {renderBoxes(data.headChargeableCode || '2403001020', 10)}
            </div>

            {/* Indented Classification Breakdown */}
            <div style={{ paddingLeft: '16px', fontSize: '8.5pt', lineHeight: 1.35, marginBottom: '6px' }}>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Sector</span>
                <strong>{data.sector}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Demand No.</span>
                <strong>{data.demandNoLabel}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Major Head</span>
                <strong>{data.majorHead}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Sub-Major Head</span>
                <strong>{data.subMajorHead}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Minor Head</span>
                <strong>{data.minorHead}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Sub Head</span>
                <strong>{data.subHead}</strong>
              </p>
            </div>

            {/* Detailed Head */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #000',
                paddingTop: '3px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontWeight: 700 }}>Detailed Head :</span>
              {renderBoxes(data.detailedHead || '00', 2)}
            </div>

            {/* Budget Grant & Expenditure Block */}
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '8.5pt', lineHeight: 1.35 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>
                  Budget Grant for 20{data.budgetGrantYearFrom?.slice(-2) || '26'}&nbsp;&nbsp;20{data.budgetGrantYearTo?.slice(-2) || '27'}&nbsp;&nbsp;Rs.
                </span>
                <span style={{ borderBottom: '1px solid #000', minWidth: '85px', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', monospace" }}>
                  {formatIndianCurrency(grant)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                <span>Expenditure including this Bill Rs.</span>
                <span style={{ borderBottom: '1px solid #000', minWidth: '85px', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', monospace" }}>
                  {formatIndianCurrency(grossTotal)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                <span>Balance&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Rs.</span>
                <span style={{ borderBottom: '1px solid #000', minWidth: '85px', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', monospace" }}>
                  {formatIndianCurrency(balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Treasury Use Block (Bottom of Left Column) */}
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '8.5pt' }}>
            <p style={{ fontWeight: 700, fontStyle: 'italic', textAlign: 'center', margin: '0 0 4px 0' }}>
              For Use in Treasury
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3px' }}>
              <span>Pay Rs. (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) Rs.</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, textAlign: 'right', fontWeight: 700, paddingRight: '2px', fontFamily: "'Courier New', monospace" }}>
                {formatIndianCurrency(netAmount)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3px' }}>
              <span>Rs.&nbsp;</span>
              <span style={{ borderBottom: '1px solid #000', width: '70px', textAlign: 'center' }}>
                {data.treasuryByTc ? formatIndianCurrency(data.treasuryByTc) : ''}
              </span>
              <span>&nbsp;By T. C. as at &apos;A&apos;</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '14px' }}>
              <span>Total Rs.&nbsp;</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, textAlign: 'right', fontWeight: 700, paddingRight: '2px', fontFamily: "'Courier New', monospace" }}>
                {formatIndianCurrency(grossTotal)}
              </span>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '25% 35% 40%', fontWeight: 700, fontSize: '8pt', alignItems: 'flex-start' }}>
              <div>Date</div>
              <div style={{ textAlign: 'center' }}>Accountant</div>
              <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
                Treasury Officer/<br />P. A. O.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 22 EDP Object of Expenditure Table */}
        <div style={{ padding: 0 }}>
          <GTR44ExpenditureTable data={data} readOnly={readOnly} />
        </div>
      </div>
    </div>
  );
};

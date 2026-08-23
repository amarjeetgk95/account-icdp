import React, { useMemo } from 'react';
import { GTR44FormData } from '../types';
import { GTR44Header } from './GTR44Header';
import { GTR44ExpenditureTable } from './GTR44ExpenditureTable';
import { formatIndianCurrency, numberToWordsINR } from '../utils/gtr44Utils';
import { getGrossAmount, getTotalDeductions, getNetAmount, getBalance, normalizeEDPCode } from '../services/gtr44Calc.service';
import { useGTR44SettingsStore } from '../store/gtr44SettingsStore';
import { getActiveExpenditureItems } from '../store/gtr44Defaults';

interface GTR44Page1Props {
  data: GTR44FormData;
  readOnly?: boolean;
}

// Helper to render boxed single-digit cells
const renderBoxes = (value: string | number | undefined | null, count: number, boxWidth = 14) => {
  const str = value !== undefined && value !== null ? String(value) : '';
  const padded = str.replace(/[^a-zA-Z0-9+]/g, '').padEnd(count, ' ').slice(0, count);
  const chars = padded.split('');

  return (
    <div className="inline-flex border-l border-t border-b border-black align-middle shrink-0">
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            width: boxWidth,
            height: 18,
            fontSize: boxWidth < 14 ? '9pt' : '10pt',
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
  // For voucher-based bills, always use current active Expenditure Master as template so newly added heads (e.g., 2100 / 2 1 0 1 +)
  // appear on Page1 even for old bills. Legacy bills with direct amounts on rows keep their stored template.
  const storeExpenditureItems = useGTR44SettingsStore((s) => s.expenditureItems);
  const effectiveData = useMemo(() => {
    const hasVouchers = (data.partyEntries?.length ?? 0) > 0;
    if (hasVouchers) {
      const activeStore = getActiveExpenditureItems(storeExpenditureItems);
      // If bill's stored template is missing any active EDP from current master, use current master
      const billEdps = new Set((data.expenditureItems || []).map((it) => normalizeEDPCode(it.edpCode)));
      const hasAllActive = activeStore.every((it) => billEdps.has(normalizeEDPCode(it.edpCode)));
      if (!hasAllActive || (data.expenditureItems?.length ?? 0) !== activeStore.length) {
        return { ...data, expenditureItems: activeStore.map((it) => ({ ...it, amount: null })) };
      }
    }
    return data;
  }, [data, storeExpenditureItems]);

  const grossTotal = getGrossAmount(effectiveData);
  const totalDeduction = getTotalDeductions(effectiveData.deductions);
  const netAmount = getNetAmount(grossTotal, totalDeduction);
  const grant = effectiveData.budgetGrant || 0;
  const balance = getBalance(effectiveData.budgetGrant, grossTotal);

  return (
    <div className="gtr-page" id="gtr44-page-1">
      {/* 1. Header Section */}
      <GTR44Header data={effectiveData} readOnly={readOnly} />

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

        <div style={{ display: 'grid', gridTemplateColumns: '38% 34% 28%', alignItems: 'center', fontSize: '9.5pt' }}>
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
          fontSize: '9.5pt',
          minHeight: '620px',
        }}
      >
        {/* Left Column: Classification 4 to 10 & Treasury Use */}
        <div
          style={{
            padding: '4px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* 4. Class of Expenditure — boxes left-aligned near label (paper form) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>4.&nbsp;&nbsp;Class of Expenditure</span>
              {renderBoxes(data.classOfExpenditure || '1', 1)}
            </div>

            {/* 5. Fund */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>5.&nbsp;&nbsp;Fund</span>
              {renderBoxes(data.fund || '3', 1)}
            </div>

            {/* 6. Drawing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>6.&nbsp;&nbsp;Drawing</span>
              {renderBoxes(data.drawing || '299', 3)}
            </div>

            {/* 7. Demand No. — 2 boxes as per printed form */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>7.&nbsp;&nbsp;Demand No.</span>
              {renderBoxes((data.demandNo || '04').slice(-2), 2)}
            </div>

            {/* 8. Type of Budget */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>8.&nbsp;&nbsp;Type of Budget</span>
              {renderBoxes(data.typeOfBudget || '1', 1)}
            </div>

            {/* 9. Scheme No. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>9.&nbsp;&nbsp;Scheme No.</span>
              {renderBoxes(data.schemeNo || '110263', 6)}
            </div>

            {/* 10. Head Chargeable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ width: '150px', flexShrink: 0, whiteSpace: 'nowrap' }}>10.&nbsp;Head Chargeable</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: '110px' }}>
              {renderBoxes(effectiveData.headChargeableCode ? String(effectiveData.headChargeableCode).slice(0, 13) : '2403001020000', 13, 12)}
            </div>

            {/* Indented Classification Breakdown — grid for perfect label/value alignment with colons */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: '1px', columnGap: '8px', paddingLeft: '16px', paddingRight: '4px', fontSize: '9pt', lineHeight: 1.3, marginBottom: '6px', fontFamily: "'Courier New', monospace" }}>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>Sector          :</span>
              <strong style={{ textAlign: 'left', wordBreak: 'break-word', fontWeight: 700 }}>{effectiveData.sector}</strong>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>Demand No.      :</span>
              <strong style={{ textAlign: 'left', wordBreak: 'break-word', fontWeight: 700 }}>{effectiveData.demandNoLabel}</strong>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>Major Head      :</span>
              <strong style={{ textAlign: 'left', wordBreak: 'break-word', fontWeight: 700 }}>{effectiveData.majorHead}</strong>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>Sub-Major Head  :</span>
              <strong style={{ textAlign: 'left', wordBreak: 'break-word', fontWeight: 700 }}>{effectiveData.subMajorHead}</strong>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>Minor Head      :</span>
              <strong style={{ textAlign: 'left', fontWeight: 700, wordBreak: 'break-word' }}>{effectiveData.minorHead}</strong>
              <span style={{ whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>Sub Head        :</span>
              <strong style={{ textAlign: 'left', fontWeight: 700, wordBreak: 'break-word' }}>{effectiveData.subHead}</strong>
            </div>

            {/* Detailed Head — boxes left-aligned */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderTop: '1px solid #000',
                paddingTop: '3px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontWeight: 700, width: '150px', flexShrink: 0 }}>Detailed Head :</span>
              {renderBoxes(data.detailedHead || '00', 2)}
            </div>

            {/* Budget Grant & Expenditure Block */}
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '9.5pt', lineHeight: 1.35 }}>
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
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '9.5pt' }}>
            <p style={{ fontWeight: 700, fontStyle: 'italic', textAlign: 'center', margin: '0 0 4px 0' }}>
              For Use in Treasury
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3px', fontSize: '9pt' }}>
              <span style={{ whiteSpace: 'nowrap' }}>Pay Rs.&nbsp;(</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, minHeight: '14px', textAlign: 'center', fontSize: '7.5pt', fontStyle: 'italic', padding: '0 2px', wordBreak: 'break-word', lineHeight: 1.1 }}>
                {data.treasuryPayRsWords || (netAmount > 0 ? numberToWordsINR(netAmount) : '')}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>)&nbsp;Rs.</span>
              <span style={{ borderBottom: '1px solid #000', minWidth: '78px', textAlign: 'right', fontWeight: 700, paddingRight: '2px', fontFamily: "'Courier New', monospace", fontSize: '8.5pt' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '25% 35% 40%', fontWeight: 700, fontSize: '9pt', alignItems: 'flex-start' }}>
              <div>Date</div>
              <div style={{ textAlign: 'center' }}>Accountant</div>
              <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
                Treasury Officer/<br />P. A. O.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 22 EDP Object of Expenditure Table — fills height to match left classification block */}
        <div style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #000' }}>
          <GTR44ExpenditureTable data={effectiveData} readOnly={readOnly} />
        </div>
      </div>
    </div>
  );
};

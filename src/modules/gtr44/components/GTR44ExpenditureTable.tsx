import React from 'react';
import { GTR44FormData } from '../types';
import { splitAmount } from '../utils/gtr44Utils';

interface GTR44ExpenditureTableProps {
  data: GTR44FormData;
  onChangeAmount?: (index: number, val: number | null) => void;
  onUpdateDeduction?: (field: keyof GTR44FormData['deductions'], val: number) => void;
  readOnly?: boolean;
}

// Render 5 mini boxes for EDP code (4 digits + 1 operator)
const renderEDPCode = (edpStr: string) => {
  const clean = edpStr.replace(/\s+/g, '');
  const chars = clean.split('');
  return (
    <div className="inline-flex border-l border-t border-b border-black">
      {chars.map((ch, idx) => (
        <span
          key={idx}
          style={{
            width: 11,
            height: 13.5,
            fontSize: 9,
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            borderRight: '1px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
};

export const GTR44ExpenditureTable: React.FC<GTR44ExpenditureTableProps> = ({
  data,
}) => {
  const partyTotal = data.partyEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expItemsTotal = data.expenditureItems.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grossTotal = partyTotal > 0 ? partyTotal : expItemsTotal;

  const deductions = data.deductions;
  const itAmount = deductions.tds9510 || 0;
  const surAmount = deductions.surcharge9520 || 0;
  const sdAmount = deductions.sd9600 || 0;
  const miscAmount = deductions.misc9910 || 0;

  const totalA = itAmount + surAmount + sdAmount;
  const totalDeduction = totalA + miscAmount;
  const netAmount = Math.max(0, grossTotal - totalDeduction);

  const grossSplit = splitAmount(grossTotal);
  const itSplit = splitAmount(itAmount);
  const surSplit = splitAmount(surAmount);
  const sdSplit = splitAmount(sdAmount);
  const totalASplit = splitAmount(totalA);
  const miscSplit = splitAmount(miscAmount);
  const totDedSplit = splitAmount(totalDeduction);
  const netSplit = splitAmount(netAmount);

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '8pt',
        fontFamily: "'Times New Roman', Times, serif",
        borderTop: 'none',
        borderRight: 'none',
        borderLeft: 'none',
        borderBottom: 'none',
      }}
    >
      <thead>
        <tr style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>
          <th style={{ width: '13%', borderRight: '1px solid #000', padding: '1px 2px', verticalAlign: 'middle', fontSize: '7.5pt' }}>
            Budget<br />Code
          </th>
          <th style={{ width: '48%', borderRight: '1px solid #000', padding: '1px 3px', verticalAlign: 'middle', fontSize: '8pt' }}>
            Object of Expenditure
          </th>
          <th style={{ width: '17%', borderRight: '1px solid #000', padding: '1px 2px', verticalAlign: 'middle', fontSize: '7.5pt' }}>
            EDP Code
          </th>
          <th style={{ width: '22%', padding: '0', verticalAlign: 'middle' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #000', padding: '0.5px 0', fontSize: '7.5pt', fontWeight: 700 }}>
              Amount
            </div>
            <div style={{ display: 'flex', fontSize: '7pt', fontWeight: 700 }}>
              <span style={{ flex: '1 1 65%', textAlign: 'center', borderRight: '1px solid #000', padding: '0.5px 0' }}>Rs.</span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', padding: '0.5px 0' }}>Ps.</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {data.expenditureItems.map((item, idx) => {
          // If this is electricity or office expenses and there's a partyTotal, allocate if item has amount or matching
          const itemAmount = item.amount;
          const s = splitAmount(itemAmount);

          return (
            <tr key={idx} style={{ height: '12.8px', borderBottom: '1px solid #000' }}>
              <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '0 2px', fontSize: '7.5pt', fontWeight: 600 }}>
                {item.code}
              </td>
              <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '7.5pt', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </td>
              <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '0 2px' }}>
                {renderEDPCode(item.edpCode)}
              </td>
              <td style={{ padding: '0' }}>
                <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
                  <span
                    style={{
                      flex: '1 1 65%',
                      textAlign: 'right',
                      paddingRight: '2px',
                      borderRight: '1px solid #000',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '8pt',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {s.rs}
                  </span>
                  <span
                    style={{
                      flex: '1 1 35%',
                      textAlign: 'center',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      fontSize: '7.5pt',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.ps}
                  </span>
                </div>
              </td>
            </tr>
          );
        })}

        {/* GROSS TOTAL */}
        <tr style={{ height: '14px', borderBottom: '1px solid #000', fontWeight: 700 }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '8pt' }}>
            GROSS TOTAL
          </td>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontSize: '8pt' }}>
                {grossSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '7.5pt' }}>
                {grossSplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Deduction / Income Tax */}
        <tr style={{ height: '13px', borderBottom: '1px solid #000' }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '7.5pt' }}>
            Deduction/Income Tax
          </td>
          <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '0 2px' }}>
            {renderEDPCode('9 5 1 0 -')}
          </td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '8pt' }}>
                {itSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '7.5pt' }}>
                {itSplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Surcharge on Income Tax */}
        <tr style={{ height: '13px', borderBottom: '1px solid #000' }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '7.5pt' }}>
            Surcharge on Income Tax
          </td>
          <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '0 2px' }}>
            {renderEDPCode('9 5 2 0 -')}
          </td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '8pt' }}>
                {surSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '7.5pt' }}>
                {surSplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Security Deposits */}
        <tr style={{ height: '13px', borderBottom: '1px solid #000' }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '7.5pt' }}>
            Security Deposits
          </td>
          <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '0 2px' }}>
            {renderEDPCode('9 6 0 0 -')}
          </td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '8pt' }}>
                {sdSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '7.5pt' }}>
                {sdSplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Total 'A' */}
        <tr style={{ height: '13px', borderBottom: '1px solid #000', fontWeight: 600 }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '7.5pt' }}>
            Total &apos;A&apos;
          </td>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontSize: '8pt' }}>
                {totalASplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '7.5pt' }}>
                {totalASplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Miscellaneous Recoveries */}
        <tr style={{ height: '13px', borderBottom: '1px solid #000' }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '7.5pt' }}>
            Miscellaneous Recoveries
          </td>
          <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '0 2px' }}>
            {renderEDPCode('9 9 1 0 -')}
          </td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '8pt' }}>
                {miscSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '7.5pt' }}>
                {miscSplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Total Decuction (Spelled exactly as in PDF) */}
        <tr style={{ height: '13.5px', borderBottom: '1px solid #000', fontWeight: 700 }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '8pt' }}>
            Total Decuction
          </td>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontSize: '8pt' }}>
                {totDedSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '7.5pt' }}>
                {totDedSplit.ps}
              </span>
            </div>
          </td>
        </tr>

        {/* Net Amount */}
        <tr style={{ height: '14.5px', fontWeight: 700 }}>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ borderRight: '1px solid #000', padding: '0 3px', fontSize: '8pt' }}>
            Net Amount
          </td>
          <td style={{ borderRight: '1px solid #000' }}></td>
          <td style={{ padding: '0' }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <span style={{ flex: '1 1 65%', textAlign: 'right', paddingRight: '2px', borderRight: '1px solid #000', fontFamily: "'Courier New', monospace", fontSize: '8pt' }}>
                {netSplit.rs}
              </span>
              <span style={{ flex: '1 1 35%', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '7.5pt' }}>
                {netSplit.ps}
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

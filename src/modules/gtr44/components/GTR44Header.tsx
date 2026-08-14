import React from 'react';
import { GTR44FormData } from '../types';

interface GTR44HeaderProps {
  data: GTR44FormData;
  onUpdateField?: (field: keyof GTR44FormData, val: string) => void;
  readOnly?: boolean;
}

export const GTR44Header: React.FC<GTR44HeaderProps> = ({ data }) => {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", color: '#000000', fontSize: '9pt', lineHeight: 1.25 }}>
      {/* Topmost Reference Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
        <div style={{ fontSize: '7.5pt', lineHeight: 1.2 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>G. P. Rjt., Sr. 10 Std.-108 2-2009 5,00,000 A4* PP-BI</p>
          <p style={{ margin: 0, fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7.5pt' }}>
            ના.વિ.યાદી પત્ર ક્રમાંક : તજર-૧૦૦૪-૧૨૨૬-ઝ-૮૪૭ (૦૫) તા. ૨-૧-૨૦૦૬.
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8.5pt', fontWeight: 700 }}>
          Genl. 15 e. & g.
        </div>
      </div>

      {/* Main Form Title */}
      <div style={{ textAlign: 'center', margin: '1px 0 3px 0' }}>
        <h1 style={{ fontSize: '14pt', fontWeight: 700, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
          FORM G. T. R. 44
        </h1>
        <p style={{ fontSize: '9pt', fontStyle: 'italic', margin: '1px 0 0 0' }}>
          (See Rule 208)
        </p>
      </div>

      {/* Bill Register No. on Right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '9pt' }}>
          <span style={{ fontWeight: 600 }}>Bill Register No.&nbsp;</span>
          <span
            style={{
              display: 'inline-block',
              width: '110px',
              borderBottom: '1px solid #000',
              fontWeight: 700,
              paddingLeft: '4px',
              minHeight: '14px',
            }}
          >
            {data.billRegisterNo}
          </span>
        </div>
      </div>

      {/* Transit Reg & Token Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '64% 36%', rowGap: '2px', marginBottom: '4px', fontSize: '9pt' }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span>Bill Transit Reg. Sr. No.&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '60px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.billTransitRegNo1}
          </span>
          <span style={{ marginLeft: '12px' }}>Date&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '65px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.billTransitDate1}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start' }}>
          <span>Token No.&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '50px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.tokenNo1}
          </span>
          <span style={{ marginLeft: '10px' }}>Date :&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '60px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.tokenDate1}
          </span>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span>Bill Transit Reg. Sr. No.&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '60px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.billTransitRegNo2}
          </span>
          <span style={{ marginLeft: '12px' }}>Date&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '65px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.billTransitDate2}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start' }}>
          <span>Token No.&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '50px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.tokenNo2}
          </span>
          <span style={{ marginLeft: '10px' }}>Date :&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', width: '60px', fontWeight: 700, paddingLeft: '2px', minHeight: '13px' }}>
            {data.tokenDate2}
          </span>
        </div>
      </div>

      {/* Office & Details Block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px', fontSize: '9pt' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Office of the&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '4px',
              minHeight: '14px',
            }}
          >
            {data.officeName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>
            Detailed Bill of Contingent Charges of Fully vouched contingent charges for the month of&nbsp;
          </span>
          <span
            style={{
              borderBottom: '1px solid #000',
              flex: 1,
              fontWeight: 700,
              textAlign: 'center',
              paddingLeft: '4px',
              minHeight: '14px',
            }}
          >
            {data.monthOf}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Name of the Treasury&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '4px',
              minHeight: '14px',
            }}
          >
            {data.treasuryName}
          </span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { GTR44FormData } from '../types';

interface GTR44HeaderProps {
  data: GTR44FormData;
  onUpdateField?: (field: keyof GTR44FormData, val: string) => void;
  readOnly?: boolean;
}

export const GTR44Header: React.FC<GTR44HeaderProps> = ({ data }) => {
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", color: '#000000', fontSize: '10pt', lineHeight: 1.25 }}>
      {/* Topmost Reference Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
        <div style={{ fontSize: '8.5pt', lineHeight: 1.2 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>G. P. Rjt., Sr. 10 Std.-108 2-2009 5,00,000 A4* PP-BI</p>
          <p style={{ margin: 0, fontFamily: "'Noto Serif Gujarati', serif", fontSize: '8.5pt' }}>
            ના.વિ.યાદી પત્ર ક્રમાંક : તજર-૧૦૦૪-૧૨૨૬-ઝ-૮૪૭ (૦૫) તા. ૨-૧-૨૦૦૬.
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9.5pt', fontWeight: 700 }}>
          Genl. 15 e. & g.
        </div>
      </div>

      {/* Main Form Title */}
      <div style={{ textAlign: 'center', margin: '1px 0 3px 0' }}>
        <h1 style={{ fontSize: '15pt', fontWeight: 700, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
          FORM G. T. R. 44
        </h1>
        <p style={{ fontSize: '10pt', fontStyle: 'italic', margin: '1px 0 0 0' }}>
          (See Rule 208)
        </p>
      </div>

      {/* Transit Reg / Token / Bill Register Grid - matches actual GTR-44 form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '30% 18% 17% 35%',
          rowGap: '2px',
          columnGap: '6px',
          marginBottom: '4px',
          fontSize: '10pt',
          alignItems: 'baseline',
        }}
      >
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Bill Transit Reg. Sr. No.&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '55px',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
            }}
          >
            {data.billTransitRegNo1}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Date&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '55px',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
            }}
          >
            {data.billTransitDate1}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Token No.&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '45px',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
            }}
          >
            {data.tokenNo1}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <span style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '9pt' }}>Bill Register No.&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '120px',
              maxWidth: '150px',
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
              textAlign: 'center',
              fontSize: '9pt',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
            title={data.billRegisterNo}
          >
            {data.billRegisterNo}
          </span>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Bill Transit Reg. Sr. No.&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '55px',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
            }}
          >
            {data.billTransitRegNo2}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Date&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '55px',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
            }}
          >
            {data.billTransitDate2}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Token No.&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '45px',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
            }}
          >
            {data.tokenNo2}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Date :&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              minWidth: '90px',
              fontWeight: 700,
              paddingLeft: '2px',
              minHeight: '13px',
              textAlign: 'center',
            }}
          >
            {data.billRegisterDate}
          </span>
        </div>
      </div>

      {/* Office & Details Block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px', fontSize: '10pt' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Office of the&nbsp;</span>
          <span
            style={{
              borderBottom: '1px solid #000',
              flex: 1,
              fontWeight: 700,
              paddingLeft: '4px',
              minHeight: '15px',
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
              minHeight: '15px',
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
              minHeight: '15px',
            }}
          >
            {data.treasuryName}
          </span>
        </div>
      </div>
    </div>
  );
};

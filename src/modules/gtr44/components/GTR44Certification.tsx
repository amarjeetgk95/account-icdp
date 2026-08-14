import React from 'react';
import { GTR44FormData } from '../types';
import { formatIndianCurrency } from '../utils/gtr44Utils';

interface GTR44CertificationPage3Props {
  data: GTR44FormData;
}

export const GTR44CertificationPage3: React.FC<GTR44CertificationPage3Props> = ({ data }) => {
  return (
    <div
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '10.5pt',
        lineHeight: 1.42,
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      {/* 1 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>1.</strong> I certify that the expenditure charged in this Bill could not, with due regard to the interest of the public service be avoided. I certify that, to the best of my knowledge and belief the payments entered in the Bill have been duly made to the parties entitled to receive them, with the exceptions noted below which exceed the balance of the Permanent Advance, and will be paid on receipt of the money drawn on this Bill, Vouchers for all sums above Rs. 1000 in amount are attached to the Bill, save those noted, below, which will be forwarded as soon as the amounts have been paid. I have as far as possible obtained vouchers for others sums, and I am responsible that they have been destroyed or so defected, or multilated that they cannot be used again. All works bills are annexed.
        </p>
      </div>

      {/* 2 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>2.</strong> Certified that I have personally checked the progressive total in the Bill with that in the contingent registeres and found to agree.
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '9.5pt', margin: '3px 0 0 0' }}>
          G. R. F. D. No. 1722 dated 23-12-1922.
        </p>
      </div>

      {/* 3 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>3.</strong> Certified that this bill <span style={{ textDecoration: 'line-through' }}>included charge amounting</span> does not include charges to Rs.&nbsp;
          <span style={{ display: 'inline-block', minWidth: '110px', borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>
            {data.cert3Amount ? formatIndianCurrency(data.cert3Amount) : ''}
          </span>
          &nbsp;on account of Municipal sanitary and water taxes for hired or Government residential quarters which are recoverable from the occupants. The amount so recoverable&nbsp;
          <span style={{ textDecoration: 'underline' }}>has been</span> / <span style={{ textDecoration: 'line-through' }}>will be</span> recovered by deductions from contingent bill
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '9.5pt', margin: '3px 0 0 0' }}>
          (A. G.&apos;s Geal. Letter No. 7, (H. A. : 650) dated 28-9-1925 and G. D. No. 6 T. M. 29-C-2679, dated 27-1-33).
        </p>
      </div>

      {/* 4 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>4.</strong> I certify that the coolies engaged on manual labour and paid at daily or monthly rate for whom charges have been included in this bill were actually enterained and paid.
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '9.5pt', margin: '3px 0 0 0' }}>
          (Item 10 of appendix 13 of audit code Vol. II).
        </p>
      </div>
    </div>
  );
};

interface GTR44CertificationPage4Props {
  data: GTR44FormData;
}

export const GTR44CertificationPage4: React.FC<GTR44CertificationPage4Props> = ({ data }) => {
  return (
    <div
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '10.5pt',
        lineHeight: 1.4,
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      {/* 5 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>5.</strong> I certify that the purchases billed for have been received in good order, that quantities are correct and their quality good that the rates paid are not in excess or the accepted and the market rates and that suitable notes of payment have been recorded against the original indents and invoices concerned to prevent double payments.
        </p>
        <p style={{ fontSize: '9.5pt', margin: '3px 0 0 0' }}>
          (G. R. F. D. No. 6043 dated 9-5-1928)
        </p>
      </div>

      {/* 6 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>6.</strong> Certified that the expenditure on conveyance hire included in this bill was actually incurred was unavoidable and is within the scheduled scale of charges for the conveyance used.
        </p>
      </div>

      {/* 7 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>7.</strong> Certified that all bhatta to witnesses has been paid strictly in accordance with the scale laid down by Government.
        </p>
      </div>

      {/* 8 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>8.</strong> Certify that the monetary or quantitative limits prescribed by the Government in respect of items of contingencies included in the bill have not been exceeded.
        </p>
      </div>

      {/* Pay to and Specimen signature area */}
      <div style={{ display: 'grid', gridTemplateColumns: '58% 42%', rowGap: '6px', fontSize: '10.5pt' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span>Pay to&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', flex: 1, minHeight: '16px', fontWeight: 700, paddingLeft: '4px' }}>
            {data.payToName}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>whose specimen&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span style={{ fontStyle: 'italic' }}>({data.payToDesignation || 'Designation'})</span>
        </div>

        <div style={{ paddingTop: '10px' }}>
          <p style={{ margin: '0 0 4px 0' }}>Signature is hereby attested.</p>
          <p style={{ margin: '18px 0 0 0', fontWeight: 700 }}>Signature of Messenger.</p>
        </div>
        <div style={{ textAlign: 'right', paddingTop: '10px' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Signature of Drawing Officer,</p>
        </div>
      </div>

      {/* Drawing Officer and E.E. Received Contents */}
      <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', fontSize: '10.5pt' }}>
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Signature of Drawing Officer,</p>
          <p style={{ margin: '18px 0 0 0' }}>
            Dated <span style={{ display: 'inline-block', borderBottom: '1px solid #000', width: '110px', textAlign: 'center', fontWeight: 700 }}>{data.billDated}</span> 20
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>E. E. and Received Contents.</p>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Drawing Officer or Head of Office.</p>
          <p style={{ margin: '0', fontWeight: 600 }}>Cardex Code No...... <span style={{ fontWeight: 700 }}>{data.ddoCardexCode}</span></p>
        </div>
      </div>

      {/* Passed for Rs */}
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '10.5pt' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Passed for Rs. :&nbsp;</span>
        <span
          style={{
            borderBottom: '1px solid #000',
            flex: 1,
            fontWeight: 700,
            paddingLeft: '4px',
            minHeight: '16px',
          }}
        >
          {data.passedForAmount ? `${formatIndianCurrency(data.passedForAmount)} (${data.passedForAmountWords})` : ''}
        </span>
        <span style={{ whiteSpace: 'nowrap', marginLeft: '6px' }}>Rupees.</span>
      </div>

      {/* 9 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>9.</strong> I certify that in suport of every charges upto Rs. 1000 made in this bill a receipt or other voucher has been given to me and now in my Possession duly cancelled. The receipt and voucher for items in excess of Rs. 1000/- are attached to the bill duly cancelled that they cannot be again used to support claims against the Government. A work bill are also appended.
        </p>
      </div>

      {/* Countersigning signature */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10.5pt' }}>
        <div style={{ textAlign: 'center', width: '240px' }}>
          <p style={{ margin: '0 0 2px 0', fontWeight: 700 }}>Signature</p>
          <p style={{ margin: '0 0 2px 0' }}>of countersining officer.</p>
          <p style={{ margin: '0 0 2px 0' }}>(Office) <span style={{ fontWeight: 700 }}>{data.countersigningOffice || ''}</span></p>
          <p style={{ margin: '12px 0 0 0' }}>
            Dated <span style={{ display: 'inline-block', borderBottom: '1px solid #000', width: '100px', textAlign: 'center' }}>{data.countersigningDate || ''}</span> 20
          </p>
        </div>
      </div>

      {/* Divider + AG's Office Section */}
      <div>
        <div style={{ borderTop: '1px solid #000', margin: '0 0 14px 0' }}></div>
        <div style={{ fontSize: '10.5pt' }}>
          <p style={{ textAlign: 'center', fontWeight: 700, fontStyle: 'italic', margin: '0 0 10px 0', fontSize: '11pt', textDecoration: 'underline' }}>
            For use in AG&apos;s Office
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '420px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ width: '200px' }}>Total Amount of the Bill Rs.</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, fontWeight: 700, paddingLeft: '4px', minHeight: '16px' }}>
                {data.agTotalAmount ? formatIndianCurrency(data.agTotalAmount) : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ width: '200px' }}>Admitted Rs.</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, fontWeight: 700, paddingLeft: '4px', minHeight: '16px' }}>
                {data.agAdmittedAmount ? formatIndianCurrency(data.agAdmittedAmount) : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ width: '200px' }}>Objeected to Rs.</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, fontWeight: 700, paddingLeft: '4px', minHeight: '16px' }}>
                {data.agObjectedAmount ? formatIndianCurrency(data.agObjectedAmount) : ''}
              </span>
            </div>
          </div>

          {/* Auditor & Superintendent Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '11pt', paddingTop: '16px' }}>
            <span>Auditor</span>
            <span style={{ paddingRight: '40px' }}>Superintendent.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, formatMoneyInteger, formatWordsCertificate } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page2Certificate: React.FC<Props> = ({ data }) => {
  const totals = billTotals(data);

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-2">
      {/* Exact replica of original PDF Certificate page - monochrome, Times, no color boxes */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '10mm 10mm 8mm 10mm', fontFamily: "'Times New Roman', Times, serif", color: '#000', fontSize: '9.5pt', lineHeight: 1.55 }}>
        <h2 style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: '3px', margin: '0 0 18px 0', letterSpacing: '0.8px' }}>
          CERTIFICATE
        </h2>

        <div style={{ fontSize: '9.5pt', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 12px 0', textAlign: 'justify' }}>
            <strong>1)</strong> Received contents of Rs. <strong>{formatMoneyInteger(totals.net)}</strong> ( <strong>{formatWordsCertificate(totals.net)}</strong> )
          </p>
          <p style={{ margin: '0 0 12px 0', textAlign: 'justify' }}>
            <strong>2)</strong> Certified that Pay &amp; Allowances drawn in this Bill are due and admissible as per rules &amp; authority in force.
          </p>
          <p style={{ margin: '0 0 12px 0', textAlign: 'justify' }}>
            <strong>3)</strong> Certified that I have satisfied myself that all emoluments in bill drawn 1/2/3 months previous to this date except those which have been short drawn in this bill or kept in my personal custody have been disbursed to the proper persons and acquittances taken and filed in my office with receipt stamp duly cancelled for every payment in excess of Rs. 5,000/00.
          </p>
          <p style={{ margin: '0 0 12px 0', textAlign: 'justify' }}>
            <strong>4)</strong> Certified that all appointments and promotions grant of leave (Departure on &amp; return from) and the period of suspension and the deputation and other events which are required to be recorded have been recorded in the Service Book and Leave Account.
          </p>
          <p style={{ margin: '0 0 16px 0', textAlign: 'justify' }}>
            <strong>5)</strong> Certified that persons who have been newly appointed possess the required qualifications and are within the prescribed age limit and medical certificate obtained in respect of all persons who have completed six months service.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '38% 62%', marginTop: '26px', alignItems: 'flex-start', fontSize: '9pt' }}>
          <div style={{ lineHeight: 1.5 }}>
            <div>Station : <strong>{data.station || 'Surat'}</strong></div>
            <div style={{ marginTop: '3px' }}>Date : <strong>{data.billDate || '16-08-2026'}</strong></div>
          </div>
          <div style={{ textAlign: 'center', lineHeight: 1.35 }}>
            <div style={{ fontWeight: 600, marginBottom: '18px', fontSize: '8pt' }}>Signature &amp; Designation of Drawing Officer</div>
            <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
            <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
            <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat.'}</div>
            <div style={{ fontWeight: 600, marginTop: '2px', fontSize: '8pt' }}>CODE No.- {data.ddoCode || '299'} CARDEX- {data.cardexNo || '22'}</div>
          </div>
        </div>

        <div style={{ marginTop: '32px', fontSize: '9.5pt', borderTop: '1px solid #000', paddingTop: '10px' }}>
          Please pay to <strong style={{ borderBottom: '1px solid #000', padding: '0 6px' }}>{data.messengerName || 'SMT S.K.RANDERI'}</strong> , <strong style={{ borderBottom: '1px solid #000', padding: '0 6px' }}>{data.messengerDesignation || 'Junior Clerk'}</strong> who has signed before me.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '45% 55%', marginTop: '28px', alignItems: 'flex-end', fontSize: '9pt' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '26px', fontWeight: 600, fontSize: '8pt' }}>Signature of Authorised Messenger</div>
            <div style={{ borderBottom: '1px solid #000', width: '200px' }}>&nbsp;</div>
          </div>
          <div style={{ textAlign: 'center', lineHeight: 1.35 }}>
            <div style={{ fontWeight: 600, marginBottom: '18px', fontSize: '8pt' }}>Signature &amp; Designation of Drawing Officer</div>
            <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
            <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
            <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat.'}</div>
            <div style={{ fontWeight: 600, marginTop: '2px', fontSize: '8pt' }}>CODE No.- {data.ddoCode || '299'} CARDEX- {data.cardexNo || '22'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

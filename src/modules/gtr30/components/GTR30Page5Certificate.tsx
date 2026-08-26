import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, formatMoneyInteger, formatWordsCertificate } from '../services/gtr30Calc.service';
import {
  toGujaratiNumerals,
  formatDateForBox,
  formatDateStandardGujarati,
  formatWordsCertificateGujarati,
} from '@/shared/utilities/gujaratiFormat';

function getTodayDateFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

interface Props {
  data: GTR30FormData;
}

export const GTR30Page5Certificate: React.FC<Props> = ({ data }) => {
  const totals = billTotals(data);

  const stationGu =
    data.station === 'Surat' || !data.station
      ? 'સુરત'
      : toGujaratiNumerals(data.station);

  const messengerNameEn = data.messengerName || 'SMT S.K.RANDERI';
  const messengerDesigEn = data.messengerDesignation || 'Junior Clerk';
  const messengerFullEn = `${messengerNameEn}${messengerDesigEn ? `, ${messengerDesigEn}` : ''}`;

  const messengerNameGu =
    data.messengerName === 'SMT S.K.RANDERI' || !data.messengerName
      ? 'શ્રીમતિ એસ.કે.રાંદેરી'
      : data.messengerName;
  const messengerDesigGu =
    data.messengerDesignation === 'Junior Clerk' || !data.messengerDesignation
      ? 'જુનિયર ક્લાર્ક'
      : data.messengerDesignation;
  const messengerFullGu = `${messengerNameGu}${messengerDesigGu ? `, ${messengerDesigGu}` : ''}`;

  const displayDateEn = data.billDate?.trim()
    ? formatDateForBox(data.billDate) || data.billDate.trim()
    : getTodayDateFormatted();
  const displayDateGu =
    formatDateStandardGujarati(displayDateEn) || toGujaratiNumerals(displayDateEn);

  const renderDrawingOfficerStamp = () => {
    const officerName = data.drawingOfficerName || 'Smt S V Solanki';
    const officerDesig = data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer';
    const officerOffice = data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat';
    const cardex = data.cardexNo || '22';

    return (
      <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
        <div style={{ height: '24px' }} /> {/* Dedicated space for Drawing Officer stamp/signature */}
        <div style={{ fontWeight: 700, fontSize: '7.4pt' }}>({officerName})</div>
        {officerDesig && <div style={{ fontSize: '7.2pt' }}>{officerDesig}</div>}
        {officerOffice && <div style={{ fontSize: '7.2pt' }}>{officerOffice}</div>}
        <div style={{ marginTop: '2px', fontWeight: 600, fontSize: '7.4pt' }}>
          Cardex Code No. <strong>{cardex}</strong>
        </div>
      </div>
    );
  };

  return (
    <div
      className="gtr30-page gtr30-landscape gtr30-page-4-cert"
      id="gtr30-page-5-cert"
      style={{
        background: '#ffffff',
        padding: '4.5mm 7mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '7.8pt',
        lineHeight: 1.35,
        color: '#000000',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '50% 50%',
          gap: '16px',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* ======================= LEFT HALF (ACCOMMODATES ALL CONTENT) ======================= */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            paddingRight: '6px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header Title */}
          <h2
            style={{
              textAlign: 'center',
              fontSize: '11.5pt',
              fontWeight: 900,
              textDecoration: 'underline',
              margin: '0 0 6px 0',
              letterSpacing: '0.6px',
            }}
          >
            CERTIFICATE
          </h2>

          {/* Points 1 to 5 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5.5px' }}>
            {/* Point 1 */}
            <div>
              <div style={{ fontSize: '7.6pt', lineHeight: 1.32 }}>
                1. Received Contents Rs.{' '}
                <strong>{totals.net > 0 ? formatMoneyInteger(totals.net) : '__________________________'}</strong> (in words){' '}
                <strong>{totals.net > 0 ? formatWordsCertificate(totals.net) : '________________________________'}</strong>
              </div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7.2pt', lineHeight: 1.32, marginTop: '1.5px' }}>
                ૧. અંદર જણાવેલી વિગતે રૂા.{' '}
                <strong>{totals.net > 0 ? toGujaratiNumerals(formatMoneyInteger(totals.net)) : '__________________________'}</strong> (શબ્દોમાં) અંકે રૂપિયા{' '}
                <strong>{totals.net > 0 ? formatWordsCertificateGujarati(totals.net) : '________________________________'}</strong> પૂરા મળ્યા છે.
              </div>
            </div>

            {/* Point 2 */}
            <div>
              <div style={{ fontSize: '7.6pt', lineHeight: 1.32 }}>
                2. Certified that pay and Allowances drawn in this bill are due and admissible as per rules and authority in force.
              </div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7.2pt', lineHeight: 1.32, marginTop: '1.5px' }}>
                ૨. પ્રમાણિત કરવામાં આવે છે કે આ બિલમાં આકારેલ પગાર અને ભથ્થા વર્તમાન નિયમો અને અધિકૃત કર્યા પ્રમાણે મળવાપાત્ર અને લેણાં છે.
              </div>
            </div>

            {/* Point 3 */}
            <div>
              <div style={{ fontSize: '7.6pt', lineHeight: 1.32 }}>
                3. Certified that I have satisfied myself that all emoluments in bill drawn 1/2/3 months previous to this date except those which have been short drawn in this bill or kept in my personal custody have been disbursed to the proper persons and acquittances taken and filed in my office with receipt stamp duly cancelled for every payment in excess of Rs. 5000-00.
              </div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7.2pt', lineHeight: 1.32, marginTop: '1.5px' }}>
                ૩. પ્રમાણિત કરવામાં આવે છે કે જેની રકમ આ બિલમાં ઓછી આકારવામાં આવી છે, અથવા મારા અંગત કબજામાં રાખી છે. એ સિવાયના આ તારીખથી ૧/૨/૩ મહિના પહેલાં આકારેલા બિલોની તમામ રકમ સંબંધિત વ્યક્તિઓને ચૂકવી છે અને તેમની ચૂકતી પહોંચ લેવામાં આવી છે. અને રૂા. ૫૦૦૦-૦૦ થી વધુ રકમની દરેક ચૂકવણી માટે વિધિવત રદ થયેલ પહોંચ સ્ટેમ્પ સાથે મારી કચેરીમાં દફતરે કરી છે તેની ખાતરી મેં કરી છે.
              </div>
            </div>

            {/* Point 4 */}
            <div>
              <div style={{ fontSize: '7.6pt', lineHeight: 1.32 }}>
                4. Certified that all appointments and promotions grant of leave (Departure on and return from) and the period of suspension and the deputation and other events which are required to be recorded have been recorded in the Service Book and leave account.
              </div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7.2pt', lineHeight: 1.32, marginTop: '1.5px' }}>
                ૪. પ્રમાણિત કરવામાં આવે છે કે બધી નિમણૂકો અને બઢતીઓ, આપેલી રજા, (રજા ઉપર ઉતર્યા તારીખ અને રજા પછી હાજર થયા તારીખ) અને ફરજ મોકૂફી અને પ્રતિનિયુક્તિની મુદત અને સેવાપોથીમાં નોંધવી જરૂરી હોય તેવી બીજી બાબતો સેવાપોથી અને રજા હિસાબમાં નોંધવામાં આવી છે.
              </div>
            </div>

            {/* Point 5 */}
            <div>
              <div style={{ fontSize: '7.6pt', lineHeight: 1.32 }}>
                5. Certified that persons who have been newly appointed possess the required qualifications and are within the prescribed age limit and medical certificate obtained in respect of all persons who have completed six months service.
              </div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7.2pt', lineHeight: 1.32, marginTop: '1.5px' }}>
                ૫. પ્રમાણિત કરવામાં આવે છે કે નવી નિમાયેલ વ્યક્તિઓ જરૂરી શૈક્ષણિક લાયકાત ધરાવે છે અને નિયત વય-મર્યાદાની અંદર છે અને જે વ્યક્તિઓને નોકરીમાં ૬ મહિના થઈ ગયા છે તે તમામ વ્યક્તિઓની બાબતમાં તબીબી પ્રમાણપત્ર મેળવવામાં આવ્યું છે.
              </div>
            </div>
          </div>

          {/* First Station/Date & Drawing Officer Signature */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '46% 54%',
              alignItems: 'flex-end',
              margin: '6px 0 4px 0',
              fontSize: '7.4pt',
              lineHeight: 1.32,
            }}
          >
            <div>
              <div>Station : <strong>{data.station || 'Surat'}</strong></div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7pt' }}>સ્થળ : <strong>{stationGu}</strong></div>
              <div style={{ marginTop: '2px' }}>
                Dated : <strong>{displayDateEn}</strong>
              </div>
              <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7pt' }}>
                તારીખ : <strong>{displayDateGu}</strong>
              </div>
            </div>
            {renderDrawingOfficerStamp()}
          </div>

          {/* Note Table: Other Object Head of Expenditure */}
          <div style={{ margin: '5px 0 4px 0' }}>
            <div style={{ fontSize: '7.2pt', fontWeight: 700, fontStyle: 'italic', marginBottom: '2.5px' }}>
              * Note : Other Object Head of expenditure
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '6.5pt' }}>
              <thead>
                <tr style={{ background: '#ffffff', textAlign: 'center', borderBottom: '1px solid #000', fontWeight: 700 }}>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', width: '56px' }}>Budget Code</th>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 5px', textAlign: 'left' }}>Object of Expenditure</th>
                  <th style={{ padding: '2px 4px', width: '60px' }}>EDP Code</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { b: '0104', name: 'Non Practice Allowance (Medical Officer)', edp: '0 1 2 8 +' },
                  { b: '0104', name: 'Nursing Allowance (Nursing Staff)', edp: '0 1 2 9 +' },
                  { b: '0104', name: 'Tribal Allowance (Dony Allowance)', edp: '0 1 3 0 +' },
                  { b: '0104', name: 'Uniform Allowance', edp: '0 1 3 1 +' },
                  { b: '0104', name: 'Washing Allowance', edp: '0 1 3 2 +' },
                  { b: '0104', name: 'Project Allowance', edp: '0 1 3 3 +' },
                  { b: '0104', name: 'Charge Allowance', edp: '0 1 3 4 +' },
                  { b: '0104', name: 'Permanent Traveling Allowance', edp: '0 1 3 6 +' },
                  { b: '0105', name: 'Orderly Allowance', edp: '0 1 3 6 +' },
                  { b: '0114', name: 'Sumptuary Allowance', edp: '0 1 1 4 +' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ height: '11.5px', borderBottom: '0.6px solid #000' }}>
                    <td style={{ borderRight: '1px solid #000', padding: '1px 3px', textAlign: 'center' }}>{row.b}</td>
                    <td style={{ borderRight: '1px solid #000', padding: '1px 4px' }}>{row.name}</td>
                    <td style={{ padding: '1px 3px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '6.5pt', fontWeight: 600 }}>{row.edp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Messenger Payment Authorization & Second DDO Signature */}
          <div style={{ margin: '5px 0 2px 0', fontSize: '7.4pt', lineHeight: 1.32 }}>
            <div>
              Please pay to <strong style={{ borderBottom: '1px solid #000', padding: '0 2px' }}>{messengerFullEn}</strong> who has signed before me.
            </div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '7pt', marginTop: '2px' }}>
              શ્રી <strong style={{ borderBottom: '1px solid #000', padding: '0 2px' }}>{messengerFullGu}</strong> ને ચુકવણી કરશો, તેઓ મારી રૂબરૂમાં સહી કરી છે.
            </div>

            {/* Bottom Row: Messenger Sign (Left) & Vertically Aligned Second DDO Stamp (Right) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '46% 54%',
                alignItems: 'flex-end',
                marginTop: '8px',
                fontSize: '7.4pt',
              }}
            >
              {/* Left: Dedicated Messenger Signature Block */}
              <div>
                <div style={{ height: '26px' }} /> {/* Dedicated space for messenger to sign */}
                <div style={{ width: '92%', borderBottom: '1px solid #000', marginBottom: '3px' }} />
                <div style={{ fontWeight: 600, fontSize: '7.4pt', lineHeight: 1.25 }}>
                  Signature of authorised Messenger
                </div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
                  (અધિકૃત સંદેશાવાહકની સહી)
                </div>
              </div>

              {/* Right: Second Drawing Officer Signature (Vertically Aligned with First DDO Sign) */}
              {renderDrawingOfficerStamp()}
            </div>
          </div>
        </div>

        {/* ======================= RIGHT HALF (COMPLETELY BLANK) ======================= */}
        <div
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            background: '#ffffff',
          }}
        />
      </div>
    </div>
  );
};

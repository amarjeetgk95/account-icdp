import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, formatMoneyInteger, formatWordsCertificate } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page5Certificate: React.FC<Props> = ({ data }) => {
  const totals = billTotals(data);

  return (
    <div className="gtr30-page gtr30-portrait" id="gtr30-page-5-cert">
      <div
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: '7.5pt',
          lineHeight: 1.3,
          color: '#000000',
          padding: '6mm 8mm',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <h2
          style={{
            textAlign: 'center',
            fontSize: '12pt',
            fontWeight: 900,
            textDecoration: 'underline',
            margin: '0 0 8px 0',
            letterSpacing: '0.6px',
          }}
        >
          CERTIFICATE
        </h2>

        {/* 5 Bilingual Certificate Points */}
        <div style={{ fontSize: '7.2pt', lineHeight: 1.25, textAlign: 'justify' }}>
          {/* Point 1 */}
          <div style={{ marginBottom: '5px' }}>
            <div>1. Received Contents Rs. <strong>{formatMoneyInteger(totals.net)}</strong> (in words) <strong>{formatWordsCertificate(totals.net)}</strong></div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
              ૧. અંદર જણાવેલી વિગતે રૂા. <strong>{formatMoneyInteger(totals.net)}</strong> (શબ્દોમાં) અંકે રૂપિયા <strong>{formatWordsCertificate(totals.net)}</strong> પૂરા મળ્યા છે.
            </div>
          </div>

          {/* Point 2 */}
          <div style={{ marginBottom: '5px' }}>
            <div>2. Certified that Pay and Allowances drawn in this bill are due and admissible as per rules and authority in force.</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
              ૨. પ્રમાણિત કરવામાં આવે છે કે આ બિલમાં આકારેલ પગાર અને ભથ્થા વર્તમાન નિયમો અને અધિકૃત કર્યા પ્રમાણે મળવાપાત્ર અને લેણાં છે.
            </div>
          </div>

          {/* Point 3 */}
          <div style={{ marginBottom: '5px' }}>
            <div>3. Certified that I have satisfied myself that all emoluments in bill drawn 1/2/3 months previous to this date except those which have been short drawn in this bill or kept in my personal custody have been disbursed to the proper persons and acquittances taken and filed in my office with receipt stamp duly cancelled for every payment in excess of Rs. 5000-00.</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
              ૩. પ્રમાણિત કરવામાં આવે છે કે જેની રકમ આ બિલમાં ઓછી આકારવામાં આવી છે, અથવા મારા અંગત કબજામાં રાખી છે. એ સિવાયના આ તારીખથી ૧/૨/૩/ મહિના પહેલાં આકારેલા બિલોની તમામ રકમ સંબંધિત, વ્યક્તિઓને ચૂકવી છે અને તેમની ચુકતે પહોંચ લેવામાં આવી છે. અને રૂા. ૫૦૦૦-૦૦ થી વધુ રકમની દરેક ચૂકવણી માટે વિધિસર રદ થયેલ પહોંચ સ્ટેમ્પ સાથે મારી કચેરીમાં દફતરે કરી છે તેની ખાતરી મેં કરી છે.
            </div>
          </div>

          {/* Point 4 */}
          <div style={{ marginBottom: '5px' }}>
            <div>4. Certified that all appointments and promotions grant of leave (Departure on and return from) and the period of suspension and the deputation and other events which are required to be recorded have been recorded in the Service Book and leave account.</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
              ૪. પ્રમાણિત કરવામાં આવે છે કે બધી નિમણૂંકો અને બઢતીઓ, આપેલી રજા, (રજા ઉપર ઉતર્યા તારીખ અને રજા પરથી હાજર થયા તારીખ) અને ફરજ મોકૂફી અને પ્રતિનિયુક્તિની મુદત અને સેવાપોથીમાં નોંધવી જરૂરી હોય તેવી બીજી બાબતો સેવાપોથી અને રજા હિસાબમાં નોંધવામાં આવી છે.
            </div>
          </div>

          {/* Point 5 */}
          <div style={{ marginBottom: '8px' }}>
            <div>5. Certified that persons who have been newly appointed possess the required qualifications and are within the prescribed age limit and medical certificate obtained in respect of all persons who have completed six months service.</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
              ૫. પ્રમાણિત કરવામાં આવે છે કે નવી નિમાયેલી વ્યક્તિઓ જરૂરી શૈક્ષણિક લાયકાત ધરાવે છે અને નિયત વય-મર્યાદાની અંદર છે અને જે વ્યક્તિઓને નોકરીમાં છ મહિના થઈ ગયા છે તે તમામ વ્યક્તિઓની બાબતમાં તબીબી પ્રમાણપત્ર મેળવવામાં આવ્યાં છે.
            </div>
          </div>
        </div>

        {/* Station, Date & DDO Signature */}
        <div style={{ display: 'grid', gridTemplateColumns: '48% 52%', marginTop: '6px', alignItems: 'flex-start', fontSize: '7.2pt' }}>
          <div>
            <div>Station : <strong>{data.station || 'Surat'}</strong></div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif" }}>સ્થળ : <strong>{data.station || 'સુરત'}</strong></div>
            <div style={{ marginTop: '2px' }}>Dated : <strong>{data.billDate || '21-08-2026'}</strong></div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif" }}>તારીખ : <strong>{data.billDate || '૨૧-૦૮-૨૦૨૬'}</strong></div>
          </div>
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontWeight: 700 }}>(Signature &amp; Designation of Drawing Officer)</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif" }}>(ઉપાડ અધિકારીની સહી અને હોદ્દો)</div>
            <div style={{ marginTop: '2px', fontWeight: 600 }}>Cardex Code No. <strong>{data.cardexNo || '22'}</strong></div>
          </div>
        </div>

        {/* Note Table: Other Object Head of Expenditure */}
        <div style={{ marginTop: '8px', fontSize: '6.5pt' }}>
          <div style={{ fontWeight: 700, fontStyle: 'italic', marginBottom: '2px' }}>
            * Note : Other Object Head of expenditure
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '6.2pt' }}>
            <thead>
              <tr style={{ background: '#ffffff', textAlign: 'center', borderBottom: '1px solid #000', fontWeight: 700 }}>
                <th style={{ borderRight: '1px solid #000', padding: '2px 4px', width: '55px' }}>Budget Code</th>
                <th style={{ borderRight: '1px solid #000', padding: '2px 6px', textAlign: 'left' }}>Object of Expenditure</th>
                <th style={{ padding: '2px 4px', width: '70px' }}>EDP Code</th>
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
                <tr key={idx} style={{ height: '11px' }}>
                  <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #e2e8f0', padding: '1px 3px', textAlign: 'center' }}>{row.b}</td>
                  <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #e2e8f0', padding: '1px 6px' }}>{row.name}</td>
                  <td style={{ borderTop: '1px solid #e2e8f0', padding: '1px 3px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '6pt' }}>{row.edp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Messenger Payment Authorization */}
        <div style={{ marginTop: '8px', fontSize: '7.2pt', lineHeight: 1.3 }}>
          <div>
            Please pay to <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.messengerName || 'SMT S.K.RANDERI'} , {data.messengerDesignation || 'Junior Clerk'}</strong> who has signed before me.
          </div>
          <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.8pt' }}>
            શ્રી <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>શ્રીમતિ એસ.કે.રાંદેરી , જુનિયર ક્લાર્ક</strong> ને ચૂકવણી કરશો, તેણે મારી રૂબરૂમાં સહી કરી છે.
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '48% 52%', marginTop: '10px', alignItems: 'flex-end', fontSize: '7.2pt' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Signature of authorised Messenger</div>
          </div>
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontWeight: 700 }}>(Signature &amp; Designation of Drawing Officer)</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif" }}>(ઉપાડ અધિકારીની સહી અને હોદ્દો)</div>
            <div style={{ marginTop: '2px', fontWeight: 600 }}>Cardex Code No. <strong>{data.cardexNo || '22'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { GTR30FormData } from '../types';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page10Pramanpatra: React.FC<Props> = ({ data }) => {
  return (
    <div className="gtr30-page gtr30-portrait" id="gtr30-page-10">
      <div
        style={{
          maxWidth: '780px',
          margin: '0 auto',
          padding: '12mm 8mm',
          fontSize: '9.5pt',
          lineHeight: 1.65,
          fontFamily: "'Noto Serif Gujarati', serif",
        }}
      >
        {/* Title */}
        <h2
          style={{
            textAlign: 'center',
            fontSize: '15pt',
            fontWeight: 800,
            textDecoration: 'underline',
            marginBottom: '26px',
            letterSpacing: '1px',
          }}
        >
          પ્રમાણપત્ર
        </h2>

        {/* 9 Numbered Points */}
        <div style={{ textAlign: 'justify' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૧.</strong>
            <div>
              બીલમાં આકારેલ પગાર ભથ્થાના તમામ સરવાળા જી.ટી.આર.૨૬૨ ની જોગવાઇ મુજબ ચકાસણી કરવામાં આવેલ છે. અને તે સાચા છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૨.</strong>
            <div>
              પગારબીલમાં વ્યવસાયવેરાની કપાત કરેલ છે, જે નવા પગાર મુજબ કુલ મળનાર રકમ ઉપરના દરે કપાત કરેલ છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૩.</strong>
            <div>
              બીલમાં જે કર્મચારીઓનું ધોલાઇ ભથ્થુ આકારવામાં આવેલ છે, તેઓ સ્વચ્છ ગણવેશ પહેરીને ફરજ પર આવતા ખાતરી કરવામાં આવેલ છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૪.</strong>
            <div>
              આ બીલમાં પરિવહન ભથ્થુ આકારવામાં આવેલ છે તેઓ કચેરીએથી એક કિલોમીટર દુર રહેતા હોવાથી કચેરીના વડાની મંજુરી અનુસાર આ ભથ્થુ આકારવામાં આવેલ છે, તેઓને સરકારી વાહનની સગવડ આપવામાં આવેલ નથી.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૫.</strong>
            <div>
              આથી પ્રમાણિત કરવામાં આવે છે કે મારી કચેરીના માહે:-નવેમ્બર-૨૦૨૪ દરમ્યાન ઉગવવામાં આવેલ બીલોની વિગતો તિજોરી કચેરીમાંથી મારી કચેરીના સંલગ્ન રેકર્ડ સાથે મેળવણું કરેલ છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૬.</strong>
            <div>
              માહે:-ડિસેમ્બર-૨૦૨૪ માટે છુટી પગાર આકારવામાં આવેલ છે, તે તમામ અધિકારી/કર્મચારીએ તે સમયે ગાળા દરમ્યાન નિયમિત ફરજ બજાવેલ છે અને તેઓ ફરજ ઉપર ગેરહાજર રહેલ નથી.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૭.</strong>
            <div>
              માહે:- ડિસેમ્બર-૨૦૨૪ ના માસનો પગાર ભથ્થાનો દાવો આકારેલ છે, જે સરકારશ્રીએ મંજુર કરેલ મહેકમ મુજબ જ આકારણી કરવામાં આવેલ છે, અને આ પગાર ભથ્થાનો દાવો આ અગાઉ આકારવામાં કે ઉગવવામાં આવેલ નથી, તેમજ તેની નોંધ પગાર રજીસ્ટર એ/બી/સી માં કરવામાં આવેલ છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૮.</strong>
            <div>
              પગારબીલમાં મંજુર થયેલ મહેકમ કાયમી/હંગામી જગ્યાની વિગતો દર્શાવવામાં આવેલ છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૯.</strong>
            <div>
              {data.daResolutionText ||
                'સરકારશ્રીના નાણાં વિભાગ, સચિવાલય, ગાંધીનગરના ઠરાવ ક્રમાંક:- વલભ-૧૦૨૦૧૬-જીઓઆઈ-૭-ચ તારીખ:- ૦૪-૧૨-૨૦૨૪ થી સાતમો પગાર પંચ મુજબ ૫૩% ડીએ આકારેલ છે.'}
            </div>
          </div>
        </div>

        {/* Signature Block — refined Gujarati */}
        <div
          style={{
            marginTop: '48px',
            textAlign: 'center',
            fontSize: '9.5pt',
            lineHeight: 1.4,
            width: '360px',
            marginLeft: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 10px',
            background: '#f8fafc',
            fontFamily: "'Noto Serif Gujarati', serif",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '10pt' }}>({data.drawingOfficerNameGujarati || 'શ્રીમતિ યુ.જે.પટેલ'})</div>
          <div style={{ color: '#334155' }}>{data.drawingOfficerDesignationGujarati || 'મદદનીશ વહીવટી સહ હિસાબી અધિકારી'}</div>
          <div style={{ fontSize: '8.5pt', color: '#64748b' }}>{data.drawingOfficerOfficeGujarati || 'ઘ.પ.સુ.યોજના-સુરત'} · કાર્ડક્ષ નં:-{data.cardexNo || '૨૨'}</div>
          <div style={{ fontWeight: 700, marginTop: '6px', fontFamily: 'monospace', fontSize: '8pt', background: '#ffffff', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            કોડ.નં:-{data.ddoCode || '૨૯૯'}
          </div>
        </div>
      </div>
    </div>
  );
};

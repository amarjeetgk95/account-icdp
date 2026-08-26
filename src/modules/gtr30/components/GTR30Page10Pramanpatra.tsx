import React, { useMemo } from 'react';
import type { GTR30FormData } from '../types';
import { gtr30ParseMonthKey } from '../utils/gtr30MonthKey';
import { MONTHS } from '@/shared/constants';

interface Props {
  data: GTR30FormData;
}

const GUJARATI_MONTHS: Record<string, string> = {
  January: 'જાન્યુઆરી',
  February: 'ફેબ્રુઆરી',
  March: 'માર્ચ',
  April: 'એપ્રિલ',
  May: 'મે',
  June: 'જુન',
  July: 'જુલાઈ',
  August: 'ઓગસ્ટ',
  September: 'સપ્ટેમ્બર',
  October: 'ઓક્ટોબર',
  November: 'નવેમ્બર',
  December: 'ડિસેમ્બર',
};

const GUJARATI_DIGITS: Record<string, string> = {
  '0': '૦',
  '1': '૧',
  '2': '૨',
  '3': '૩',
  '4': '૪',
  '5': '૫',
  '6': '૬',
  '7': '૭',
  '8': '૮',
  '9': '૯',
};

function toGujaratiNumerals(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => GUJARATI_DIGITS[d] ?? d);
}

function formatMonthGu(monthOf: string, fallback: string): string {
  const parsed = gtr30ParseMonthKey(monthOf);
  if (!parsed) return fallback ? `${fallback}` : '—';
  const guMonth = GUJARATI_MONTHS[parsed.month] ?? parsed.month;
  return `${guMonth}-${toGujaratiNumerals(parsed.year)}`;
}

function prevMonthKey(monthOf: string): string | null {
  const parsed = gtr30ParseMonthKey(monthOf);
  if (!parsed) return null;
  const idx = MONTHS.indexOf(parsed.month);
  if (idx < 0) return null;

  const currentCalendarYear = (() => {
    if (idx >= 9) return parsed.year + 1;
    return parsed.year;
  })();
  const currentMonthNum = ((idx + 3) % 12) + 1;
  let prevMonthNum = currentMonthNum - 1;
  let prevYear = currentCalendarYear;
  if (prevMonthNum < 1) {
    prevMonthNum = 12;
    prevYear -= 1;
  }
  const prevIsJanMar = prevMonthNum >= 1 && prevMonthNum <= 3;
  const prevFYYear = prevIsJanMar ? prevYear - 1 : prevYear;
  const fyMonthName = MONTHS[(prevMonthNum + 8) % 12];
  return `${fyMonthName}-${prevFYYear}`;
}

export const GTR30Page10Pramanpatra: React.FC<Props> = ({ data }) => {
  const currentGu = useMemo(() => formatMonthGu(data.monthOf, 'જુલાઈ-૨૦૨૬'), [data.monthOf]);
  const prevGu = useMemo(() => {
    const prevKey = prevMonthKey(data.monthOf);
    if (!prevKey) return 'જુન-૨૦૨૬';
    return formatMonthGu(prevKey, 'જુન-૨૦૨૬');
  }, [data.monthOf]);

  return (
    <div className="gtr30-page gtr30-portrait" id="gtr30-page-10">
      <div
        style={{
          maxWidth: '680px',
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
            fontSize: '14pt',
            fontWeight: 800,
            textDecoration: 'underline',
            marginBottom: '24px',
            letterSpacing: '0.8px',
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
              આથી પ્રમાણિત કરવામાં આવે છે કે મારી કચેરીના માહે:-{prevGu} દરમ્યાન ઉગવવામાં આવેલ બીલોની વિગતો તિજોરી કચેરીમાંથી મારી કચેરીના સંલગ્ન રેકર્ડ સાથે મેળવણું કરેલ છે.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૬.</strong>
            <div>
              માહે:-{currentGu} માટે છુટી પગાર આકારવામાં આવેલ છે, તે તમામ અધિકારી/કર્મચારીએ તે સમયે ગાળા દરમ્યાન નિયમિત ફરજ બજાવેલ છે અને તેઓ ફરજ ઉપર ગેરહાજર રહેલ નથી.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', marginBottom: '13px' }}>
            <strong>૭.</strong>
            <div>
              માહે:- {currentGu} ના માસનો પગાર ભથ્થાનો દાવો આકારેલ છે, જે સરકારશ્રીએ મંજુર કરેલ મહેકમ મુજબ જ આકારણી કરવામાં આવેલ છે, અને આ પગાર ભથ્થાનો દાવો આ અગાઉ આકારવામાં કે ઉગવવામાં આવેલ નથી, તેમજ તેની નોંધ પગાર રજીસ્ટર એ/બી/સી માં કરવામાં આવેલ છે.
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
                'સરકારશ્રીના નાણાં વિભાગ, સચિવાલય, ગાંધીનગરના ઠરાવ ક્રમાંક:- વલભ-૧૦૨૦૧૬-જીઓઆઈ-૭-ચ તારીખ:- ૦૪-૧૨-૨૦૨૪ થી સાતમો પગાર પંચ મુજબ ૬૦% ડીએ આકારેલ છે.'}
            </div>
          </div>
        </div>

        {/* Signature Block */}
        <div
          style={{
            marginTop: '55px',
            textAlign: 'center',
            fontSize: '9.5pt',
            lineHeight: 1.35,
            width: '320px',
            marginLeft: 'auto',
            fontFamily: "'Noto Serif Gujarati', serif",
          }}
        >
          <div style={{ fontWeight: 700 }}>({data.drawingOfficerNameGujarati || 'શ્રીમતિ એસ.વી.સોલંકી'})</div>
          <div>{data.drawingOfficerDesignationGujarati || 'મદદનીશ વહીવટી સહ હિસાબી અધિકારી'}</div>
          <div>{data.drawingOfficerOfficeGujarati || 'ઘ.પ.સુ.યોજના-સુરત'}</div>
          <div style={{ fontWeight: 600, marginTop: '2px', fontSize: '9pt' }}>
            કાર્ડક્ષ નં:-{toGujaratiNumerals(data.cardexNo || '૨૨')} કોડ.નં:-{toGujaratiNumerals(data.ddoCode || '૨૯૯')}
          </div>
        </div>
      </div>
    </div>
  );
};

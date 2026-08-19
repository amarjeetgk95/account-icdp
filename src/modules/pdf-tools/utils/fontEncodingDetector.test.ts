import { describe, it, expect } from 'vitest';
import { analyzeTextEncoding } from './fontEncodingDetector';

describe('FontEncodingDetector', () => {
  it('correctly detects legacy 8-bit Indic font mojibake from user sample', () => {
    const userSample = `
    July-26 Fodder Exp
    Extracted with PDF.js Native Text (Vector) • Pages: 1 • Confidence: 100%
    (\\f~ ()f~ ()f~ Cit~ :ii c.t~C1
    (8?1Slfi) ~lijJfl~oll \\It~ ~Ql~ofl ~oll '4 ~~ i1111ol ~1<11clc-1 ~
    ~ ?...i ~CH~ Jf .>ti? l --' ?IQC1 illlol ( ( ~I. 11i)
    Clf?~IEJ c1 CIO'lC1?
    0102 0103 0104 ~alJ E.RC\\flSI (lfUll ?ISSJfi ~ ~~iC1? ~lc ➔ ?ilJfl<JI
    0105 0106 0107 0109 ?91l'!i cmJ
    0110 0111 0113 a ()1151,U ~Sl~IOII 5~ sils~1i) ,~ sil~i) .. 11
    1400 1600 2700 o11oll51~ ?>i
    U~'6 ~'1 Hu.a0.i q(bq ~msdl ~l'lfoll-~?C\\;-- ro~,c.0 ~ll1211 Q

    2100 ~Cl61
    0.0000
    `;

    const analysis = analyzeTextEncoding(userSample);
    expect(analysis.isGarbled).toBe(true);
    expect(analysis.gujaratiUnicodeCount).toBe(0);
  });

  it('recognizes clean English digital text as valid', () => {
    const cleanEnglish = `
    GOVERNMENT OF GUJARAT
    DISTRICT ANIMAL HUSBANDRY OFFICE, SURAT
    PAY BILL FOR THE MONTH OF MARCH 2026
    Major Head: 2403 Animal Husbandry
    Employee Name: Shri. A. K. Rathod
    Basic Pay: 105600.00 DA: 52800.00 HRA: 18000.00
    `;

    const analysis = analyzeTextEncoding(cleanEnglish);
    expect(analysis.isGarbled).toBe(false);
  });

  it('recognizes clean Gujarati Unicode digital text as valid', () => {
    const cleanGujarati = `
    ગુજરાત સરકાર - પશુપાલન વિભાગ
    સઘન પશુ સુધારણા યોજના, સુરત
    માહે: માર્ચ-૨૦૨૬ નું માસિક ખર્ચ પત્રક
    બજેટ સદર: ૨૪૦૩-૦૦-૧૦૨-૦૨-૦૦
    કુલ મંજૂર ગ્રાન્ટ: ₹ ૫,૦૦,૦૦૦
    ખર્ચ થયેલ રકમ: ₹ ૨,૪૫,૮૯૦
    `;

    const analysis = analyzeTextEncoding(cleanGujarati);
    expect(analysis.isGarbled).toBe(false);
    expect(analysis.gujaratiUnicodeCount).toBeGreaterThan(50);
  });
});

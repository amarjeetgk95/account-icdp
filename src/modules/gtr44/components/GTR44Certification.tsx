import React from 'react';
import { GTR44FormData } from '../types';
import { formatIndianCurrency } from '../utils/gtr44Utils';
import { useGTR44SettingsStore } from '../store/gtr44SettingsStore';
import { DEFAULT_GTR44_PRINT_SETTINGS } from '../store/gtr44Defaults';

function usePrintSettingsSafe(): import('../types').GTR44PrintSettings {
  const print = useGTR44SettingsStore((s) => s.printSettings);
  return print ?? DEFAULT_GTR44_PRINT_SETTINGS;
}

function formatDateYearSuffix(dateStr?: string): string {
  if (!dateStr) return ' 20';
  // If date already contains a 4-digit year (e.g. 2026-08-21 or 21/08/2026), don't append ' 20'
  if (/\b20\d{2}\b/.test(dateStr)) return '';
  return ' 20';
}

function maybeCorrectTypos(text: string, showPaperTypos: boolean): string {
  if (showPaperTypos) return text;
  // Correct known paper typos when toggle is off (best-effort)
  return text
    .replace(/registeres/g, 'registers')
    .replace(/defected/g, 'defaced')
    .replace(/multilated/g, 'mutilated')
    .replace(/enterained/g, 'entertained')
    .replace(/suport/g, 'support')
    .replace(/Possession/g, 'possession')
    .replace(/Objeected/g, 'Objected')
    .replace(/upto/g, 'up to');
}

interface GTR44CertificationPage3Props {
  data: GTR44FormData;
}

export const GTR44CertificationPage3: React.FC<GTR44CertificationPage3Props> = ({ data }) => {
  const print = usePrintSettingsSafe();
  const showTypos = print.showPaperTypos ?? true;
  const c1 = maybeCorrectTypos(print.cert1Text || DEFAULT_GTR44_PRINT_SETTINGS.cert1Text, showTypos);
  const c2 = maybeCorrectTypos(print.cert2Text || DEFAULT_GTR44_PRINT_SETTINGS.cert2Text, showTypos);
  const c3 = maybeCorrectTypos(print.cert3Text || DEFAULT_GTR44_PRINT_SETTINGS.cert3Text, showTypos);
  const c4 = maybeCorrectTypos(print.cert4Text || DEFAULT_GTR44_PRINT_SETTINGS.cert4Text, showTypos);
  const footerNote = print.footerNote;
  const gujaratiEnabled = print.gujaratiFontEnabled;
  return (
    <div
      style={{
        fontFamily: gujaratiEnabled ? "'Noto Sans Gujarati', 'Times New Roman', Times, serif" : "'Times New Roman', Times, serif",
        fontSize: '11.5pt',
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
          <strong>1.</strong> {c1}
        </p>
      </div>

      {/* 2 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>2.</strong> {c2}
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          G. R. F. D. No. 1722 dated 23-12-1922.
        </p>
      </div>

      {/* 3 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>3.</strong>{' '}
          {c3.includes('{{amount}}') ? (
            <>
              {c3.split('{{amount}}')[0]}
              <span style={{ display: 'inline-block', minWidth: '110px', borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>
                {data.cert3Amount ? formatIndianCurrency(data.cert3Amount) : ''}
              </span>
              {c3.split('{{amount}}')[1] ?? ''}
            </>
          ) : (
            <>
              <del>included charge amounting</del> does not include charges to Rs.&nbsp;
              <span style={{ display: 'inline-block', minWidth: '110px', borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>
                {data.cert3Amount ? formatIndianCurrency(data.cert3Amount) : ''}
              </span>
              &nbsp;{c3}
            </>
          )}
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          (A. G.&apos;s Geal. Letter No. 7, (H. A. : 650) dated 28-9-1925 and G. D. No. 6 T. M. 29-C-2679, dated 27-1-33).
        </p>
      </div>

      {/* 4 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>4.</strong> {c4}
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          (G. R. F. D. No. 2012 dated 9-11-1925 &amp; G. O. F. D. No. 2012 dated 24-2-1926).
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          (Note—The work &apos;and that the charges have been properly accounted for&apos; is clause 4 was omitted by G. R. F. D. No. 1722, dated 23-12-1922).
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          (G. R. F. D. No. T. M. R. 1060-B, dated 9-12-1960).
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          (Audit Code, Vol. II, Chap. 5, Para. 317).
        </p>
      </div>

      {/* Optional footer note */}
      {footerNote ? (
        <div style={{ borderTop: '1px dashed #555', paddingTop: '4px', fontSize: '9pt', fontStyle: 'italic', textAlign: 'center' }}>
          {footerNote}
        </div>
      ) : null}
    </div>
  );
};

interface GTR44CertificationPage4Props {
  data: GTR44FormData;
}

export const GTR44CertificationPage4: React.FC<GTR44CertificationPage4Props> = ({ data }) => {
  const print = usePrintSettingsSafe();
  const showTypos = print.showPaperTypos ?? true;
  const c5 = maybeCorrectTypos(print.cert5Text || DEFAULT_GTR44_PRINT_SETTINGS.cert5Text, showTypos);
  const c6 = maybeCorrectTypos(print.cert6Text || DEFAULT_GTR44_PRINT_SETTINGS.cert6Text, showTypos);
  const c7 = maybeCorrectTypos(print.cert7Text || DEFAULT_GTR44_PRINT_SETTINGS.cert7Text, showTypos);
  const c8 = maybeCorrectTypos(print.cert8Text || DEFAULT_GTR44_PRINT_SETTINGS.cert8Text, showTypos);
  const c9 = maybeCorrectTypos(print.cert9Text || DEFAULT_GTR44_PRINT_SETTINGS.cert9Text, showTypos);
  const sig = print.signaturePlaceholders;
  const stampImageUrl = print.stampImageUrl;
  const footerNote = print.footerNote;
  const gujaratiEnabled = print.gujaratiFontEnabled;

  return (
    <div
      style={{
        fontFamily: gujaratiEnabled ? "'Noto Sans Gujarati', 'Times New Roman', Times, serif" : "'Times New Roman', Times, serif",
        fontSize: '11.5pt',
        lineHeight: 1.42,
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
          <strong>5.</strong> {c5}
        </p>
      </div>

      {/* 6 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>6.</strong> {c6}
        </p>
        <p style={{ fontStyle: 'normal', fontSize: '10.5pt', margin: '3px 0 0 0' }}>
          (G. R. F. D. No. 3436, dated 10-1-1928).
        </p>
      </div>

      {/* 7 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>7.</strong> {c7}
        </p>
      </div>

      {/* 8 */}
      <div>
        <p style={{ textAlign: 'justify', margin: 0, textIndent: '16px' }}>
          <strong>8.</strong> {c8}
        </p>
      </div>

      {/* Pay to Name + Specimen Signature */}
      <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', fontSize: '11.5pt' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span>Pay to&nbsp;</span>
          <span style={{ borderBottom: '1px solid #000', flex: 1, fontWeight: 700, paddingLeft: '4px' }}>
            {data.payToName}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>whose specimen&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span style={{ fontStyle: 'italic' }}>({data.payToDesignation || 'Designation'})</span>
        </div>

        <div style={{ paddingTop: '10px' }}>
          <p style={{ margin: '0 0 4px 0' }}>Signature is hereby attested.</p>
          <p style={{ margin: '18px 0 0 0', fontWeight: 700 }}>{maybeCorrectTypos(sig.messenger, showTypos)}</p>
        </div>
        <div style={{ textAlign: 'right', paddingTop: '10px' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{maybeCorrectTypos(sig.drawingOfficer, showTypos)}</p>
        </div>
      </div>

      {/* Drawing Officer and E.E. Received Contents */}
      <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', fontSize: '11.5pt' }}>
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>{maybeCorrectTypos(sig.drawingOfficer, showTypos)}</p>
          <p style={{ margin: '18px 0 0 0' }}>
            Dated <span style={{ display: 'inline-block', borderBottom: '1px solid #000', width: '110px', textAlign: 'center', fontWeight: 700 }}>{data.billDated}</span>{formatDateYearSuffix(data.billDated)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>E. E. and Received Contents.</p>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Drawing Officer or Head of Office.</p>
          <p style={{ margin: '0', fontWeight: 600 }}>Cardex Code No...... <span style={{ fontWeight: 700 }}>{data.ddoCardexCode}</span></p>
        </div>
      </div>

      {/* Passed for Rs */}
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '11.5pt' }}>
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
          <strong>9.</strong> {c9}
        </p>
      </div>

      {/* Stamp image if provided */}
      {stampImageUrl ? (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
          <img src={stampImageUrl} alt="Office Stamp" style={{ maxHeight: '80px', maxWidth: '180px', border: '1px dashed #999', padding: '4px' }} />
        </div>
      ) : null}

      {/* Countersigning signature */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11.5pt' }}>
        <div style={{ textAlign: 'center', width: '240px' }}>
          <p style={{ margin: '0 0 2px 0', fontWeight: 700 }}>Signature</p>
          <p style={{ margin: '0 0 2px 0' }}>{maybeCorrectTypos(sig.countersigning, showTypos)}</p>
          <p style={{ margin: '0 0 2px 0' }}>(Office) <span style={{ fontWeight: 700 }}>{data.countersigningOffice || ''}</span></p>
          <p style={{ margin: '12px 0 0 0' }}>
            Dated <span style={{ display: 'inline-block', borderBottom: '1px solid #000', width: '100px', textAlign: 'center' }}>{data.countersigningDate || ''}</span>{formatDateYearSuffix(data.countersigningDate)}
          </p>
        </div>
      </div>

      {/* Divider + AG's Office Section */}
      <div>
        <div style={{ borderTop: '1px solid #000', margin: '0 0 14px 0' }}></div>
        <div style={{ fontSize: '11.5pt' }}>
          <p style={{ textAlign: 'center', fontWeight: 700, fontStyle: 'italic', margin: '0 0 10px 0', fontSize: '12pt', textDecoration: 'underline' }}>
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
              <span style={{ width: '200px' }}>{maybeCorrectTypos('Objeected to Rs.', showTypos)}</span>
              <span style={{ borderBottom: '1px solid #000', flex: 1, fontWeight: 700, paddingLeft: '4px', minHeight: '16px' }}>
                {data.agObjectedAmount ? formatIndianCurrency(data.agObjectedAmount) : ''}
              </span>
            </div>
          </div>

          {/* Auditor & Superintendent Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '12pt', paddingTop: '16px' }}>
            <span>Auditor</span>
            <span style={{ paddingRight: '40px' }}>Superintendent.</span>
          </div>
          {footerNote ? (
            <div style={{ fontSize: '9pt', color: '#555', borderTop: '1px dashed #999', paddingTop: '6px', marginTop: '12px', textAlign: 'center' }}>
              {footerNote}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

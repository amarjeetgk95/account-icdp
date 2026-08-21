import React from 'react';
import type { GTR30FormData } from '../types';

interface Props {
  data: GTR30FormData;
}

export const GTR30Page9Establishment: React.FC<Props> = ({ data }) => {
  const posts = data.establishmentPosts || [];

  const totalSanctioned = posts.reduce((s, p) => s + (p.sanctioned || 0), 0);
  const totalFilled = posts.reduce((s, p) => s + (p.filled || 0), 0);
  const totalVacant = posts.reduce((s, p) => s + (p.vacant || 0), 0);
  const totalPosts = posts.reduce((s, p) => s + (p.total || 0), 0);

  return (
    <div className="gtr30-page gtr30-portrait" id="gtr30-page-9">
      <div style={{ maxWidth: '680px', margin: '0 auto', fontSize: '9pt', lineHeight: 1.35, fontFamily: "'Noto Serif Gujarati', serif", paddingTop: '20px' }}>
        {/* Header */}
        <h2
          style={{
            textAlign: 'center',
            fontSize: '15pt',
            fontWeight: 800,
            margin: '0 0 10px 0',
            letterSpacing: '0.5px',
          }}
        >
          મહેકમની માહિતી
        </h2>

        <div style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 600, marginBottom: '4px' }}>
          કચેરીનુ નામ – નાયબ પશુપાલન નિયામકની કચેરી, ઘનિષ્ઠ પશુસુધારણા યોજના-સુરત
        </div>

        <div style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 700, marginBottom: '16px' }}>
          ૧૧૩-૯૯ આંકડાને સંગીન બનાવવાની યોજના- પ્લાન
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', marginTop: '6px' }}>
          <thead>
            <tr style={{ background: '#ffffff', textAlign: 'center', fontWeight: 700 }}>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '45px' }}>અ.નં.</th>
              <th style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'left' }}>હોદ્દો /વર્ગ</th>
              <th style={{ border: '1px solid #000', padding: '5px 4px', width: '55px' }}>વર્ગ</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', width: '85px' }}>મંજુર થયેલ<br />જગ્યા</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', width: '85px' }}>ભરાયેલ જગ્યા</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', width: '85px' }}>ખાલી જગ્યા</th>
              <th style={{ border: '1px solid #000', padding: '5px 6px', width: '85px' }}>કૂલ જગ્યા</th>
            </tr>
            <tr style={{ background: '#ffffff', textAlign: 'center', fontSize: '8pt', fontWeight: 600 }}>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}>૧</th>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}>૨</th>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}></th>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}>૬</th>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}>૭</th>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}>૮</th>
              <th style={{ border: '1px solid #000', padding: '1px 0' }}>૧૨</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, idx) => (
              <tr key={post.id || idx} style={{ verticalAlign: 'middle', height: '36px' }}>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 600 }}>
                  {post.srNo || idx + 1}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>
                  {post.designation}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
                  {post.cadreClass}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center', fontWeight: 600 }}>
                  {post.sanctioned}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center', fontWeight: 600 }}>
                  {post.filled}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center', fontWeight: 600 }}>
                  {post.vacant}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>
                  {post.total}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr style={{ background: '#ffffff', fontWeight: 800, height: '30px' }}>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}></td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'left' }}>કુલ</td>
              <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}></td>
              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{totalSanctioned}</td>
              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{totalFilled}</td>
              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{totalVacant}</td>
              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{totalPosts}</td>
            </tr>
          </tbody>
        </table>

        {/* Signature Block */}
        <div style={{ marginTop: '55px', textAlign: 'center', fontSize: '8.5pt', lineHeight: 1.3, width: '340px', marginLeft: 'auto', fontFamily: "'Times New Roman', serif" }}>
          <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'Smt. S.V.Solanki.'})</div>
          <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
          <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat'}</div>
          <div style={{ fontWeight: 600, marginTop: '2px' }}>
            Code No.-299 Cardex No.-22
          </div>
        </div>
      </div>
    </div>
  );
};


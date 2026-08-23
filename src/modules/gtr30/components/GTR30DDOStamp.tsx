import React from 'react';
import type { GTR30FormData } from '../types';

interface Props {
  data: GTR30FormData;
  instanceId?: string;
  size?: 'sm' | 'md';
}

export const GTR30DDOStamp: React.FC<Props> = ({ data, instanceId = 'stamp', size = 'sm' }) => {
  const isSmall = size === 'sm';
  return (
    <div
      id={`${instanceId}-ddo-stamp`}
      style={{
        border: '1.2px solid #000',
        borderRadius: '1mm',
        padding: isSmall ? '1mm 1.2mm' : '1.5mm 2mm',
        textAlign: 'center',
        fontFamily: "'Times New Roman', Times, serif",
        lineHeight: 1.15,
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      {data.drawingOfficerName && (
        <div style={{ fontWeight: 700, fontSize: isSmall ? '5pt' : '5.6pt' }}>({data.drawingOfficerName})</div>
      )}
      {data.drawingOfficerDesignation && (
        <div style={{ fontSize: isSmall ? '4.6pt' : '5pt', marginTop: '0.3mm' }}>{data.drawingOfficerDesignation}</div>
      )}
      {(data.drawingOfficerOffice || data.officeFullName) && (
        <div style={{ fontSize: isSmall ? '4.4pt' : '4.8pt', marginTop: '0.2mm' }}>
          {data.drawingOfficerOffice || data.officeFullName}
        </div>
      )}
      {(data.ddoCode || data.cardexNo) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2mm',
            marginTop: '0.6mm',
            fontSize: isSmall ? '4.4pt' : '5pt',
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            borderTop: '0.4px solid #000',
            paddingTop: '0.4mm',
          }}
        >
          {data.ddoCode && <span>CODE No.- {data.ddoCode}</span>}
          {data.cardexNo && <span>CARDEX- {data.cardexNo}</span>}
        </div>
      )}
    </div>
  );
};

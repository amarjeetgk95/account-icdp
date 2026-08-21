import React from 'react';
import { GTR44FormData } from '../types';
import { GTR44Page1 } from './GTR44Page1';
import { GTR44Page2 } from './GTR44Page2';
import { GTR44Page3 } from './GTR44Page3';
import { GTR44Page4 } from './GTR44Page4';

interface GTR44DocumentProps {
  data: GTR44FormData;
  viewPage?: 'all' | 'p1' | 'p2' | 'p3' | 'p4';
  containerId?: string;
  zoomLevel?: number;
  readOnly?: boolean;
}

export const GTR44Document: React.FC<GTR44DocumentProps> = ({
  data,
  viewPage = 'all',
  containerId = 'gtr44-document-container',
  zoomLevel = 1,
  readOnly = false,
}) => {
  return (
    <div id={containerId} className="gtr44-document-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Gujarati:wght@400;600;700&display=swap');

        .gtr44-document-root {
          font-family: 'Times New Roman', Times, serif;
          color: #000000;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        .gtr-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          padding: 8mm 12mm;
          margin: 0 auto 24px auto;
          background: #ffffff;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          position: relative;
          overflow: hidden;
          page-break-after: always;
          break-after: page;
        }

        .gtr-page * {
          box-sizing: border-box;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 210mm !important;
            height: auto !important;
          }

          body * {
            visibility: hidden;
          }

          .gtr44-document-root, .gtr44-document-root * {
            visibility: visible;
          }

          .gtr44-document-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print, .no-print * {
            display: none !important;
          }

          .gtr-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }

          #gtr44-page-4 {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      <div
        className="gtr44-pages-wrapper"
        style={{
          transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
        }}
      >
        {(viewPage === 'all' || viewPage === 'p1') && <GTR44Page1 data={data} readOnly={readOnly} />}
        {(viewPage === 'all' || viewPage === 'p2') && <GTR44Page2 data={data} readOnly={readOnly} />}
        {(viewPage === 'all' || viewPage === 'p3') && <GTR44Page3 data={data} readOnly={readOnly} />}
        {(viewPage === 'all' || viewPage === 'p4') && <GTR44Page4 data={data} readOnly={readOnly} />}
      </div>
    </div>
  );
};

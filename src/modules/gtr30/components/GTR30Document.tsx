import React, { useState } from 'react';
import type { GTR30FormData } from '../types';
import { GTR30Page1Outer } from './GTR30Page1Outer';
import { GTR30Page2Certificate } from './GTR30Page2Certificate';
import { GTR30Page3Inner1 } from './GTR30Page3Inner1';
import { GTR30Page4Inner2 } from './GTR30Page4Inner2';
import { GTR30Page5Rent } from './GTR30Page5Rent';
import { GTR30Page6ProfTax } from './GTR30Page6ProfTax';
import { GTR30Page7InsuranceEmp } from './GTR30Page7InsuranceEmp';
import { GTR30Page8InsuranceGroup } from './GTR30Page8InsuranceGroup';
import { GTR30Page9Establishment } from './GTR30Page9Establishment';
import { GTR30Page10Pramanpatra } from './GTR30Page10Pramanpatra';
import { Button } from '@/components/ui/button';
import { Printer, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export type GTR30PageView =
  | 'all'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'p5'
  | 'p6'
  | 'p7'
  | 'p8'
  | 'p9'
  | 'p10';

interface GTR30DocumentProps {
  data: GTR30FormData;
  defaultViewPage?: GTR30PageView;
  containerId?: string;
  showControls?: boolean;
}

export const GTR30Document: React.FC<GTR30DocumentProps> = ({
  data,
  defaultViewPage = 'all',
  containerId = 'gtr30-document-container',
  showControls = true,
}) => {
  const [activePage, setActivePage] = useState<GTR30PageView>(defaultViewPage);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handlePrint = () => {
    window.print();
  };

  const pageTabs: { key: GTR30PageView; label: string }[] = [
    { key: 'all', label: 'All 10 Pages' },
    { key: 'p1', label: 'P1: Outer Cover' },
    { key: 'p2', label: 'P2: Certificate' },
    { key: 'p3', label: 'P3: Pay Schedule (1-19)' },
    { key: 'p4', label: 'P4: Deductions (20-37)' },
    { key: 'p5', label: 'P5: Rent (ઘરભાડા)' },
    { key: 'p6', label: 'P6: Prof Tax (વ્યવસાય વેરા)' },
    { key: 'p7', label: 'P7: GIS Emp (જૂથ વીમા)' },
    { key: 'p8', label: 'P8: GIS Group (જૂથ વાઈઝ)' },
    { key: 'p9', label: 'P9: Posts (મહેકમ)' },
    { key: 'p10', label: 'P10: Pramanpatra (પ્રમાણપત્ર)' },
  ];

  return (
    <div id={containerId} className="gtr30-document-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Gujarati:wght@400;600;700;800&family=Noto+Sans+Gujarati:wght@400;600;700&display=swap');

        .gtr30-document-root {
          font-family: 'Times New Roman', Times, serif;
          color: #000000;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        .gtr30-controls-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .gtr30-page-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .gtr30-page-tab-btn {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .gtr30-page-tab-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .gtr30-page-tab-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          font-weight: 700;
        }

        .gtr30-page {
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin: 0 auto 24px auto;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          position: relative;
          color: #000000;
          page-break-after: always;
          break-after: page;
        }

        .gtr30-landscape {
          width: 297mm;
          min-height: 205mm;
          padding: 6mm 8mm;
        }

        .gtr30-portrait {
          width: 210mm;
          min-height: 292mm;
          padding: 10mm 12mm;
        }

        .vertical-header-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          font-size: 6.8pt;
          font-family: Arial, Helvetica, sans-serif;
          letter-spacing: -0.2px;
          line-height: 1.1;
          text-align: left;
          height: 155px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        .vertical-header {
          display: inline-block;
          font-size: 5.5pt;
          line-height: 1.05;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: auto !important;
            height: auto !important;
          }

          body * {
            visibility: hidden;
          }

          .gtr30-document-root, .gtr30-document-root * {
            visibility: visible;
          }

          .gtr30-document-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .gtr30-controls-bar, .no-print, .no-print * {
            display: none !important;
          }

          .gtr30-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
          }

          .gtr30-landscape {
            width: 297mm !important;
            min-height: 205mm !important;
            padding: 5mm 6mm !important;
          }

          .gtr30-portrait {
            width: 210mm !important;
            min-height: 290mm !important;
            padding: 8mm 10mm !important;
          }

          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>

      {showControls && (
        <div className="gtr30-controls-bar no-print">
          <div className="gtr30-page-tabs">
            {pageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`gtr30-page-tab-btn ${activePage === tab.key ? 'active' : ''}`}
                onClick={() => setActivePage(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded border border-slate-300 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Zoom Out"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-mono px-1.5 min-w-[40px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Zoom In"
                onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Reset Zoom"
                onClick={() => setZoomLevel(1)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button type="button" size="sm" onClick={handlePrint} className="h-8 font-semibold">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print All / Current
            </Button>
          </div>
        </div>
      )}

      <div
        className="gtr30-pages-wrapper"
        style={{
          transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
        }}
      >
        {(activePage === 'all' || activePage === 'p1') && <GTR30Page1Outer data={data} />}
        {(activePage === 'all' || activePage === 'p2') && <GTR30Page2Certificate data={data} />}
        {(activePage === 'all' || activePage === 'p3') && <GTR30Page3Inner1 data={data} />}
        {(activePage === 'all' || activePage === 'p4') && <GTR30Page4Inner2 data={data} />}
        {(activePage === 'all' || activePage === 'p5') && <GTR30Page5Rent data={data} />}
        {(activePage === 'all' || activePage === 'p6') && <GTR30Page6ProfTax data={data} />}
        {(activePage === 'all' || activePage === 'p7') && <GTR30Page7InsuranceEmp data={data} />}
        {(activePage === 'all' || activePage === 'p8') && <GTR30Page8InsuranceGroup data={data} />}
        {(activePage === 'all' || activePage === 'p9') && <GTR30Page9Establishment data={data} />}
        {(activePage === 'all' || activePage === 'p10') && <GTR30Page10Pramanpatra data={data} />}
      </div>
    </div>
  );
};

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
import { Printer, ZoomIn, ZoomOut, RotateCcw, Layers, FileText } from 'lucide-react';

type GTR30PageView =
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

  const pageTabs: { key: GTR30PageView; label: string; sub?: string }[] = [
    { key: 'all', label: 'All 10 Pages', sub: 'Full bill' },
    { key: 'p1', label: 'P1', sub: 'Outer Cover' },
    { key: 'p2', label: 'P2', sub: 'Certificate' },
    { key: 'p3', label: 'P3', sub: 'Pay 1-19' },
    { key: 'p4', label: 'P4', sub: 'Ded. 20-37' },
    { key: 'p5', label: 'P5', sub: 'Rent' },
    { key: 'p6', label: 'P6', sub: 'Prof Tax' },
    { key: 'p7', label: 'P7', sub: 'GIS Emp' },
    { key: 'p8', label: 'P8', sub: 'GIS Group' },
    { key: 'p9', label: 'P9', sub: 'Posts' },
    { key: 'p10', label: 'P10', sub: 'Pramanpatra' },
  ];

  const visibleCount = activePage === 'all' ? 10 : 1;

  return (
    <div id={containerId} className="gtr30-document-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Gujarati:wght@400;600;700;800&family=Noto+Sans+Gujarati:wght@400;600;700&family=IBM+Plex+Sans+Gujarati:wght@400;500;600&display=swap');

        .gtr30-document-root {
          font-family: 'Times New Roman', Times, serif;
          color: #0f172a;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
          --gtr-gu: 'Noto Serif Gujarati', 'Shruti', serif;
          --gtr-gu-sans: 'Noto Sans Gujarati', 'Shruti', sans-serif;
        }

        .gtr30-controls-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06);
          position: sticky;
          top: 8px;
          z-index: 20;
        }

        .gtr30-page-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          max-width: 100%;
        }

        .gtr30-page-tab-btn {
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1;
          white-space: nowrap;
        }

        .gtr30-page-tab-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-1px);
        }

        .gtr30-page-tab-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }

        .gtr30-page-tab-sub {
          font-size: 9px;
          font-weight: 500;
          opacity: 0.85;
          display: none;
        }
        @media (min-width: 1024px) {
          .gtr30-page-tab-sub { display: inline; }
        }

        .gtr30-page {
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08);
          margin: 0 auto 24px auto;
          box-sizing: border-box;
          border: 1.2px solid #000;
          position: relative;
          color: #000000;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
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

        .gtr30-pages-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }

        .vertical-header-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          font-size: 6.7pt;
          font-family: Arial, Helvetica, sans-serif;
          letter-spacing: -0.15px;
          line-height: 1.1;
          text-align: left;
          height: 152px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-weight: 600;
        }

        .vertical-header {
          display: inline-block;
          font-size: 5.5pt;
          line-height: 1.05;
        }

        /* Subtle page number footer */
        .gtr30-page::after {
          content: attr(data-page-label);
          position: absolute;
          bottom: 4mm;
          right: 8mm;
          font-size: 6.5pt;
          color: #94a3b8;
          font-family: Arial, sans-serif;
          letter-spacing: 0.3px;
        }

        /* ——— Exact replica: keep original monochrome, no tint ——— */
        .gtr30-page table {
          border-color: #000;
        }
        .gtr30-page table thead th {
          background: #ffffff;
          color: #000;
          font-weight: 700;
        }
        .gtr30-page table tbody tr {
          background: #ffffff;
        }
        /* Schedule pages (P5-P10) Gujarati header polish */
        #gtr30-page-5 table thead th,
        #gtr30-page-6 table thead th,
        #gtr30-page-7 table thead th,
        #gtr30-page-8 table thead th,
        #gtr30-page-9 table thead th {
          font-family: var(--gtr-gu), 'Noto Serif Gujarati', serif;
          letter-spacing: 0.2px;
          line-height: 1.25;
        }
        /* Portrait pages better line-height for Gujarati */
        #gtr30-page-10 {
          font-family: var(--gtr-gu), 'Noto Serif Gujarati', serif;
          line-height: 1.7;
        }
        /* Inner pay tables (P3/P4) header height consistency */
        #gtr30-page-3 thead tr:first-child th,
        #gtr30-page-4 thead tr:first-child th {
          background: #ffffff;
          border-bottom: 1.5px solid #0f172a;
        }
        /* Outer page classification boxes */
        #gtr30-page-1 table thead th {
          background: #f1f5f9;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: auto !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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

          .gtr30-pages-wrapper {
            gap: 0 !important;
            transform: none !important;
          }

          .gtr30-page {
            box-shadow: none !important;
            border: 1px solid #000 !important;
            margin: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
          }

          .gtr30-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
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
            size: A4 landscape;
            margin: 0;
          }
          /* Portrait pages need portrait orientation - handled via page size auto */
          .gtr30-portrait {
            page: auto;
          }
        }
      `}</style>

      {showControls && (
        <div className="gtr30-controls-bar no-print">
          <div className="gtr30-page-tabs" role="tablist" aria-label="GTR-30 page navigation">
            {pageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activePage === tab.key}
                className={`gtr30-page-tab-btn ${activePage === tab.key ? 'active' : ''}`}
                onClick={() => setActivePage(tab.key)}
                title={tab.sub ? `${tab.label}: ${tab.sub}` : tab.label}
              >
                {tab.key === 'all' ? <Layers size={12} aria-hidden="true" /> : <FileText size={11} aria-hidden="true" />}
                <span>{tab.label}</span>
                {tab.sub && <span className="gtr30-page-tab-sub">· {tab.sub}</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              {visibleCount} page{visibleCount > 1 ? 's' : ''} {activePage !== 'all' ? `· ${activePage.toUpperCase()}` : ''}
            </span>

            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Zoom Out (Ctrl -)"
                aria-label="Zoom out"
                onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-mono font-semibold px-2 min-w-[44px] text-center tabular-nums" aria-live="polite">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Zoom In (Ctrl +)"
                aria-label="Zoom in"
                onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Reset Zoom"
                aria-label="Reset zoom to 100%"
                onClick={() => setZoomLevel(1)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Print
            </Button>
          </div>
        </div>
      )}

      <div
        className="gtr30-pages-wrapper"
        style={{
          transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
          transformOrigin: 'top center',
          transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {(activePage === 'all' || activePage === 'p1') && <div data-page-label="GTR-30 · P1 Outer · FORM G.T.R. 30"><GTR30Page1Outer data={data} /></div>}
        {(activePage === 'all' || activePage === 'p2') && <div data-page-label="GTR-30 · P2 Certificate"><GTR30Page2Certificate data={data} /></div>}
        {(activePage === 'all' || activePage === 'p3') && <div data-page-label="GTR-30 · P3 Inner-1 (Col 1-19)"><GTR30Page3Inner1 data={data} /></div>}
        {(activePage === 'all' || activePage === 'p4') && <div data-page-label="GTR-30 · P4 Inner-2 (Col 20-39)"><GTR30Page4Inner2 data={data} /></div>}
        {(activePage === 'all' || activePage === 'p5') && <div data-page-label="GTR-30 · P5 Rent Schedule (घરભાડા)"><GTR30Page5Rent data={data} /></div>}
        {(activePage === 'all' || activePage === 'p6') && <div data-page-label="GTR-30 · P6 Prof Tax (વ્યવસાય વેરા)"><GTR30Page6ProfTax data={data} /></div>}
        {(activePage === 'all' || activePage === 'p7') && <div data-page-label="GTR-30 · P7 GIS Emp (જૂથ વીમા)"><GTR30Page7InsuranceEmp data={data} /></div>}
        {(activePage === 'all' || activePage === 'p8') && <div data-page-label="GTR-30 · P8 GIS Group (જૂથ વાઈઝ)"><GTR30Page8InsuranceGroup data={data} /></div>}
        {(activePage === 'all' || activePage === 'p9') && <div data-page-label="GTR-30 · P9 Establishment (મહેકમ)"><GTR30Page9Establishment data={data} /></div>}
        {(activePage === 'all' || activePage === 'p10') && <div data-page-label="GTR-30 · P10 Pramanpatra (પ્રમાણપત્ર)"><GTR30Page10Pramanpatra data={data} /></div>}
      </div>

      {showControls && activePage === 'all' && (
        <div className="no-print mt-4 text-center text-[11px] text-slate-400">
          Showing all 10 pages · Use tabs to focus on a single page · <span className="font-mono">Ctrl+P</span> prints the visible pages
        </div>
      )}
    </div>
  );
};

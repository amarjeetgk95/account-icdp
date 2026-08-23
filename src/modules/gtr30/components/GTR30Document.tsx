import React, { useState } from 'react';
import type { GTR30FormData } from '../types';
import { GTR30Page1Outer } from './GTR30Page1Outer';
import { GTR30Page3Inner1 } from './GTR30Page3Inner1';
import { GTR30Page4Inner2 } from './GTR30Page4Inner2';
import { GTR30Page5Certificate } from './GTR30Page5Certificate';
import { GTR30Page5Rent as GTR30Page6Rent } from './GTR30Page5Rent';
import { GTR30Page6ProfTax as GTR30Page7ProfTax } from './GTR30Page6ProfTax';
import { GTR30Page7InsuranceEmp as GTR30Page8InsuranceEmp } from './GTR30Page7InsuranceEmp';
import { GTR30Page8InsuranceGroup as GTR30Page9InsuranceGroup } from './GTR30Page8InsuranceGroup';
import { GTR30Page9Establishment as GTR30Page10Establishment } from './GTR30Page9Establishment';
import { GTR30Page10Pramanpatra as GTR30Page11Pramanpatra } from './GTR30Page10Pramanpatra';
import { Button } from '@/components/ui/button';
import { Printer, ZoomIn, ZoomOut, RotateCcw, Layers, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import { popupNativePrint } from '@/shared/utilities/nativePrint';

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

const GTR30_PAGE_IDS_MAP: Record<GTR30PageView, string[]> = {
  all: [
    'gtr30-page-1',
    'gtr30-page-3',
    'gtr30-page-4',
    'gtr30-page-5-cert',
    'gtr30-page-5',
    'gtr30-page-6',
    'gtr30-page-7',
    'gtr30-page-8',
    'gtr30-page-9',
    'gtr30-page-10',
  ],
  p1: ['gtr30-page-1'],
  p2: ['gtr30-page-3'],
  p3: ['gtr30-page-4'],
  p4: ['gtr30-page-5-cert'],
  p5: ['gtr30-page-5'],
  p6: ['gtr30-page-6'],
  p7: ['gtr30-page-7'],
  p8: ['gtr30-page-8'],
  p9: ['gtr30-page-9'],
  p10: ['gtr30-page-10'],
};

export const GTR30Document: React.FC<GTR30DocumentProps> = ({
  data,
  defaultViewPage = 'all',
  containerId = 'gtr30-document-container',
  showControls = true,
}) => {
  const [activePage, setActivePage] = useState<GTR30PageView>(defaultViewPage);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const pageIds = GTR30_PAGE_IDS_MAP[activePage] || GTR30_PAGE_IDS_MAP.all;
      const isLandscape = ['p1', 'p2', 'p3', 'p4'].includes(activePage);

      const customStyles = `
        @page {
          size: A4;
          margin: 0mm !important;
        }
        @page landscape-page {
          size: A4 landscape !important;
          margin: 0mm !important;
        }
        @page portrait-page {
          size: A4 portrait !important;
          margin: 0mm !important;
        }
        .gtr30-page {
          margin: 0 auto !important;
          border: none !important;
          box-shadow: none !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background: #ffffff !important;
        }
        .gtr30-landscape {
          page: landscape-page !important;
          width: 297mm !important;
          height: 210mm !important;
          min-height: 210mm !important;
          max-height: 210mm !important;
          padding: 12mm !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .gtr30-inner-sheet-page {
          padding: 0 !important;
          width: 297mm !important;
          height: 210mm !important;
          min-height: 210mm !important;
          max-height: 210mm !important;
        }
        .gtr30-inner-sheet-page .gtr30-inner-sheet-table {
          position: absolute !important;
          left: 4mm !important;
          top: 12mm !important;
          width: 289mm !important;
          min-width: 0 !important;
          max-width: none !important;
        }
        .gtr30-inner-sheet-page .gtr30-inner-sheet-table tbody td {
          overflow: visible !important;
          word-break: normal !important;
        }
        .gtr30-portrait {
          page: portrait-page !important;
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          padding: 12mm !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .gtr30-page-inner {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          grid-template-rows: minmax(0, 1fr) !important;
          column-gap: 7mm !important;
          align-items: stretch !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        .gtr30-half {
          position: relative !important;
          min-width: 0 !important;
          min-height: 0 !important;
          width: 100% !important;
          height: 100% !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        .gtr30-half-content {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        .gtr30-front-half > *,
        .gtr30-back-half > * {
          max-width: 100% !important;
          max-height: 100% !important;
        }
        .gtr30-front-half .gtr30-single-form,
        .gtr30-back-half .gtr30-deductions-outer-back {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
      `;

      popupNativePrint({
        elements: pageIds,
        title: `GTR30_${data.billRegisterNo || data.monthOf || 'PayBill'}`,
        pageSize: 'A4',
        pageMargin: '0mm',
        orientation: isLandscape ? 'landscape' : 'portrait',
        pageContainerSelector: '.gtr30-page',
        customStyles,
      });
    } catch (e) {
      console.error('GTR30 Native print failed, falling back to window.print', e);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const pageTabs: { key: GTR30PageView; label: string; sub?: string }[] = [
    { key: 'all', label: 'All 10 Pages', sub: 'Full bill' },
    { key: 'p1', label: 'P1', sub: 'Outer (૨૭૨)' },
    { key: 'p2', label: 'P2', sub: 'Inner Pay (૨૭૪)' },
    { key: 'p3', label: 'P3', sub: 'Inner Ded (૨૭૫)' },
    { key: 'p4', label: 'P4', sub: 'Certificate (૨૭૬)' },
    { key: 'p5', label: 'P5', sub: 'Rent (ઘરભાડા)' },
    { key: 'p6', label: 'P6', sub: 'Prof Tax (વેરો)' },
    { key: 'p7', label: 'P7', sub: 'GIS Emp (જૂથ વીમા)' },
    { key: 'p8', label: 'P8', sub: 'GIS Group' },
    { key: 'p9', label: 'P9', sub: 'Posts (મહેકમ)' },
    { key: 'p10', label: 'P10', sub: 'Pramanpatra' },
  ];

  const visibleCount = activePage === 'all' ? 10 : 1;

  return (
    <div id={containerId} className="gtr30-document-root">
      <style>{`
        .gtr30-document-root {
          font-family: 'Times New Roman', Times, serif;
          color: #0f172a;
          background: #fff;
          color-scheme: light;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
          --gtr-gu: 'Noto Serif Gujarati', 'Shruti', serif;
          --gtr-gu-sans: 'Noto Sans Gujarati', 'Shruti', sans-serif;
          --gtr-box-w: 11px;
          --gtr-box-h: 14px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .gtr30-page {
          background: #ffffff;
          margin: 0 auto 28px auto;
          box-sizing: border-box;
          border: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
          position: relative;
          color: #000000;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
        }

        .gtr30-landscape {
          width: 297mm;
          height: 210mm;
          min-height: 210mm;
          max-height: 210mm;
          padding: 12mm;
        }

        .gtr30-portrait {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          padding: 12mm;
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
          white-space: normal;
          word-break: break-word;
          font-size: 6.7pt;
          font-family: Arial, Helvetica, sans-serif;
          letter-spacing: -0.15px;
          line-height: 1.1;
          text-align: left;
          height: 152px;
          max-height: 152px;
          overflow: visible;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-weight: 600;
          flex-wrap: wrap;
          align-content: flex-start;
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
          bottom: 2mm;
          right: 4mm;
          font-size: 5.8pt;
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
        /* P3/P4 body cells - prevent bleed */
        #gtr30-page-3 tbody td,
        #gtr30-page-4 tbody td {
          font-size: 6.5pt;
          line-height: 1.1;
          overflow: hidden;
          word-break: break-word;
        }
        /* Inner pay tables (P3/P4) - allow wrap to 3rd line instead of clipping */
        #gtr30-page-3 thead tr:first-child th,
        #gtr30-page-4 thead tr:first-child th {
          background: #ffffff;
          border-bottom: 1.5px solid #000;
          overflow: visible;
          padding: 1px !important;
          vertical-align: bottom;
        }
        #gtr30-page-3 table,
        #gtr30-page-4 table {
          table-layout: fixed;
          width: 100%;
          max-width: 100%;
        }
        #gtr30-page-3 th,
        #gtr30-page-4 th {
          overflow: visible;
          word-break: break-word;
        }
        .gtr30-inner-sheet-page {
          padding: 0 !important;
          width: 297mm !important;
          height: 210mm !important;
          min-height: 210mm !important;
          max-height: 210mm !important;
        }
        .gtr30-inner-sheet-page .gtr30-inner-sheet-table {
          position: absolute !important;
          left: 4mm !important;
          top: 12mm !important;
          width: 289mm !important;
          min-width: 0 !important;
          max-width: none !important;
        }
        .gtr30-inner-sheet-page .gtr30-inner-sheet-table th,
        .gtr30-inner-sheet-page .gtr30-inner-sheet-table td {
          box-sizing: border-box !important;
        }
        .gtr30-inner-sheet-page .gtr30-inner-vertical-label {
          height: 26.5mm !important;
          max-height: none !important;
          overflow: visible !important;
          word-break: normal !important;
        }
        .gtr30-inner-sheet-page .gtr30-inner-sheet-table tbody td {
          overflow: visible !important;
          word-break: normal !important;
        }
        /* Outer page side-by-side GTR-30 layout */
        #gtr30-page-1 table thead th {
          background: #ffffff;
        }

        .gtr30-page-inner {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
          column-gap: 7mm;
          align-items: stretch;
          box-sizing: border-box;
          overflow: hidden;
        }

        .gtr30-half {
          position: relative;
          min-width: 0;
          min-height: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .gtr30-half-content {
          position: relative;
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        .gtr30-front-half > *,
        .gtr30-back-half > * {
          max-width: 100%;
          max-height: 100%;
        }

        .gtr30-front-half .gtr30-single-form,
        .gtr30-back-half .gtr30-deductions-outer-back {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .gtr30-document-root {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .gtr30-controls-bar {
            display: none !important;
          }

          .gtr30-pages-wrapper-wrapper {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .gtr30-pages-wrapper {
            display: block !important;
            gap: 0 !important;
            transform: none !important;
          }

          .gtr30-page {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            float: none !important;
            clear: both !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          .gtr30-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .gtr30-landscape {
            page: landscape-page !important;
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            padding: 12mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          .gtr30-portrait {
            page: portrait-page !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 12mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          /* Never split a table/row across sheets — keeps each form on one A4 */
          .gtr30-page table,
          .gtr30-page tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Screen-only page label chip must not appear on printed forms */
          .gtr30-page::after {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 0;
          }
          @page gtr-landscape {
            size: A4 landscape;
            margin: 0;
          }
          @page gtr-portrait {
            size: A4 portrait;
            margin: 0;
          }
          .gtr30-page.gtr30-landscape {
            page: gtr-landscape;
          }
          .gtr30-page.gtr30-portrait {
            page: gtr-portrait;
          }
        }
      `}</style>

      {showControls && (
        <div className="no-print sticky top-2 z-20 bg-white border border-slate-200 rounded-xl p-2.5 shadow-float flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-1 max-w-full" role="tablist" aria-label="GTR-30 page navigation">
            {pageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activePage === tab.key}
                className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150 whitespace-nowrap leading-none',
                  activePage === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm shadow-blue-600/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 hover:-translate-y-px'
                )}
                onClick={() => setActivePage(tab.key)}
                title={tab.sub ? `${tab.label}: ${tab.sub}` : tab.label}
              >
                {tab.key === 'all' ? <Layers size={12} aria-hidden="true" /> : <FileText size={11} aria-hidden="true" />}
                <span>{tab.label}</span>
                {tab.sub && <span className="hidden lg:inline text-[9px] font-medium opacity-85">· {tab.sub}</span>}
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
                className="h-7 w-7 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                className="h-7 w-7 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                className="h-7 w-7 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
              disabled={isPrinting}
              className="h-8 font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Printer className={`h-3.5 w-3.5 mr-1.5 ${isPrinting ? 'animate-spin' : ''}`} aria-hidden="true" /> {isPrinting ? 'Preparing Print…' : activePage === 'all' ? 'Print All (10 Pages)' : 'Print'}
            </Button>
          </div>
        </div>
      )}

      {['p1', 'p2', 'p3', 'p4'].includes(activePage) && (
        <style>{`
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
            }
          }
        `}</style>
      )}

      {['p5', 'p6', 'p7', 'p8', 'p9', 'p10'].includes(activePage) && (
        <style>{`
          @media print {
            @page {
              size: A4 portrait !important;
              margin: 0 !important;
            }
          }
        `}</style>
      )}

      <div className="gtr30-pages-wrapper-wrapper overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-4">
        <div
          className="gtr30-pages-wrapper flex flex-col gap-6 items-center min-w-[320px] will-change-transform"
          style={{
            transform: !isPrinting && zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'top center',
            transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {(activePage === 'all' || activePage === 'p1') && <div data-page-label="GTR-30 · P1 Outer (૨૭૨)"><GTR30Page1Outer data={data} /></div>}
          {(activePage === 'all' || activePage === 'p2') && <div data-page-label="GTR-30 · P2 Inner Pay 1-19 (૨૭૪)"><GTR30Page3Inner1 data={data} /></div>}
          {(activePage === 'all' || activePage === 'p3') && <div data-page-label="GTR-30 · P3 Inner Ded 20-39 (૨૭૫)"><GTR30Page4Inner2 data={data} /></div>}
          {(activePage === 'all' || activePage === 'p4') && <div data-page-label="GTR-30 · P4 Certificate Bilingual (૨૭૬)"><GTR30Page5Certificate data={data} /></div>}
          {(activePage === 'all' || activePage === 'p5') && <div data-page-label="GTR-30 · P5 Rent Schedule (ઘરભાડા)"><GTR30Page6Rent data={data} /></div>}
          {(activePage === 'all' || activePage === 'p6') && <div data-page-label="GTR-30 · P6 Prof Tax (વ્યવસાય વેરા)"><GTR30Page7ProfTax data={data} /></div>}
          {(activePage === 'all' || activePage === 'p7') && <div data-page-label="GTR-30 · P7 GIS Emp (જૂથ વીમા કર્મચારી)"><GTR30Page8InsuranceEmp data={data} /></div>}
          {(activePage === 'all' || activePage === 'p8') && <div data-page-label="GTR-30 · P8 GIS Group (જૂથ વાઈઝ)"><GTR30Page9InsuranceGroup data={data} /></div>}
          {(activePage === 'all' || activePage === 'p9') && <div data-page-label="GTR-30 · P9 Establishment (મહેકમ)"><GTR30Page10Establishment data={data} /></div>}
          {(activePage === 'all' || activePage === 'p10') && <div data-page-label="GTR-30 · P10 Pramanpatra (પ્રમાણપત્ર)"><GTR30Page11Pramanpatra data={data} /></div>}
        </div>
      </div>

      {showControls && activePage === 'all' && (
        <div className="no-print mt-4 text-center text-[11px] text-slate-500">
          Showing all 10 pages · P1-P4 landscape, P5-P10 portrait · {`Print All generates mixed-orientation PDF (avoids landscape-default mesh)`} · Single tab uses native print
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import {
  ChevronDown,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Loader2,
  Maximize2,
  Menu,
  Minimize2,
  Printer,
  RefreshCw,
  User,
} from 'lucide-react';
import { PbButton } from '../ui';

interface LedgerHeaderCardProps {
  employeeName: string | null;
  designation: string | null;
  payScale: string | null;
  fyLabel: string;
  selectedHrpn: string;
  hasData: boolean;
  isLoading: boolean;
  isExporting: boolean;
  errorText: string | null;
  isFullscreen?: boolean;
  joinDate?: string | null;
  transferDate?: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  onToggleDirectory: () => void;
  onToggleFullscreen?: () => void;
}

/**
 * Modernized employee identity card & action toolbar:
 * - Clear visual hierarchy: Avatar, Name, HRPN pill, Pay Scale & FY badges
 * - Streamlined action bar: Single consolidated Export menu + Legacy Edit + Refresh + Fullscreen
 * - Error alert with Retry trigger
 */
export function LedgerHeaderCard({
  employeeName,
  designation,
  payScale,
  fyLabel,
  selectedHrpn,
  hasData,
  isLoading,
  isExporting,
  errorText,
  isFullscreen = false,
  joinDate,
  transferDate,
  onRefresh,
  onRetry,
  onExportPdf,
  onExportExcel,
  onPrint,
  onToggleDirectory,
  onToggleFullscreen,
}: LedgerHeaderCardProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="summary-bar shrink-0 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        {/* Mobile / Fullscreen Directory Toggle */}
        <button
          type="button"
          onClick={onToggleDirectory}
          aria-label="Employees"
          title="Show employee directory"
          className={`${isFullscreen ? 'inline-flex' : 'lg:hidden inline-flex'} items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40`}
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
          <span>Employees</span>
        </button>

        {/* Employee Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 shadow-2xs"
            aria-hidden="true"
          >
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                {employeeName || (selectedHrpn ? `Employee ${selectedHrpn}` : 'Select an Employee')}
              </span>
              {selectedHrpn && (
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900 px-2 py-0.5 rounded-full shrink-0">
                  HRPN: {selectedHrpn}
                </span>
              )}
              {transferDate && (
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full shrink-0">
                  Transferred: {transferDate}
                </span>
              )}
              {joinDate && !transferDate && (
                <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                  Joined: {joinDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              {designation && <span className="truncate">{designation}</span>}
              {designation && (payScale || fyLabel) && <span aria-hidden="true">•</span>}
              {payScale && <span className="truncate">Scale: {payScale}</span>}
              {payScale && fyLabel && <span aria-hidden="true">•</span>}
              <span className="font-medium text-slate-600 dark:text-slate-300">FY {fyLabel}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:ml-auto">
          {onToggleFullscreen && (
            <PbButton
              variant={isFullscreen ? 'primary' : 'ghost'}
              size="xs"
              icon={isFullscreen ? Minimize2 : Maximize2}
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen View'}
              className={isFullscreen ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}
            >
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </PbButton>
          )}

          <PbButton
            variant="ghost"
            size="xs"
            icon={RefreshCw}
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Ledger"
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          />

          <PbButton
            variant="secondary"
            size="xs"
            icon={Edit3}
            onClick={() => {
              if (!selectedHrpn) return;
              const startFy = parseInt(fyLabel.split('-')[0], 10);
              const fyQuery = !Number.isNaN(startFy) && startFy > 2000 ? `&fy=${startFy}` : '';
              const url = `/paybill/legacy-edit?hrpn=${encodeURIComponent(selectedHrpn)}${fyQuery}`;
              const width = window.screen.availWidth || 1440;
              const height = window.screen.availHeight || 900;
              window.open(
                url,
                `legacy_editor_${selectedHrpn}`,
                `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no`
              );
            }}
            disabled={!selectedHrpn}
            title="Open Legacy Data & Arrears Editor in dedicated window"
            className="font-medium text-slate-700 dark:text-slate-200"
          >
            Edit in Legacy Entry
          </PbButton>

          {/* Single Unified Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              onClick={() => setExportMenuOpen((o) => !o)}
              disabled={!hasData || isLoading || isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  aria-label="Export options"
                  className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in-0 zoom-in-95"
                >
                  {/* Option 1: Formatted PDF Statement */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setExportMenuOpen(false);
                      void onExportPdf();
                    }}
                    disabled={!hasData}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-1.5">
                        PDF Statement
                        <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded font-normal">
                          A4 Landscape
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Download formatted .pdf report</div>
                    </div>
                  </button>

                  {/* Option 2: Excel Spreadsheet (.xlsx) */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setExportMenuOpen(false);
                      void onExportExcel();
                    }}
                    disabled={!hasData}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2.5 transition-colors border-t border-slate-100 dark:border-slate-700/80"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-1.5">
                        Excel Workbook
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded font-normal">
                          .xlsx
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Full 12-Month Matrix Statement</div>
                    </div>
                  </button>

                  {/* Option 3: Native Browser Print */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onPrint();
                    }}
                    disabled={!hasData}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2.5 transition-colors disabled:opacity-45 disabled:cursor-not-allowed border-t border-slate-100 dark:border-slate-700/80"
                  >
                    <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">Print Preview</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Native browser print dialog</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {errorText && (
        <div
          className="shrink-0 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3 shadow-xs"
          role="alert"
        >
          <span
            className="mt-0.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            !
          </span>
          <div className="flex-1 text-xs text-rose-700 dark:text-rose-300 min-w-0">
            <div className="font-bold">Employee data could not be loaded</div>
            <div className="mt-0.5 opacity-90 break-words">{errorText}</div>
          </div>
          <PbButton variant="danger" size="xs" icon={RefreshCw} onClick={onRetry} className="shrink-0">
            Retry
          </PbButton>
        </div>
      )}
    </div>
  );
}


import React, { useMemo, useState } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { isResolutionStatus } from '../types';
import { CompactPageHeader, headerBtn, headerBtnPrimary } from './CompactPageHeader';
import { PrintFooter } from './PrintArtifacts';
import { ResolutionPostsToggle } from './ResolutionPostsToggle';
import { useEstablishmentPositions } from '../hooks/useEstablishmentPositions';
import { exportEstablishmentCSV } from '../utils/csvExport';
import { exportEstablishmentExcel } from '../utils/excelExport';
import { popupNativePrint } from '@/shared/utilities';

interface PostWiseRow {
  postName: string;
  cadreClass: string;
  sanctioned: number;
  filled: number;
  vacant: number;
  underCharge: number;
  /** Abolished / Cancelled (terminal) posts — not part of the sanctioned strength. */
  abolished: number;
}

/**
 * Gujarati label for every position status.
 *
 * ONE map for the printed table AND the CSV/Excel exports: the two used to
 * drift apart (a Cancelled post printed as "અબેયન્સ" but exported as "રદ"),
 * so the filed report and the spreadsheet said different things about the same
 * post.
 */
const STATUS_LABEL_GU: Record<string, string> = {
  Filled: 'ભરેલ',
  Vacant: 'ખાલી',
  'Under Charge': 'ઈન્ચાર્જ',
  Abolished: 'અબેયન્સ',
  Cancelled: 'રદ',
};

const statusLabelGu = (status: string): string => STATUS_LABEL_GU[status] ?? '-';

/** Element id of the printable document — the print engine targets this. */
const PRINT_AREA_ID = 'establishment-report-print';

export const OfficeReportView: React.FC = () => {
  const positionsQuery = useEstablishmentPositions();
  const records = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data]);
  const loading = positionsQuery.isLoading;
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'DETAILED'>('SUMMARY');
  const [includeResolutionPosts, setIncludeResolutionPosts] = useState(false);

  const loadData = () => {
    void positionsQuery.refetch();
  };

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!includeResolutionPosts && isResolutionStatus(r.status)) return false;
      return true;
    });
  }, [records, includeResolutionPosts]);

  // KPIs
  const stats = useMemo(() => {
    let sanctioned = 0;
    let filled = 0;
    let vacant = 0;
    let underCharge = 0;
    let abeyance = 0;

    for (const r of records) {
      if (isResolutionStatus(r.status)) {
        abeyance += 1;
      } else {
        sanctioned += 1;
        if (r.status === 'Filled') filled += 1;
        else if (r.status === 'Vacant') vacant += 1;
        else if (r.status === 'Under Charge') underCharge += 1;
      }
    }

    return { sanctioned, filled, vacant, underCharge, abeyance };
  }, [records]);

  // Post-wise roll-up summary
  const postWiseSummary: PostWiseRow[] = useMemo(() => {
    const map = new Map<string, PostWiseRow>();

    for (const r of filteredRecords) {
      const key = r.postName;
      if (!map.has(key)) {
        map.set(key, {
          postName: r.postName,
          cadreClass: r.cadreClass || '-',
          sanctioned: 0,
          filled: 0,
          vacant: 0,
          underCharge: 0,
          abolished: 0,
        });
      }
      const item = map.get(key)!;
      if (isResolutionStatus(r.status)) {
        // Terminal posts are counted apart: they carry no sanctioned strength,
        // so adding them to the sanctioned/filled columns would overstate the
        // office's establishment.
        item.abolished += 1;
        continue;
      }
      item.sanctioned += 1;
      if (r.status === 'Filled') item.filled += 1;
      else if (r.status === 'Vacant') item.vacant += 1;
      else if (r.status === 'Under Charge') item.underCharge += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.sanctioned - a.sanctioned);
  }, [filteredRecords]);

  /**
   * The abolished/cancelled column only appears when there is something in it
   * — the statutory post-strength form must not carry an empty extra column.
   */
  const showAbolishedColumn = useMemo(
    () => postWiseSummary.some((r) => r.abolished > 0),
    [postWiseSummary]
  );

  /** Terminal posts visible in the current view (0 while the toggle is off). */
  const visibleAbolishedTotal = useMemo(
    () => postWiseSummary.reduce((sum, r) => sum + r.abolished, 0),
    [postWiseSummary]
  );

  const handlePrint = () => {
    // Print ONLY the report document. Printing the whole page would carry the
    // app chrome and, worse, the global print engine hides everything that is
    // not inside `.report-print-area` — so an unwrapped report prints BLANK.
    const el = document.getElementById(PRINT_AREA_ID) as HTMLElement | null;
    if (el) {
      popupNativePrint({
        elements: [el],
        title: `Establishment_Report_${viewMode === 'SUMMARY' ? 'Summary' : 'Detailed'}`,
        pageSize: 'A4',
        orientation: 'portrait',
        pageMargin: '8mm',
        pageContainerSelector: '.report-print-area',
      });
    } else {
      window.print();
    }
  };

  const getExportRows = () => {
    if (viewMode === 'SUMMARY') {
      return postWiseSummary.map((r, idx) => {
        const row: Record<string, string | number> = {
          '૧. અ.નં.': idx + 1,
          '૨. જગ્યાનું નામ': r.postName,
          '૩. વર્ગ': r.cadreClass,
          '૪. મંજૂર મહેકમ': r.sanctioned,
          '૫. ભરેલ જગ્યા': r.filled,
          '૬. ખાલી જગ્યા': r.vacant,
          '૭. ઈન્ચાર્જ': r.underCharge,
        };
        if (showAbolishedColumn) row['૮. અ.બે./રદ'] = r.abolished;
        return row;
      });
    }
    return filteredRecords.map((r, idx) => ({
      '૧. અ.નં.': idx + 1,
      '૨. જગ્યાનું નામ': r.postName,
      '૩. જગ્યા સ્થિતી': statusLabelGu(r.status),
      '૪. ખાલી/ભરેલ તારીખ': r.statusDate || '-',
      '૫. કર્મચારીનું નામ': r.employeeName || '-',
      '૬. HRPN No.': r.hrpnNo || '-',
      '૭. પોઝીશન નંબર': r.positionNo,
      '૮. મોબાઈલ નંબર': r.mobileNo || '-',
      '૯. ઈ/ચા વિગત':
        r.status === 'Under Charge'
          ? `ઈ/ચા ${r.chargeNameGu || ''} (${r.chargeHrpnNo || '-'})`
          : '-',
    }));
  };

  const handleExportCSV = () => {
    const filename = `ICDP_Surat_Establishment_${viewMode === 'SUMMARY' ? 'Summary' : 'Detailed'}.csv`;
    exportEstablishmentCSV(filename, getExportRows());
  };

  const handleExportExcel = async () => {
    const filename = `ICDP_Surat_Establishment_${viewMode === 'SUMMARY' ? 'Summary' : 'Detailed'}.xlsx`;
    await exportEstablishmentExcel(filename, getExportRows(), 'મહેકમ અહેવાલ');
  };

  return (
    <div className="space-y-4 font-gujSans">
      {/* 1. Header with KPIs */}
      <CompactPageHeader
        icon={<FileText className="h-5 w-5 text-slate-900" />}
        iconTone="bg-slate-900 text-white"
        title="Establishment Report"
        titleGu="ICDP SURAT"
        meta={`Report Date: ${new Date().toLocaleDateString('en-GB')}`}
        stats={[
          { label: 'Sanctioned', gu: 'મંજૂર મહેકમ', value: stats.sanctioned, text: 'text-slate-900', accent: 'border-l-blue-600' },
          { label: 'Filled', gu: 'ભરેલ જગ્યા', value: stats.filled, text: 'text-emerald-700', accent: 'border-l-emerald-600' },
          { label: 'Vacant', gu: 'ખાલી જગ્યા', value: stats.vacant, text: 'text-rose-700', accent: 'border-l-rose-600' },
          { label: 'Under Charge', gu: 'ઈન્ચાર્જ', value: stats.underCharge, text: 'text-amber-700', accent: 'border-l-amber-600' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className={headerBtn}>
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
            <button onClick={handleExportExcel} className={headerBtn}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button onClick={handlePrint} className={headerBtnPrimary}>
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        }
      />

      {/* 2. Controls & Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm no-print">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="text-xs font-semibold text-slate-700">Report View:</span>
          <div className="inline-flex flex-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold sm:flex-none">
            <button
              onClick={() => setViewMode('SUMMARY')}
              className={`rounded-md px-3 py-1 transition ${
                viewMode === 'SUMMARY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Post Summary
            </button>
            <button
              onClick={() => setViewMode('DETAILED')}
              className={`rounded-md px-3 py-1 transition ${
                viewMode === 'DETAILED'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed 9-Fields
            </button>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <ResolutionPostsToggle
            checked={includeResolutionPosts}
            onChange={setIncludeResolutionPosts}
            hiddenCount={stats.abeyance}
          />
          <button
            onClick={loadData}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Printable document.
          The global print engine hides everything that is NOT inside
          `.report-print-area` (body { visibility: hidden }), so the letterhead,
          the table and the print footer must all live inside that wrapper —
          otherwise the report prints as a blank page. */}
      <div id={PRINT_AREA_ID} className="report-print-area font-gujSans">
        {/* 3a. Official Print Letterhead (Visible only on print or clean view) */}
        <div className="hidden print-only text-center pb-4 border-b border-slate-300">
          <h1 className="text-base font-bold text-slate-900">ગુજરાત સરકાર • પશુપાલન વિભાગ</h1>
          <h2 className="text-sm font-bold text-slate-800">કચેરી: સઘન પશુ સુધારણા યોજના, સુરત</h2>
          <h3 className="text-xs font-semibold text-slate-700 mt-1">
            {viewMode === 'SUMMARY' ? 'હોદ્દાવાર મંજૂર મહેકમ અને ખાલી જગ્યાઓની સ્થિતી દર્શાવતું પત્રક' : 'સત્તાવાર ૯-કોલમ મહેકમ રજીસ્ટર'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            અહેવાલ તારીખ: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        {/* 4. Report Content */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {viewMode === 'SUMMARY' ? (
            /* Mode 1: Post-Wise Summary Table */
            <div className="overflow-x-auto">
              <table className="table-mobile-cards w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
                    <th className="py-2.5 px-3 text-center w-12">અ.નં.</th>
                    <th className="py-2.5 px-3">જગ્યાનું નામ (હોદ્દો)</th>
                    <th className="py-2.5 px-3 text-center w-28">સંવર્ગ વર્ગ</th>
                    <th className="py-2.5 px-3 text-center font-bold text-blue-900 w-28">મંજૂર મહેકમ</th>
                    <th className="py-2.5 px-3 text-center font-bold text-emerald-800 w-28">ભરેલ જગ્યા</th>
                    <th className="py-2.5 px-3 text-center font-bold text-rose-800 w-28">ખાલી જગ્યા</th>
                    <th className="py-2.5 px-3 text-center font-bold text-amber-800 w-28">ઈન્ચાર્જ</th>
                    {showAbolishedColumn && (
                      <th className="py-2.5 px-3 text-center font-bold text-purple-800 w-28">અ.બે./રદ</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                  {postWiseSummary.map((item, idx) => (
                    <tr key={item.postName} className="hover:bg-slate-50">
                      <td data-label="અ.નં." className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td data-label="જગ્યાનું નામ" className="cell-full py-2 px-3 font-semibold text-slate-900">{item.postName}</td>
                      <td data-label="વર્ગ" className="py-2 px-3 text-center text-slate-600">{item.cadreClass}</td>
                      <td data-label="મંજૂર" className="py-2 px-3 text-center num font-bold text-blue-700">{item.sanctioned}</td>
                      <td data-label="ભરેલ" className="py-2 px-3 text-center num font-bold text-emerald-700">{item.filled}</td>
                      <td data-label="ખાલી" className="py-2 px-3 text-center num font-bold text-rose-700">{item.vacant}</td>
                      <td data-label="ઈન્ચાર્જ" className="py-2 px-3 text-center num text-amber-700">{item.underCharge || '-'}</td>
                      {showAbolishedColumn && (
                        <td data-label="અ.બે./રદ" className="py-2 px-3 text-center num text-purple-700">{item.abolished || '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                    <td colSpan={3} data-label="" className="cell-full py-2.5 px-3 text-right">કુલ સરવાળો (Total):</td>
                    <td data-label="મંજૂર" className="py-2.5 px-3 text-center num text-blue-900">{stats.sanctioned}</td>
                    <td data-label="ભરેલ" className="py-2.5 px-3 text-center num text-emerald-900">{stats.filled}</td>
                    <td data-label="ખાલી" className="py-2.5 px-3 text-center num text-rose-900">{stats.vacant}</td>
                    <td data-label="ઈન્ચાર્જ" className="py-2.5 px-3 text-center num text-amber-900">{stats.underCharge}</td>
                    {showAbolishedColumn && (
                      <td data-label="અ.બે./રદ" className="py-2.5 px-3 text-center num text-purple-900">{visibleAbolishedTotal}</td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* Mode 2: Detailed 9-Column Table */
            <div className="overflow-x-auto">
              <table className="table-mobile-cards w-full text-left border-collapse text-xs font-gujSans">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
                    <th className="py-2.5 px-3 text-center w-12">૧. અ.નં.</th>
                    <th className="py-2.5 px-3">૨. જગ્યાનું નામ</th>
                    <th className="py-2.5 px-3 text-center w-24">૩. સ્થિતી</th>
                    <th className="py-2.5 px-3 text-center w-28">૪. ખાલી/ભરેલ તા.</th>
                    <th className="py-2.5 px-3">૫. કર્મચારીનું નામ</th>
                    <th className="py-2.5 px-3 text-center w-28 font-gujSans">૬. HRPN</th>
                    <th className="py-2.5 px-3 text-center w-28 font-gujSans">૭. પોઝીશન નંબર</th>
                    <th className="py-2.5 px-3 text-center w-28">૮. મોબાઈલ</th>
                    <th className="py-2.5 px-3">૯. ઈ/ચા વિગત</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                  {filteredRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td data-label="અ.નં." className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td data-label="જગ્યાનું નામ" className="cell-full py-2 px-3 font-semibold text-slate-900">{r.postName}</td>
                      <td data-label="સ્થિતી" className="py-2 px-3 text-center">
                        <span className="font-bold text-slate-800">{statusLabelGu(r.status)}</span>
                      </td>
                      <td data-label="તારીખ" className="py-2 px-3 text-center num text-slate-600">{r.statusDate}</td>
                      <td data-label="કર્મચારી" className="py-2 px-3 font-semibold text-slate-900">{r.employeeName}</td>
                      <td data-label="HRPN" className="py-2 px-3 text-center num text-slate-700">{r.hrpnNo}</td>
                      <td data-label="પોઝીશન" className="py-2 px-3 text-center num font-bold text-blue-700">{r.positionNo}</td>
                      <td data-label="મોબાઈલ" className="py-2 px-3 text-center num text-slate-600">{r.mobileNo}</td>
                      <td data-label="ઈ/ચા" className="py-2 px-3">
                        {r.status === 'Under Charge' ? `ઈ/ચા ${r.chargeNameGu || ''} (${r.chargeHrpnNo})` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Print Footer */}
        <PrintFooter footerNote="સઘન પશુ સુધારણા યોજના, સુરત કચેરી દફતરેથી ખરાઈ કરેલ." />
      </div>
    </div>
  );
};

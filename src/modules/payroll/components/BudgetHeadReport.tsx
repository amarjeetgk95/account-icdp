import { Fragment, type ReactNode, useState } from 'react';
import { useBudgetHeadReport } from '../hooks/usePayroll';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { ReportPrintArea, DEFAULT_OFFICE, type OfficeDetails } from '@/shared/components/ReportPrintArea';
import { downloadCsv, formatCurrency, exportBudgetHeadExcel } from '@/shared/utilities';
import { Download, FileText, FileSpreadsheet, Layers, Landmark, Wallet, Percent, Search } from 'lucide-react';
import type { BudgetHeadReport as BudgetHeadReportType, BudgetHeadQuarterTotals } from '../types';

interface BudgetHeadReportProps {
  fy: number;
}

const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_MONTHS = ['Apr-Jun', 'Jul-Sep', 'Oct-Dec', 'Jan-Mar'];

/** CSS class applied to each quarter's header cells */
const Q_HEADER = ['bh-q1-hd', 'bh-q2-hd', 'bh-q3-hd', 'bh-q4-hd'];
/** CSS class applied to each quarter's data cells */
const Q_CELL = ['bh-q1', 'bh-q2', 'bh-q3', 'bh-q4'];
/** CSS class applied to each quarter's divider band border */
const Q_BAND = ['bh-q1-band', 'bh-q2-band', 'bh-q3-band', 'bh-q4-band'];

export function BudgetHeadReport({ fy }: BudgetHeadReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: report, isLoading } = useBudgetHeadReport(fy);
  const { details: officeDetails } = useOfficeDetails();

  const office: Partial<OfficeDetails> = (officeDetails
    ? Object.fromEntries(Object.entries(officeDetails).filter(([, v]) => v))
    : {}) as Partial<OfficeDetails>;
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const hasData = !!report && report.groups.length > 0;

  const exportCSV = () => {
    if (!report) return;
    const headers = [
      'Budget Head',
      ...QUARTER_NAMES.flatMap((q) => [`${q}_Gross`, `${q}_IT`, `${q}_Net`]),
      'FY_Gross',
      'FY_IT',
      'FY_Net',
    ];
    const rows: Array<Array<string | number>> = report.groups.map((group) => [
      group.code ? `${group.code} ${group.name}` : group.name,
      ...group.quarters.flatMap((q) => {
        const v = gin(q);
        return [v.gross, v.it, v.net];
      }),
      ...(() => {
        const v = gin(group.totals);
        return [v.gross, v.it, v.net];
      })(),
    ]);
    downloadCsv(`BudgetHead_${fyLabel}.csv`, headers, rows);
  };

  const handleExcelExport = () => {
    if (!report) return;
    exportBudgetHeadExcel(report, {
      officeName: office.officeName,
      address: office.address,
      tan: office.tan,
    });
  };

  const printReport = () => {
    const style = document.createElement('style');
    style.id = 'icdp-print-landscape';
    style.innerHTML = '@media print { @page { size: A4 landscape; margin: 4mm 5mm; } }';
    document.head.appendChild(style);
    window.print();
    const cleanup = () => {
      document.getElementById('icdp-print-landscape')?.remove();
      window.onafterprint = null;
    };
    window.onafterprint = cleanup;
    window.setTimeout(cleanup, 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner h-10 w-10"></div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="empty-state">
        <p>No salary data for FY {fyLabel}.</p>
        <p className="text-xs text-slate-400 mt-1">
          Enter salary data in Monthly Entry and assign employees to a budget head to populate this report.
        </p>
      </div>
    );
  }

  const totals = report.totals;
  const totalGross = totals.gross + totals.da;
  const totalTax = totals.tax;
  const totalNet = totalGross - totalTax;

  // Filter groups based on search term
  const filteredGroups = report.groups.filter((g) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (g.name && g.name.toLowerCase().includes(q)) || (g.code && g.code.toLowerCase().includes(q));
  });

  const filteredReport: BudgetHeadReportType = {
    ...report,
    groups: filteredGroups,
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Cards */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Active Budget Heads</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{report.groups.length}</h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Landmark size={20} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Gross + DA</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatCurrency(totalGross)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Wallet size={20} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Income Tax (TDS)</p>
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalTax)}</h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg">
            <Percent size={20} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Net Salary Disbursed</p>
            <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(totalNet)}</h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Action Toolbar with Instant Search */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={printReport} className="btn btn-secondary btn-sm text-xs">
            <FileText size={14} className="mr-1" /> Print
          </button>
          <button onClick={handleExcelExport} className="btn btn-emerald btn-sm text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
            <FileSpreadsheet size={14} className="mr-1" /> Export Formatted Excel
          </button>
          <button onClick={exportCSV} className="btn btn-outline btn-sm text-xs">
            <Download size={14} className="mr-1" /> CSV
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search budget head code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <ReportPrintArea
        office={office}
        leftLabel="Tax Deduction No.:-"
        leftValue={office.tan || DEFAULT_OFFICE.tan}
        rightMeta={
          <>
            <span>Financial Year: {fyLabel} | Assessment Year: {fy + 1}-{String(fy + 2).slice(-2)}</span>
          </>
        }
        title="Budget Head Wise Salary Statement"
        badgeClass="report-badge-emp"
        pageOrientation="landscape"
        showSignature={false}
        showLetterhead={false}
        compact
      >
        <div className="space-y-8">
          <section>
            <TableCaption>Table 1 — Quarter-wise Summary (Gross / IT)</TableCaption>
            <QuarterSummaryTable report={filteredReport} />
          </section>

          <section>
            <TableCaption>Table 2 — Month-wise Detail (Gross / IT / Net)</TableCaption>
            <MonthlyDetailTable report={filteredReport} />
          </section>
        </div>
      </ReportPrintArea>
    </div>
  );
}

/* ---------- helpers ---------- */

/** Gross/IT/Net from the raw quarter totals (gross already includes DA) */
const gin = (t: BudgetHeadQuarterTotals) => ({
  gross: t.gross + t.da,
  it: t.tax,
  net: t.gross + t.da - t.tax,
});

const formatZero = (val: number) => (val === 0 ? <span className="text-slate-300 dark:text-slate-600">-</span> : formatCurrency(val));

const headLabel = (code: string | null, name: string) => (
  <div className="flex items-center gap-2">
    {code && (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {code}
      </span>
    )}
    <span className="font-semibold text-slate-800 dark:text-slate-100">{name}</span>
  </div>
);

function TableCaption({ children }: { children: ReactNode }) {
  return <div className="bh-caption">{children}</div>;
}

/* ---------- Table 1 : Quarter-wise Summary ---------- */

function QuarterSummaryTable({ report }: { report: BudgetHeadReportType }) {
  return (
    <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <table className="bh-table">
        {/* ---- header ---- */}
        <thead className="sticky top-0 z-20 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)]">
          <tr>
            <th rowSpan={2} className="bh-head-col">Budget Head</th>
            {QUARTER_NAMES.map((q, i) => (
              <th key={q} colSpan={2} className={`bh-qh ${Q_HEADER[i]}`}>
                {q} <span className="bh-qh-sub">({QUARTER_MONTHS[i]})</span>
              </th>
            ))}
            <th colSpan={2} className="bh-qh bh-fy-hd">FY Total</th>
          </tr>
          <tr>
            {[...Array(4).keys(), -1].map((idx) => {
              const cls = idx >= 0 ? Q_HEADER[idx] : 'bh-fy-hd';
              return (
                <Fragment key={idx}>
                  <th className={`bh-sub ${cls} bh-qs`}>Gross</th>
                  <th className={`bh-sub ${cls} text-rose-700 dark:text-rose-400`}>IT</th>
                </Fragment>
              );
            })}
          </tr>
        </thead>

        {/* ---- body ---- */}
        <tbody>
          {report.groups.length === 0 ? (
            <tr>
              <td colSpan={11} className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                No matching budget heads found.
              </td>
            </tr>
          ) : (
            report.groups.map((group) => {
              const fy = gin(group.totals);
              return (
                <tr key={group.code || '__unassigned__'} className="bh-row">
                  <td className="bh-head-col">{headLabel(group.code, group.name)}</td>
                  {group.quarters.map((q, qi) => {
                    const v = gin(q);
                    return (
                      <Fragment key={qi}>
                        <td className={`${Q_CELL[qi]} bh-qs`}>{formatZero(v.gross)}</td>
                        <td className={`${Q_CELL[qi]} text-rose-600 dark:text-rose-400 font-medium`}>{formatZero(v.it)}</td>
                      </Fragment>
                    );
                  })}
                  <td className="bh-fy bh-qs font-semibold">{formatCurrency(fy.gross)}</td>
                  <td className="bh-fy text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(fy.it)}</td>
                </tr>
              );
            })
          )}
        </tbody>

        {/* ---- footer ---- */}
        <tfoot>
          <tr className="bh-grand">
            <td className="bh-head-col font-extrabold">GRAND TOTAL</td>
            {QUARTER_NAMES.map((_, qi) => {
              const gross = report.groups.reduce((a, g) => a + g.quarters[qi].gross + g.quarters[qi].da, 0);
              const tax = report.groups.reduce((a, g) => a + g.quarters[qi].tax, 0);
              return (
                <Fragment key={qi}>
                  <td className="bh-qs">{formatCurrency(gross)}</td>
                  <td className="text-rose-700 dark:text-rose-400">{formatCurrency(tax)}</td>
                </Fragment>
              );
            })}
            {(() => {
              const v = gin(report.totals);
              return (
                <>
                  <td className="bh-qs font-bold">{formatCurrency(v.gross)}</td>
                  <td className="text-rose-700 dark:text-rose-400 font-bold">{formatCurrency(v.it)}</td>
                </>
              );
            })()}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ---------- Table 2 : Month-wise Detail stacked by quarter ---------- */

function MonthlyDetailTable({ report }: { report: BudgetHeadReportType }) {
  return (
    <div>
      {QUARTER_NAMES.map((_, qi) => (
        <QuarterBlock key={QUARTER_NAMES[qi]} report={report} qi={qi} />
      ))}
    </div>
  );
}

function QuarterBlock({ report, qi }: { report: BudgetHeadReportType; qi: number }) {
  const start = qi * 3;
  const monthLabels = report.monthLabels.slice(start, start + 3);

  const qTotals = report.groups.reduce(
    (acc, g) => {
      const v = gin(g.quarters[qi]);
      acc.gross += v.gross;
      acc.it += v.it;
      acc.net += v.net;
      return acc;
    },
    { gross: 0, it: 0, net: 0 }
  );

  return (
    <div className="bh-monthly-block mb-4">
      {/* visual element separating each quarter */}
      <div className={`bh-q-band ${Q_HEADER[qi]} ${Q_BAND[qi]} font-bold`}>
        {QUARTER_NAMES[qi]} <span className="bh-qh-sub">({QUARTER_MONTHS[qi]})</span>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="bh-table">
          {/* ---- header ---- */}
          <thead className="sticky top-0 z-20 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)]">
            <tr>
              <th rowSpan={2} className="bh-head-col">Budget Head</th>
              {monthLabels.map((m) => (
                <th key={m} colSpan={3} className={`bh-qh ${Q_HEADER[qi]}`}>
                  {m}
                </th>
              ))}
              <th colSpan={3} className="bh-qh bh-fy-hd">{QUARTER_NAMES[qi]} Total</th>
            </tr>
            <tr>
              {[...Array(3).keys(), -1].map((idx) => {
                const cls = idx >= 0 ? Q_HEADER[qi] : 'bh-fy-hd';
                return (
                  <Fragment key={idx}>
                    <th className={`bh-sub ${cls} bh-qs`}>Gross</th>
                    <th className={`bh-sub ${cls} text-rose-700 dark:text-rose-400`}>IT</th>
                    <th className={`bh-sub ${cls} text-emerald-700 dark:text-emerald-400`}>Net</th>
                  </Fragment>
                );
              })}
            </tr>
          </thead>

          {/* ---- body ---- */}
          <tbody>
            {report.groups.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-6 text-slate-400 text-xs">
                  No matching budget heads found.
                </td>
              </tr>
            ) : (
              report.groups.map((group) => (
                <tr key={group.code || '__unassigned__'} className="bh-row">
                  <td className="bh-head-col">{headLabel(group.code, group.name)}</td>
                  {monthLabels.map((_, mi) => {
                    const cell = group.months[start + mi];
                    const gross = cell.gross + cell.da;
                    const net = gross - cell.tax;
                    return (
                      <Fragment key={mi}>
                        <td className={`${Q_CELL[qi]} bh-qs`}>{formatZero(gross)}</td>
                        <td className={`${Q_CELL[qi]} text-rose-600 dark:text-rose-400 font-medium`}>{formatZero(cell.tax)}</td>
                        <td className={`${Q_CELL[qi]} text-emerald-600 dark:text-emerald-400 font-medium`}>{formatZero(net)}</td>
                      </Fragment>
                    );
                  })}
                  {(() => {
                    const v = gin(group.quarters[qi]);
                    return (
                      <Fragment key="qt">
                        <td className="bh-fy bh-qs font-semibold">{formatCurrency(v.gross)}</td>
                        <td className="bh-fy text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(v.it)}</td>
                        <td className="bh-fy text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(v.net)}</td>
                      </Fragment>
                    );
                  })()}
                </tr>
              ))
            )}
          </tbody>

          {/* ---- footer ---- */}
          <tfoot>
            <tr className="bh-grand">
              <td className="bh-head-col font-extrabold">GRAND TOTAL</td>
              {monthLabels.map((_, mi) => {
                const gross = report.groups.reduce((a, g) => a + g.months[start + mi].gross + g.months[start + mi].da, 0);
                const tax = report.groups.reduce((a, g) => a + g.months[start + mi].tax, 0);
                return (
                  <Fragment key={mi}>
                    <td className="bh-qs">{formatCurrency(gross)}</td>
                    <td className="text-rose-700 dark:text-rose-400">{formatCurrency(tax)}</td>
                    <td className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(gross - tax)}</td>
                  </Fragment>
                );
              })}
              <td className="bh-qs font-bold">{formatCurrency(qTotals.gross)}</td>
              <td className="text-rose-700 dark:text-rose-400 font-bold">{formatCurrency(qTotals.it)}</td>
              <td className="text-emerald-700 dark:text-emerald-400 font-extrabold">{formatCurrency(qTotals.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

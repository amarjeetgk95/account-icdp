import { Fragment, type ReactNode } from 'react';
import { useBudgetHeadReport } from '../hooks/usePayroll';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { ReportPrintArea, DEFAULT_OFFICE, type OfficeDetails } from '@/shared/components/ReportPrintArea';
import { downloadCsv, formatCurrency } from '@/shared/utilities';
import { Download, FileText } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button onClick={printReport} className="btn btn-secondary btn-sm text-xs">
          <FileText size={14} className="mr-1" /> Print
        </button>
        <button onClick={exportCSV} className="btn btn-outline btn-sm text-xs">
          <Download size={14} className="mr-1" /> CSV
        </button>
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
            <TableCaption>Table 1 — Quarter-wise Summary (Gross / IT / Net)</TableCaption>
            <QuarterSummaryTable report={report!} />
          </section>

          <section>
            <TableCaption>Table 2 — Month-wise Detail (Gross / IT / Net)</TableCaption>
            <MonthlyDetailTable report={report!} />
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

const headLabel = (code: string | null, name: string) =>
  code ? `${code} — ${name}` : name;

function TableCaption({ children }: { children: ReactNode }) {
  return <div className="bh-caption">{children}</div>;
}

/* ---------- Table 1 : Quarter-wise Summary ---------- */

function QuarterSummaryTable({ report }: { report: BudgetHeadReportType }) {
  return (
    <div className="overflow-x-auto">
      <table className="bh-table">
        {/* ---- header ---- */}
        <thead>
          <tr>
            <th rowSpan={2} className="bh-head-col">Budget Head</th>
            {QUARTER_NAMES.map((q, i) => (
              <th key={q} colSpan={3} className={`bh-qh ${Q_HEADER[i]}`}>
                {q} <span className="bh-qh-sub">({QUARTER_MONTHS[i]})</span>
              </th>
            ))}
            <th colSpan={3} className="bh-qh bh-fy-hd">FY Total</th>
          </tr>
          <tr>
            {[...Array(4).keys(), -1].map((idx) => {
              const cls = idx >= 0 ? Q_HEADER[idx] : 'bh-fy-hd';
              return (
                <Fragment key={idx}>
                  <th className={`bh-sub ${cls} bh-qs`}>Gross</th>
                  <th className={`bh-sub ${cls}`}>IT</th>
                  <th className={`bh-sub ${cls}`}>Net</th>
                </Fragment>
              );
            })}
          </tr>
        </thead>

        {/* ---- body ---- */}
        <tbody>
          {report.groups.map((group) => {
            const fy = gin(group.totals);
            return (
              <tr key={group.code || '__unassigned__'} className="bh-row">
                <td className="bh-head-col">{headLabel(group.code, group.name)}</td>
                {group.quarters.map((q, qi) => {
                  const v = gin(q);
                  return (
                    <Fragment key={qi}>
                      <td className={`${Q_CELL[qi]} bh-qs`}>{formatCurrency(v.gross)}</td>
                      <td className={Q_CELL[qi]}>{formatCurrency(v.it)}</td>
                      <td className={Q_CELL[qi]}>{formatCurrency(v.net)}</td>
                    </Fragment>
                  );
                })}
                <td className="bh-fy bh-qs">{formatCurrency(fy.gross)}</td>
                <td className="bh-fy">{formatCurrency(fy.it)}</td>
                <td className="bh-fy">{formatCurrency(fy.net)}</td>
              </tr>
            );
          })}
        </tbody>

        {/* ---- footer ---- */}
        <tfoot>
          <tr className="bh-grand">
            <td className="bh-head-col">GRAND TOTAL</td>
            {QUARTER_NAMES.map((_, qi) => {
              const gross = report.groups.reduce((a, g) => a + g.quarters[qi].gross + g.quarters[qi].da, 0);
              const tax = report.groups.reduce((a, g) => a + g.quarters[qi].tax, 0);
              return (
                <Fragment key={qi}>
                  <td className="bh-qs">{formatCurrency(gross)}</td>
                  <td>{formatCurrency(tax)}</td>
                  <td>{formatCurrency(gross - tax)}</td>
                </Fragment>
              );
            })}
            {(() => {
              const v = gin(report.totals);
              return (
                <>
                  <td className="bh-qs">{formatCurrency(v.gross)}</td>
                  <td>{formatCurrency(v.it)}</td>
                  <td>{formatCurrency(v.net)}</td>
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
    <div className="bh-monthly-block">
      {/* visual element separating each quarter */}
      <div className={`bh-q-band ${Q_HEADER[qi]} ${Q_BAND[qi]}`}>
        {QUARTER_NAMES[qi]} <span className="bh-qh-sub">({QUARTER_MONTHS[qi]})</span>
      </div>

      <div className="overflow-x-auto">
        <table className="bh-table">
          {/* ---- header ---- */}
          <thead>
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
                    <th className={`bh-sub ${cls}`}>IT</th>
                    <th className={`bh-sub ${cls}`}>Net</th>
                  </Fragment>
                );
              })}
            </tr>
          </thead>

          {/* ---- body ---- */}
          <tbody>
            {report.groups.map((group) => (
              <tr key={group.code || '__unassigned__'} className="bh-row">
                <td className="bh-head-col">{headLabel(group.code, group.name)}</td>
                {monthLabels.map((_, mi) => {
                  const cell = group.months[start + mi];
                  const gross = cell.gross + cell.da;
                  const net = gross - cell.tax;
                  return (
                    <Fragment key={mi}>
                      <td className={`${Q_CELL[qi]} bh-qs`}>{formatCurrency(gross)}</td>
                      <td className={Q_CELL[qi]}>{formatCurrency(cell.tax)}</td>
                      <td className={Q_CELL[qi]}>{formatCurrency(net)}</td>
                    </Fragment>
                  );
                })}
                {(() => {
                  const v = gin(group.quarters[qi]);
                  return (
                    <Fragment key="qt">
                      <td className="bh-fy bh-qs">{formatCurrency(v.gross)}</td>
                      <td className="bh-fy">{formatCurrency(v.it)}</td>
                      <td className="bh-fy">{formatCurrency(v.net)}</td>
                    </Fragment>
                  );
                })()}
              </tr>
            ))}
          </tbody>

          {/* ---- footer ---- */}
          <tfoot>
            <tr className="bh-grand">
              <td className="bh-head-col">GRAND TOTAL</td>
              {monthLabels.map((_, mi) => {
                const gross = report.groups.reduce((a, g) => a + g.months[start + mi].gross + g.months[start + mi].da, 0);
                const tax = report.groups.reduce((a, g) => a + g.months[start + mi].tax, 0);
                return (
                  <Fragment key={mi}>
                    <td className="bh-qs">{formatCurrency(gross)}</td>
                    <td>{formatCurrency(tax)}</td>
                    <td>{formatCurrency(gross - tax)}</td>
                  </Fragment>
                );
              })}
              <td className="bh-qs">{formatCurrency(qTotals.gross)}</td>
              <td>{formatCurrency(qTotals.it)}</td>
              <td>{formatCurrency(qTotals.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

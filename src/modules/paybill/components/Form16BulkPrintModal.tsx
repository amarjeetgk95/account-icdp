import { useState, useMemo } from 'react';
import { Modal } from '@/shared/components/Modal';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import { Form16Document } from './Form16Document';
import { Printer, FileSpreadsheet, FileArchive, Search, Filter } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Form16Certificate } from '../types/form16';
import { assessmentYearFor } from '../services/form16Calculation.service';

interface Form16BulkPrintModalProps {
  open: boolean;
  onClose: () => void;
  certs: Form16Certificate[];
  financialYear: number;
}

type BulkFilterMode = 'all' | 'issued' | 'reviewed_issued' | 'tax_deducted' | 'zero_tax';

export function Form16BulkPrintModal({
  open,
  onClose,
  certs,
  financialYear,
}: Form16BulkPrintModalProps) {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [filterMode, setFilterMode] = useState<BulkFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fyLabel = `${financialYear}-${String(financialYear + 1).slice(-2)}`;
  const ayLabel = assessmentYearFor(financialYear);

  // Filter logic
  const targetCerts = useMemo(() => {
    return certs.filter((c) => {
      // Status & tax filters
      if (filterMode === 'issued' && c.status !== 'ISSUED') return false;
      if (filterMode === 'reviewed_issued' && c.status !== 'ISSUED' && c.status !== 'REVIEWED') return false;
      if (filterMode === 'tax_deducted') {
        const tds = c.computedTotals?.tdsDeducted || 0;
        if (tds <= 0) return false;
      }
      if (filterMode === 'zero_tax') {
        const tax = c.computedTotals?.totalTaxPayable || 0;
        if (tax > 0) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const n = (c.employee.name || '').toLowerCase();
        const h = (c.hrpn || '').toLowerCase();
        const p = (c.employee.pan || '').toLowerCase();
        return n.includes(q) || h.includes(q) || p.includes(q);
      }

      return true;
    });
  }, [certs, filterMode, searchQuery]);

  const handlePrintAll = () => {
    const container = document.getElementById('form16-bulk-print-container');
    if (!container) return;

    popupNativePrint({
      elements: [container],
      title: `Form16_Register_FY${fyLabel}_AY${ayLabel}`,
      pageSize: 'A4',
      orientation: 'portrait',
      pageMargin: '5mm 6mm',
      customStyles: `
        .f16-bulk-wrapper {
          width: 100% !important;
        }
        .f16-page {
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .f16-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 4mm 5mm !important; }
          html, body { background: #fff !important; color: #000 !important; font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important; }
          .f16-title-main { font-size: 13pt !important; font-weight: 900 !important; margin-bottom: 0.1mm !important; }
          .f16-parta-title { font-size: 10pt !important; font-weight: 900 !important; margin: 0.1mm 0 !important; }
          .f16-rule-sub { font-size: 8pt !important; font-weight: 600 !important; margin-bottom: 0.2mm !important; }
          .f16-cert-desc { font-size: 7.2pt !important; font-weight: 600 !important; line-height: 1.15 !important; margin-bottom: 0.8mm !important; }
          .f16-cert-meta-strip { font-size: 7.5pt !important; padding: 0.6mm 1.5mm !important; }
          .f16-table { border: 1.1px solid #000 !important; margin-bottom: 0.8mm !important; }
          .f16-table th { font-size: 7.6pt !important; font-weight: 800 !important; padding: 0.5mm 1.2mm !important; background: #f2f2f2 !important; line-height: 1.15 !important; }
          .f16-table td { font-size: 8pt !important; padding: 0.45mm 1.2mm !important; line-height: 1.18 !important; }
          .f16-sec-hdr { font-size: 8pt !important; font-weight: 900 !important; background: #eaeaea !important; padding: 0.5mm !important; }
          .f16-b-opt { font-size: 7.8pt !important; font-weight: 800 !important; padding: 0.4mm !important; margin-bottom: 0.5mm !important; }
          .f16-num { font-size: 8.5pt !important; font-weight: 700 !important; }
          .f16-verify-box { font-size: 7.4pt !important; border: none !important; padding: 1mm 1mm !important; margin-top: 0.8mm !important; }
          .f16-verify-title { font-size: 8.2pt !important; font-weight: 900 !important; text-align: center !important; margin-bottom: 0.4mm !important; text-decoration: underline !important; }
          .f16-verify-text { font-size: 7.2pt !important; line-height: 1.18 !important; margin-bottom: 0.5mm !important; }
          .f16-sig-line { font-weight: 900 !important; font-size: 7.5pt !important; }
          .f16-sig-caption { font-size: 6.8pt !important; margin-bottom: 0.3mm !important; }
          .f16-sig-field { font-size: 7.4pt !important; }
        }
      `,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'HRPN',
      'Employee Name',
      'Designation',
      'PAN',
      'Status',
      'Gross Salary 17(1)',
      'Perquisites 17(2)',
      'Profits 17(3)',
      'Std Deduction 16(ia)',
      'Chargeable Salary',
      'House Prop Income',
      'Other Sources Income',
      'Gross Total Income',
      'Total Taxable Income',
      'Tax on Total Income',
      'Rebate 87A',
      'Cess 4%',
      'Total Tax Payable',
      'TDS Deducted',
      'Net Tax Payable',
      'Q1 TDS',
      'Q2 TDS',
      'Q3 TDS',
      'Q4 TDS',
      'Total Part A TDS',
    ];

    const rows = targetCerts.map((c) => {
      const t = c.computedTotals;
      const qMap = Object.fromEntries(c.partA.quarters.map((q) => [q.quarter, q.taxDeducted]));
      const qTotal = c.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0);

      return [
        `"${c.hrpn}"`,
        `"${c.employee.name || ''}"`,
        `"${c.employee.designation || ''}"`,
        `"${c.employee.pan || ''}"`,
        c.status,
        t?.grossSalary17_1 || 0,
        c.partB.perquisites17_2 || 0,
        c.partB.profitsInLieu17_3 || 0,
        t?.standardDeduction16ia || 0,
        t?.incomeChargeableSalaries || 0,
        c.partB.housePropertyIncome || 0,
        c.partB.otherSourcesIncome || 0,
        t?.grossTotalIncome || 0,
        t?.totalTaxableIncome || 0,
        t?.taxOnTotalIncome || 0,
        t?.rebate87A || 0,
        t?.cess4 || 0,
        t?.totalTaxPayable || 0,
        t?.tdsDeducted || 0,
        t?.netTaxPayable || 0,
        qMap.Q1 || 0,
        qMap.Q2 || 0,
        qMap.Q3 || 0,
        qMap.Q4 || 0,
        qTotal,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Form16_Summary_Register_FY${fyLabel}.csv`);
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Form16_FY${fyLabel}`);

      for (const cert of targetCerts) {
        const pan = cert.employee.pan || cert.hrpn || 'EMP';
        const filename = `Form16_${pan}_${cert.employee.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`;

        const singleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Form 16 - ${cert.employee.name}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; margin: 15mm; color: #000; }
    table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
    th, td { border: 1px solid #333; padding: 4px 8px; font-size: 10pt; }
    th { background: #f2f2f2; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 4mm; }
  </style>
</head>
<body>
  <div class="header">
    <h2>FORM NO. 16</h2>
    <p>Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary</p>
    <b>Financial Year: ${fyLabel} &nbsp;|&nbsp; Assessment Year: ${ayLabel}</b>
  </div>

  <table style="margin-top: 6mm;">
    <tr>
      <td width="50%"><b>Employer / Deductor:</b><br/>${(cert.employer.name || '').replace(/\n/g, '<br/>')}<br/>${(cert.employer.address || '').replace(/\n/g, '<br/>')}<br/><b>TAN:</b> ${cert.employer.tan} &nbsp; <b>PAN:</b> ${cert.employer.pan}</td>
      <td width="50%"><b>Employee:</b><br/>${cert.employee.name} (${cert.employee.designation})<br/>${cert.employee.address}<br/><b>PAN:</b> ${cert.employee.pan} &nbsp; <b>HRPN:</b> ${cert.hrpn}</td>
    </tr>
  </table>

  <h3 style="margin-top: 6mm; margin-bottom: 2mm;">PART B: Details of Salary Paid and any other income and tax deducted</h3>
  <table>
    <thead>
      <tr><th width="8%">Item</th><th>Particulars</th><th width="20%">Amount (Rs.)</th></tr>
    </thead>
    <tbody>
      <tr><td class="text-center font-bold">1(a)</td><td>Gross Salary u/s 17(1)</td><td class="text-right">${cert.computedTotals?.grossSalary17_1?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">1(d)</td><td class="font-bold">Total Gross Salary</td><td class="text-right font-bold">${cert.computedTotals?.totalGrossSalary1d?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">2</td><td class="font-bold">Standard Deduction u/s 16(ia)</td><td class="text-right">${cert.computedTotals?.standardDeduction16ia?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">3</td><td class="font-bold">Income Chargeable under Salaries</td><td class="text-right">${cert.computedTotals?.incomeChargeableSalaries?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">6</td><td class="font-bold">Gross Total Income</td><td class="text-right">${cert.computedTotals?.grossTotalIncome?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">10</td><td class="font-bold">Total Taxable Income</td><td class="text-right">${cert.computedTotals?.totalTaxableIncome?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">11</td><td>Tax on Total Income</td><td class="text-right">${cert.computedTotals?.taxOnTotalIncome?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">12</td><td>Rebate u/s 87A</td><td class="text-right">-${cert.computedTotals?.rebate87A?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">14</td><td>Health & Education Cess (4%)</td><td class="text-right">${cert.computedTotals?.cess4?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">15</td><td class="font-bold">Total Tax Payable</td><td class="text-right">${cert.computedTotals?.totalTaxPayable?.toFixed(2) || '0.00'}</td></tr>
      <tr><td class="text-center font-bold">17</td><td>Less: Tax Deducted at Source (TDS)</td><td class="text-right">-${cert.computedTotals?.tdsDeducted?.toFixed(2) || '0.00'}</td></tr>
      <tr class="font-bold"><td class="text-center">19</td><td>Net Tax Payable</td><td class="text-right">${cert.computedTotals?.netTaxPayable?.toFixed(2) || '0.00'}</td></tr>
    </tbody>
  </table>

  <div style="margin-top: 6mm; font-size: 9pt; border-top: 1px dashed #444; padding-top: 2mm;">
    <b>Verification:</b> I, ${cert.signatory.name || 'Signing Officer'}, working in capacity of ${cert.signatory.designation || 'DDO'} certify that the information given above is true and based on official books of account.
    <br/><br/>
    Place: ${cert.signatory.place || 'Surat'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Status: ${cert.status}
  </div>
</body>
</html>`;

        folder?.file(filename, singleHtml);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Form16_Archive_FY${fyLabel}.zip`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bulk Print & Export Suite — FY ${fyLabel}`}
      maxWidth="full"
    >
      <div className="space-y-4">
        {/* Controls & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl">
          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({certs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('reviewed_issued')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'reviewed_issued'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Reviewed & Issued ({certs.filter((c) => c.status === 'ISSUED' || c.status === 'REVIEWED').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('issued')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'issued'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Issued Only ({certs.filter((c) => c.status === 'ISSUED').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('tax_deducted')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'tax_deducted'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tax Deducted ({certs.filter((c) => (c.computedTotals?.tdsDeducted || 0) > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('zero_tax')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterMode === 'zero_tax'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Zero Tax ({certs.filter((c) => (c.computedTotals?.totalTaxPayable || 0) === 0).length})
            </button>
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name / HRPN..."
                className="pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              type="button"
              disabled={isExportingZip || targetCerts.length === 0}
              onClick={() => void handleExportZip()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <FileArchive size={13} /> {isExportingZip ? 'Zipping…' : 'ZIP'}
            </button>
            <button
              type="button"
              disabled={targetCerts.length === 0}
              onClick={handlePrintAll}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Printer size={13} /> Print ({targetCerts.length})
            </button>
          </div>
        </div>

        {/* Preview List Box */}
        <div className="max-h-[64vh] overflow-y-auto app-scroll bg-slate-200/70 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div id="form16-bulk-print-container" className="space-y-6 f16-bulk-wrapper">
            {targetCerts.map((cert) => (
              <div
                key={cert.id || cert.hrpn}
                className="bg-white shadow-md rounded-sm overflow-hidden"
              >
                <Form16Document cert={cert} />
              </div>
            ))}

            {targetCerts.length === 0 && (
              <div className="text-center py-16 text-xs text-slate-400">
                No certificates match the selected filter / search query.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

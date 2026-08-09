import { useState, useRef, useCallback, useEffect } from 'react';
import { salaryService } from '../services/salary.service';
import { FileSpreadsheet, Upload, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { ClassifiedSalaryRecord } from '../validation/salary.schema';

interface ImportedPreviewProps {
  onImported?: (records: ClassifiedSalaryRecord[]) => void;
}

export function SalaryExcelImport({ onImported }: ImportedPreviewProps) {
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<{
    fileName: string;
    rows: unknown[][];
    classified: Awaited<ReturnType<typeof salaryService.classifyRows>>['classified'];
    summary: Awaited<ReturnType<typeof salaryService.classifyRows>>['summary'];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<{
    importId: string;
    total: number;
    matched: number;
    unmatched: number;
    appliedToGrid: number;
  } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setError('Please upload an .xlsx or .xls file');
      return;
    }
    setError(null);
    setPreview(null);
    setImportSummary(null);
    setSelectedFile(file);
    setIsReading(true);
    try {
      const rows = await salaryService.readExcelRows(file);
      const { classified, summary } = await salaryService.classifyRows(rows);
      setPreview({ fileName: file.name, rows, classified, summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read Excel file');
    } finally {
      setIsReading(false);
    }
  }, []);

  const handleImport = async () => {
    if (!preview) return;
    if (!selectedFile) {
      setError('No file selected');
      return;
    }
    setIsImporting(true);
    setError(null);
    try {
      const classified = preview.classified;
      const summary = await salaryService.importSalary(selectedFile);
      setImportSummary({
        importId: summary.importId,
        total: summary.total,
        matched: summary.matched,
        unmatched: summary.unmatched,
        appliedToGrid: summary.appliedToGrid,
      });
      setPreview(null);
      setSelectedFile(null);
      onImported?.(classified);
    } catch (err) {
      console.error('[SalaryExcelImport] import failed:', err);
      let msg: string;
      if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object') {
        const e = err as { message?: string; code?: string; details?: string; hint?: string };
        const parts = [e.message, e.code, e.details, e.hint].filter(Boolean);
        msg = parts.length ? parts.join(' | ') : JSON.stringify(err);
        if (!msg) msg = 'Failed to import salaries';
      } else {
        msg = 'Failed to import salaries';
      }
      setError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!preview && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [preview]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="space-y-4">
      {!preview && (
        <div
          className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={handleBrowse}
        >
          <input
            id="salary-excel-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400 mb-2" />
          <p className="text-[0.8rem] text-slate-600">
            {isReading ? 'Reading Excel file...' : 'Drag Excel file here or click to browse'}
          </p>
          <p className="text-[0.72rem] text-slate-400 mt-1">Accepts .xlsx and .xls</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {preview && (
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Import Preview</h3>
            <span className="text-sm text-slate-500">{preview.fileName}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500">Detected HRPN column</span>
              <div className="font-medium">{preview.summary.hrpnColumnHeader || '(auto)'}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500">Employees in file</span>
              <div className="font-medium">{preview.summary.distinctHrpnCount}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500">Gross columns</span>
              <div className="font-medium">{preview.summary.grossColumns}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500">Income Tax columns</span>
              <div className="font-medium">{preview.summary.incomeTaxColumns}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-600" /> Matched: <b>{preview.summary.matchedRecords}</b>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-amber-600" /> Not found: <b>{preview.summary.unmatchedRecords}</b>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-600" /> Invalid: <b>{preview.summary.invalidRecords}</b>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-slate-500" /> Duplicate: <b>{preview.summary.duplicateRecords}</b>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-slate-500" /> Months: <b>{preview.summary.months.length}</b>
            </div>
          </div>

          {preview.summary.months.length > 0 && (
            <div className="text-xs text-slate-500">
              Detected months:{' '}
              {preview.summary.months
                .map((m) => `${m.month} FY ${m.financialYear}`)
                .join(', ')}
            </div>
          )}

          <div className="overflow-x-auto max-h-72">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">HRPN No.</th>
                  <th className="text-left">Month</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">Income Tax</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.classified.slice(0, 200).map((rec) => (
                  <tr key={`${rec.hprnNo}|${rec.month}|${rec.financialYear}`}>
                    <td className="font-mono text-sm">{rec.hprnNo}</td>
                    <td className="text-sm">{rec.month} FY {rec.financialYear}</td>
                    <td className="text-right font-mono">{rec.grossSalary.toLocaleString('en-IN')}</td>
                    <td className="text-right font-mono">{rec.incomeTax.toLocaleString('en-IN')}</td>
                    <td>
                      <span
                        className={`badge ${
                          rec.status === 'matched'
                            ? 'badge-success'
                            : rec.status === 'unmatched'
                            ? 'badge-warning'
                            : 'badge-ghost'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t sticky bottom-0 bg-white">
            <button
              onClick={() => {
                setPreview(null);
                setSelectedFile(null);
                setError(null);
              }}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || preview.summary.totalRecords === 0}
              className="btn btn-primary btn-sm"
            >
              {isImporting ? (
                <>
                  <RefreshCw size={14} className="mr-1 animate-spin" /> Importing...
                </>
              ) : (
                <Upload size={14} className="mr-1" />
              )}
              Import {preview.summary.totalRecords} records
            </button>
          </div>
        </div>
      )}

      {importSummary && (
        <div className="alert alert-success flex items-center gap-2">
          <CheckCircle size={14} /> Imported {importSummary.matched} matched / {importSummary.unmatched} unmatched
          ({importSummary.total} total). {importSummary.appliedToGrid} records added to payroll data — switch the
          selected month in the grid to view each one.
        </div>
      )}
    </div>
  );
}

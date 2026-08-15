import { useState } from 'react';
import { FileCode, X, Sparkles, ArrowRight } from 'lucide-react';
import { SAMPLE_PAYBILL_RAW_TEXT } from '../utils/samplePayBillPdf';

interface OcrFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitText: (text: string) => void;
}

export function OcrFallbackModal({
  isOpen,
  onClose,
  onSubmitText,
}: OcrFallbackModalProps) {
  const [rawText, setRawText] = useState('');

  if (!isOpen) return null;

  const handleUseSample = () => {
    setRawText(SAMPLE_PAYBILL_RAW_TEXT.trim());
  };

  const handleProcess = () => {
    if (rawText.trim()) {
      onSubmitText(rawText.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                OCR / Raw Text Pay Bill Parser Fallback
              </h3>
              <p className="text-xs text-slate-500">
                Paste OCR text or raw paybill dump if the PDF is scanned or unselectable
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Raw Paybill Text Content:
            </label>
            <button
              type="button"
              onClick={handleUseSample}
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              <Sparkles className="w-3 h-3" /> Paste Sample Text (July-2026)
            </button>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw text containing 'PAYBILL INNER SHEET', DDO details, table rows with HRPNs, and Total..."
            className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Parser Guidance */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3.5 space-y-2">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            For best extraction, make sure the pasted text includes:
          </p>
          <ul className="text-[0.72rem] text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
            <li>
              The header line: <b className="font-mono">PAYBILL INNER SHEET - Earning/Deduction Side for the Month of : July-2026</b>
            </li>
            <li>
              DDO block: <b className="font-mono">D.D.O HRPN : 20105451</b>, <b className="font-mono">Bill No. : Srt0299002201</b>, Major Head &amp; TAN No.
            </li>
            <li>
              Table rows where each employee line starts with <b className="font-mono">Sr No + HRPN</b> followed by amounts (Basic Pay, DA, HRA ... Gross Amt).
            </li>
            <li>
              The footer <b className="font-mono">Total ...</b> row with the same column order — it is used to reconcile the whole bill.
            </li>
            <li>
              For the Deduction side also include the code labels <b className="font-mono">(9510)</b> ... <b className="font-mono">Net Pay</b> from the column header.
            </li>
          </ul>
          <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 leading-relaxed">
            If the raw text is garbled, the parser will still extract what it can and flag low-confidence columns in the warnings list — prefer pasting from a selectable PDF over OCR.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!rawText.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition-all"
          >
            Parse Text <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

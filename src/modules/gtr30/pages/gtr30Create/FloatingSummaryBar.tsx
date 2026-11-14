import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { formatMoney } from '../../services/gtr30Calc.service';
import type { GTR30ValidationWarning } from '../../utils/gtr30BillValidation';

export interface FloatingSummaryBarProps {
  /** Only rendered while the active tab is not "preview" (matches the original inline visibility guard). */
  activeTab: string;
  employeeCount: number;
  totals: {
    gross: number;
    deductions: number;
    net: number;
    societyTotal: number;
    netAfterSociety: number;
  };
  crossWarnings: GTR30ValidationWarning[];
  lastAutoSaved: Date | null;
  onShowPreview: () => void;
  onSaveBill: () => void;
}

/** Sticky bottom summary bar (staff count, gross/deductions/net, save CTA). Extracted from GTR30CreatePage. */
export function FloatingSummaryBar({ activeTab, employeeCount, totals, crossWarnings, lastAutoSaved, onShowPreview, onSaveBill }: FloatingSummaryBarProps) {
  return (
    <>
      {/* Floating Bottom Summary Bar */}
      {activeTab !== 'preview' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur text-white border-t border-slate-800 px-4 sm:px-6 py-2.5 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6 text-xs overflow-x-auto">
            <div>
              <span className="text-slate-400 mr-1">Staff:</span>
              <strong className="text-white text-xs sm:text-xs">{employeeCount}</strong>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400 mr-1">Gross:</span>
              <strong className="text-white text-xs num">₹{formatMoney(totals.gross)}</strong>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400 mr-1">Deductions:</span>
              <strong className="text-rose-400 text-xs num">₹{formatMoney(totals.deductions)}</strong>
            </div>
            <div>
              <span className="text-slate-400 mr-1">Net:</span>
              <strong className="text-emerald-400 text-xs sm:text-xs font-bold num">₹{formatMoney(totals.net)}</strong>
            </div>
            {totals.societyTotal > 0 && (
              <div className="hidden md:block">
                <span className="text-slate-400 mr-1">After Society:</span>
                <strong className="text-sky-300 text-xs num">₹{formatMoney(totals.netAfterSociety)}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {crossWarnings.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShowPreview()}
                className={cn(
                  'h-8 text-xs font-bold',
                  crossWarnings.some((w) => w.severity === 'error')
                    ? 'text-rose-300 hover:text-rose-200 hover:bg-rose-950/50'
                    : 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/50'
                )}
                title="Review cross-page validation issues in the preview tab"
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {crossWarnings.length} issue{crossWarnings.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onShowPreview()} className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700 h-8 text-xs">
              Preview
              <kbd className="hidden sm:inline-flex ml-1.5 text-xs font-mono opacity-60 px-1 py-0.5 rounded bg-white/10 border border-white/20">Ctrl+P</kbd>
            </Button>
            {lastAutoSaved && (
              <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Auto-saved {lastAutoSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button size="sm" onClick={() => onSaveBill()} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white px-4 sm:px-5 h-8 text-xs shadow-md shadow-emerald-600/20">
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save
              <kbd className="hidden sm:inline-flex ml-1.5 text-xs font-mono opacity-60 px-1 py-0.5 rounded bg-white/10 border border-white/20">Ctrl+S</kbd>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calculator,
  ArrowRight,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import type { VendorTdsSummary } from '../types';
import { formatCurrency } from '@/shared/utilities';

interface VendorTdsQuadrantProps {
  vendorTds: VendorTdsSummary;
}

export function VendorTdsQuadrant({ vendorTds }: VendorTdsQuadrantProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-100 dark:ring-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Vendor TDS (26Q) & GST
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Contractor, Supplier & Professional Bill Deductions
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
          {vendorTds?.activePartiesCount ?? 0} Parties
        </span>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Calculator size={13} className="text-amber-600 dark:text-amber-400" />
            <span>26Q IT Deducted</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {formatCurrency(vendorTds?.totalVendorIncomeTax ?? 0)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Sec 194C, 194J, 194Q
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Receipt size={13} className="text-purple-600 dark:text-purple-400" />
            <span>GST TDS (2%)</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {formatCurrency(vendorTds?.totalGstTds ?? 0)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Commercial bills ledger
          </span>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total Commercial Payments:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 ml-1.5 tabular-nums">
            {formatCurrency(vendorTds?.totalVendorAmount ?? 0)}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          {vendorTds?.transactionCount ?? 0} Transactions
        </span>
      </div>

      {/* Action Row */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => navigate('/parties/overview')}
          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Party Ledger
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Add / View Vendor Invoices
            </div>
          </div>
          <ArrowRight size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/parties/gst')}
          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              GST TDS Summary
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Form GSTR-7 Deductions
            </div>
          </div>
          <ArrowRight size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => navigate('/parties/it')}
          className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
        >
          <span>26Q Income Tax Report</span>
          <ChevronRight size={12} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports/26q')}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <span>Form 26Q Export</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

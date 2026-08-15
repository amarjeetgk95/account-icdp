import { FileText, Building, Hash, UserCheck, CreditCard } from 'lucide-react';
import type { PayBillMetadata } from '../types';

interface BillMetadataCardProps {
  metadata: PayBillMetadata;
}

export function BillMetadataCard({ metadata }: BillMetadataCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
              Pay Bill Inner Sheet Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Earning Side &bull; Month: <b className="text-blue-600 dark:text-blue-400">{metadata.month || 'Not Specified'}</b>
            </p>
          </div>
        </div>

        {metadata.billNo && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            Bill No: {metadata.billNo}
          </span>
        )}
      </div>

      {/* 3-Column Government Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Column 1: DDO & Officer info */}
        <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <UserCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Drawing & Disbursing Officer</span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">DDO Name:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[170px]" title={metadata.ddoName}>
                {metadata.ddoName || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">DDO HRPN:</span>
              <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{metadata.ddoHrpn || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">DDO Code No:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{metadata.ddoCode || '-'}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Office & Department */}
        <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <Building className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Office & Department</span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Office:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[170px]" title={metadata.officeName}>
                {metadata.officeName || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Department:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[170px]" title={metadata.department}>
                {metadata.department || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Major Head:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{metadata.majorHead || '-'}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Tax & Registration Details */}
        <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <CreditCard className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Tax & Cardex Registration</span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">TAN No:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{metadata.tanNo || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Cardex No:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{metadata.cardexNo || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Address / Mobile:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-right truncate max-w-[170px]">
                {metadata.address || 'Surat'} {metadata.mobileNo ? `&bull; ${metadata.mobileNo}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

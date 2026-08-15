import React, { useState } from 'react';
import type { PayBillAuditReport } from '../types';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from 'lucide-react';

interface SmartAuditBannerProps {
  auditReport: PayBillAuditReport | null;
  onQuickAddEmployee?: (hrpn: string) => void;
}

export const SmartAuditBanner: React.FC<SmartAuditBannerProps> = ({
  auditReport,
  onQuickAddEmployee,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!auditReport) return null;

  const { daPercentage, previousDaPercentage, isDaHiked, anomalies, healthyRecordCount } = auditReport;

  const warningCount = anomalies.filter((a) => a.severity === 'WARNING').length;
  const infoCount = anomalies.filter((a) => a.severity === 'INFO').length;

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-slate-50 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-slate-900/40 p-4 shadow-sm">
      {/* Top summary row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Smart Salary Audit &amp; Anomaly Detection
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                <TrendingUp size={12} />
                DA Rate: {daPercentage}%
                {previousDaPercentage != null && (
                  <span className="text-indigo-400 font-medium">
                    (prev: {previousDaPercentage}%)
                  </span>
                )}
              </span>
              {isDaHiked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  <CheckCircle2 size={12} />
                  7th Pay DA Applied
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Audited {healthyRecordCount} healthy records &bull; {warningCount} action items &bull; {infoCount} notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {anomalies.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            >
              {isExpanded ? (
                <>
                  Hide Details <ChevronUp size={14} />
                </>
              ) : (
                <>
                  View Audit Details ({anomalies.length}) <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Anomaly Cards */}
      {isExpanded && anomalies.length > 0 && (
        <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  a.severity === 'WARNING'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200'
                    : 'bg-white/80 border-slate-200 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    {a.severity === 'WARNING' ? (
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    ) : (
                      <Info size={14} className="text-blue-500 shrink-0" />
                    )}
                    <span>{a.title}</span>
                    <span className="font-mono text-[0.7rem] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                      {a.hrpn}
                    </span>
                  </div>

                  {a.type === 'NEW_EMPLOYEE' && onQuickAddEmployee && (
                    <button
                      onClick={() => onQuickAddEmployee(a.hrpn)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs"
                    >
                      <UserPlus size={10} /> Quick Add
                    </button>
                  )}
                </div>

                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  {a.description}
                </p>

                {a.oldValue && a.newValue && (
                  <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] text-slate-500">
                    <span>Master: <strong className="text-slate-700 dark:text-slate-300">{String(a.oldValue)}</strong></span>
                    &rarr;
                    <span>PDF: <strong className="text-indigo-600 dark:text-indigo-400">{String(a.newValue)}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

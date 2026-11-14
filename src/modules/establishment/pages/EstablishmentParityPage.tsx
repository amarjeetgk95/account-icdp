import { useMemo } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { StatCardSkeleton } from '@/shared/components/Skeleton';
import { useEmployeeParity } from '../hooks/useEmployeeParity';
import type { PersonParity } from '../services/employeeParity.service';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  return (
    <Card className="p-4">
      <div className={`text-xs font-bold ${tone === 'warn' ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </Card>
  );
}

function Presence({ present }: { present: PersonParity['present'] }) {
  const dot = (on: boolean, title: string) => (
    <span
      title={title}
      className={`inline-block w-2.5 h-2.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
    />
  );
  return (
    <span className="inline-flex items-center gap-1.5">
      {dot(present.establishment, 'Establishment')}
      {dot(present.payroll, 'Payroll')}
    </span>
  );
}

export function EstablishmentParityPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const parityQuery = useEmployeeParity();
  const report = parityQuery.data;

  const drifted = useMemo(
    () => (report?.people || []).filter((p) => p.mismatches.length > 0 || !p.present.establishment || !p.present.payroll),
    [report]
  );

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <WorkspaceHeader
          title="Register Parity"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => parityQuery.refetch()}
              disabled={parityQuery.isFetching}
              className="text-xs"
            >
              <RefreshCw size={13} className={parityQuery.isFetching ? 'animate-spin' : ''} /> Re-check
            </Button>
          }
        />
      )}

      {parityQuery.isLoading || !report ? (
        <StatCardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Canonical persons" value={report.summary.totalCanonical} />
            <Stat
              label="In both registers"
              value={report.summary.inBoth}
              tone={report.summary.inBoth === report.summary.totalCanonical ? 'ok' : 'warn'}
            />
            <Stat
              label="Persons with field drift"
              value={report.summary.mismatchCount}
              tone={report.summary.mismatchCount > 0 ? 'warn' : 'ok'}
            />
            <Stat
              label="Missing somewhere"
              value={report.summary.missingFromEstablishment + report.summary.missingFromPayroll}
              tone={report.summary.missingFromEstablishment + report.summary.missingFromPayroll > 0 ? 'warn' : 'ok'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <Card className="p-3.5">
              <span className="font-bold text-slate-700 dark:text-slate-200">Missing from Establishment: </span>
              <span className="text-slate-600 dark:text-slate-300">{report.summary.missingFromEstablishment}</span>
            </Card>
            <Card className="p-3.5">
              <span className="font-bold text-slate-700 dark:text-slate-200">Missing from Payroll: </span>
              <span className="text-slate-600 dark:text-slate-300">{report.summary.missingFromPayroll}</span>
            </Card>
          </div>

          {(report.sources.establishment !== 'ok' || report.sources.payroll !== 'ok') && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>
                Some sources were unreachable:{' '}
                {(['establishment', 'payroll'] as const)
                  .filter((s) => report.sources[s] !== 'ok')
                  .join(', ')}
                . Counts below are partial.
              </span>
            </div>
          )}

          {drifted.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={20} className="mx-auto text-emerald-500 mb-2" />
              All registers agree. The reconciliation bridge can be retired.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Users size={14} /> Divergent persons ({drifted.length})
                <span className="text-xs font-medium text-slate-400">dots: Establishment · Payroll</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-mobile-cards w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-2.5 font-bold">Person (HRPN / PAN)</th>
                      <th className="px-4 py-2.5 font-bold">Present</th>
                      <th className="px-4 py-2.5 font-bold">Drift detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {drifted.map((p) => (
                      <tr key={p.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td data-label="Person" className="cell-full px-4 py-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{p.canonicalName}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {[p.hrpn || 'no-HRPN', p.pan || 'no-PAN'].join(' · ')}
                          </div>
                        </td>
                        <td data-label="Present" className="px-4 py-2.5">
                          <Presence present={p.present} />
                        </td>
                        <td data-label="Drift detail" className="cell-full px-4 py-2.5 max-w-md whitespace-normal">
                          {p.mismatches.length === 0 ? (
                            <span className="text-slate-400 italic">absent from a register</span>
                          ) : (
                            <ul className="space-y-1">
                              {p.mismatches.map((m) => (
                                <li key={m.field} className="text-slate-600 dark:text-slate-300">
                                  <span className="font-bold capitalize">{m.field}</span>
                                  {': '}
                                  {[m.establishment && `Est: ${m.establishment}`, m.payroll && `Pay: ${m.payroll}`]
                                    .filter(Boolean)
                                    .join(' | ')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

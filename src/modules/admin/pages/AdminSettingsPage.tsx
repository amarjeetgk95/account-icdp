import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Save, CalendarDays, ChevronDown, MapPin } from 'lucide-react';
import { useOffices, useOfficeConfig, useSetOfficeFy } from '../hooks/useAdmin';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { EmptyState } from '@/shared/components/EmptyState';
import { Skeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSectionIcon } from '@/shared/icons';

const fySchema = z.object({
  fy: z.coerce.number().int().min(2000, 'Enter a valid financial year').max(2100),
});

type FyValues = z.infer<typeof fySchema>;

export function AdminSettingsPage() {
  const { toast } = useToast();
  const { data: offices, isLoading: officesLoading, error: officesError } = useOffices();
  const [officeId, setOfficeId] = useState<string | null>(null);
  const { data: config, isLoading: configLoading, error: configError } = useOfficeConfig(officeId);
  const setOfficeFy = useSetOfficeFy();

  const selectedOffice = useMemo(
    () => (offices ?? []).find((o) => o.id === officeId) ?? null,
    [offices, officeId]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FyValues>({
    resolver: zodResolver(fySchema),
    defaultValues: { fy: new Date().getFullYear() },
  });

  useEffect(() => {
    if (config?.current_fy) reset({ fy: config.current_fy });
  }, [config, reset]);

  const onSetFy = handleSubmit(async (values) => {
    if (!officeId) return;
    try {
      await setOfficeFy.mutateAsync({ officeId, fy: values.fy });
      toast({
        title: 'Financial year updated',
        description: `${selectedOffice?.name ?? 'Office'} is now set to ${values.fy}-${String(values.fy + 1).slice(-2)}.`,
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update financial year',
        variant: 'destructive',
      });
    }
  });

  return (
    <AdminLayout
      title="System Settings"
      icon={getSectionIcon('settings')}
    >
      <div className="space-y-4">
        {officesError && (
          <ErrorBanner title="Failed to load offices:" error={officesError} className="animate-fade-in" />
        )}

        <div className="card rounded-2xl animate-fade-in">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="um-field mb-0 md:col-span-2">
                <label className="label">Office</label>
                <div className="relative">
                  <Building2 size={15} className="um-field-icon" />
                  <select
                    value={officeId ?? ''}
                    onChange={(e) => setOfficeId(e.target.value || null)}
                    className="input pl-9 pr-9 appearance-none"
                  >
                    <option value="">Select an office...</option>
                    {(offices ?? []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.current_fy ? ` — FY ${o.current_fy}-${String(o.current_fy + 1).slice(-2)}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                  />
                </div>
              </div>
              {officesLoading && (
                <div className="md:col-span-2">
                  <Skeleton className="h-9 w-full" />
                </div>
              )}
            </div>
          </div>
        </div>

        {!officeId ? (
          <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
            <EmptyState
              icon={Building2}
              title="Choose an office to manage"
              hint="Pick an office above to view its configuration and set a financial-year override."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {configError && (
              <ErrorBanner title="Failed to load office config:" error={configError} className="animate-fade-in" />
            )}

            <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
              <div className="card-body">
                {configLoading || !config ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                 ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Building2 size={14} strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                          {config.office_name}
                        </h3>
                        {config.district && (
                          <p className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin size={11} /> {config.district}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-[0.6rem] uppercase font-semibold text-slate-400">Users</div>
                        <div className="text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">{config.users}</div>
                      </div>
                      <div>
                        <div className="text-[0.6rem] uppercase font-semibold text-slate-400">Employees</div>
                        <div className="text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">{config.employees}</div>
                      </div>
                      <div>
                        <div className="text-[0.6rem] uppercase font-semibold text-slate-400">Fiscal Years</div>
                        <div className="text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">{config.financial_years.length}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-2">
              <div className="card-body">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-white mb-1">
                  Financial Year Override
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Set the active financial year for this office. It overrides the global header switcher
                  for this office&apos;s data entry.
                </p>
                {configLoading || !config ? (
                  <Skeleton className="h-9 w-full max-w-xs" />
                ) : (
                  <form onSubmit={(e) => void onSetFy(e)} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end max-w-2xl">
                    <div className="um-field mb-0">
                      <label className="label">Financial Year</label>
                      <div className="relative">
                        <CalendarDays size={15} className="um-field-icon" />
                        <select
                          className="input pl-9 pr-9 appearance-none"
                          {...register('fy', { valueAsNumber: true })}
                        >
                          {config.financial_years.length > 0 ? (
                            config.financial_years.map((fy) => (
                              <option key={fy} value={fy}>
                                {fy}-{String(fy + 1).slice(-2)}
                              </option>
                            ))
                          ) : (
                            <option value={new Date().getFullYear()}>
                              {new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(-2)}
                            </option>
                          )}
                        </select>
                        <ChevronDown
                          size={15}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                        />
                      </div>
                      {errors.fy && (
                        <span className="um-field-error">{errors.fy.message}</span>
                      )}
                    </div>
                    <div>
                      <button type="submit" disabled={setOfficeFy.isPending} className="btn btn-primary w-full">
                        {setOfficeFy.isPending ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="animate-spin rounded-full border-2 border-white/30 border-t-white h-4 w-4"></span>
                            Saving...
                          </span>
                        ) : (
                          <>
                            <Save size={14} /> Save Override
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

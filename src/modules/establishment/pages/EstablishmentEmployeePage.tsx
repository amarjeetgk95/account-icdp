import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  Save,
  Shield,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentEmployees,
  useSaveEstablishmentEmployee,
} from '../hooks/useEstablishment';
import { useEstablishmentPositions } from '../hooks/useEstablishmentPositions';
import { syncEmployeePositionAssignment } from '../repositories/positionBackend.repository';
import { createBlankEstablishmentEmployee } from '../constants';
import { EstablishmentGujaratiDesignationPicker } from '../components/EstablishmentGujaratiDesignationPicker';
import { englishDesignationOf } from '../constants/establishmentPostCatalog';
import { useBudgetHeads } from '@/modules/payroll/hooks/useBudgetHeads';
import { useUIStore } from '@/core/stores/ui-store';
import { MONTHS } from '@/shared/constants';
import { getActiveEntryMonths } from '@/modules/payroll/utils/employeeDates';
import type { EstablishmentEmployee } from '../types';

export function EstablishmentEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const employeesQuery = useEstablishmentEmployees();
  const { data: positionsData } = useEstablishmentPositions();
  const positions = useMemo(() => positionsData ?? [], [positionsData]);
  const { heads } = useBudgetHeads();
  const saveMutation = useSaveEstablishmentEmployee();
  const storeFY = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${storeFY}-${String(storeFY + 1).slice(-2)}`;

  const existing = useMemo(
    () => (id ? employeesQuery.data.find((e) => e.id === id) ?? null : null),
    [employeesQuery.data, id]
  );

  const [data, setData] = useState<EstablishmentEmployee>(() => existing ?? createBlankEstablishmentEmployee());
  const loadedIdRef = useRef<string | null>(null);
  const [isDropdownDismissed, setIsDropdownDismissed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const currentPosition = useMemo(() => {
    if (!data.id) return null;
    return positions.find((p) => p.currentEmployeeId === data.id) ?? null;
  }, [positions, data.id]);

  const [pendingPositionId, setPendingPositionId] = useState<string | null>(null);
  const selectedPositionId = pendingPositionId ?? currentPosition?.id ?? '';

  const availablePositions = useMemo(() => {
    return positions.filter((p) => {
      if (p.status === 'Abolished' || p.status === 'Cancelled') return false;
      return p.status === 'Vacant' || p.id === currentPosition?.id;
    });
  }, [positions, currentPosition]);

  const handlePositionChange = (posId: string) => {
    setPendingPositionId(posId);
    if (posId) {
      const picked = positions.find((p) => p.id === posId);
      if (picked) {
        const enTitle = picked.designationTitleEn || englishDesignationOf(picked.postName);
        const guTitle = picked.designationTitleGu || picked.postName;
        const cadreDigit = picked.cadreClass ? picked.cadreClass.match(/\d/)?.[0] || picked.cadreClass : undefined;
        setData((prev) => ({
          ...prev,
          designationGu: guTitle,
          designation: enTitle,
          cadreClass: cadreDigit || prev.cadreClass,
          budgetHeadId: picked.budgetHeadId || prev.budgetHeadId,
        }));
      }
    }
  };

  useEffect(() => {
    if (id && existing && loadedIdRef.current !== id) {
      loadedIdRef.current = id;
      setData(existing);
    }
  }, [id, existing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownDismissed(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nameSearchResults = useMemo(() => {
    if (id) return [];
    const term = (data.name || '').trim().toLowerCase();
    if (term.length < 1) return [];
    return employeesQuery.data
      .filter((emp) => emp.id !== data.id && emp.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [data.name, data.id, employeesQuery.data, id]);

  const showDropdown = nameSearchResults.length > 0 && !isDropdownDismissed && !id;

  const selectSearchedEmployee = (emp: EstablishmentEmployee) => {
    setIsDropdownDismissed(true);
    setPendingPositionId(null);
    setData(emp);
    setFormStatus({ type: 'info', message: `Employee "${emp.name}" found. Loaded for editing.` });
    // keep URL in sync if we were on add route
    if (!id) {
      window.history.replaceState(null, '', `/establishment/employees/edit/${emp.id}`);
    }
  };

  const setField = <K extends keyof EstablishmentEmployee>(field: K, value: EstablishmentEmployee[K]) =>
    setData((cur) => ({ ...cur, [field]: value }));

  const saveEmployee = async () => {
    if (!data.name.trim()) {
      toast({ title: 'Name Required', description: 'Enter the employee name before saving.', variant: 'destructive' });
      return;
    }
    const isPopup = typeof window !== 'undefined' && window.opener != null;
    try {
      const saved = await saveMutation.mutateAsync(data);

      const newPositionId = selectedPositionId || null;
      const previousPositionId = currentPosition?.id ?? null;
      if (newPositionId !== previousPositionId || data.transferDate) {
        await syncEmployeePositionAssignment({
          employeeId: saved.id,
          newPositionId,
          previousPositionId,
          effectiveDate: data.joinDate || undefined,
          isTransferred: Boolean(data.transferDate),
        });
        queryClient.invalidateQueries({ queryKey: ['establishmentPositions'] });
      }

      toast({ title: 'Employee Saved', description: `${data.name} saved to the establishment register.` });
      if (isPopup) {
        try {
          window.opener?.postMessage({ type: 'establishment:refresh', id: saved.id }, '*');
          localStorage.setItem('establishment:refresh', String(Date.now()));
        } catch {
          // opener may be cross-origin or already closed
        }
        window.close();
        setTimeout(() => {
          if (!window.closed) navigate('/establishment');
        }, 400);
        return;
      }
      navigate('/establishment');
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const completion = useMemo(() => {
    let c = 0;
    if (data.name.trim()) c += 25;
    if (data.pan && data.pan.length === 10) c += 20;
    if (data.designation) c += 15;
    if (data.cadreClass) c += 15;
    if (data.joinDate) c += 15;
    if (data.hrpnNo) c += 10;
    return Math.min(100, c);
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-32 sm:pb-28">
      {/* Compact Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/establishment')} className="h-9 w-9 shrink-0 text-slate-600 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {id ? 'Edit Employee' : 'Register New Employee'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 sm:flex-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="font-semibold">FY {fyLabel}</span>
            <span>• {data.active ? 'Active' : 'Inactive'}</span>
            <span className="num font-semibold text-blue-600 dark:text-blue-400">{completion}% complete</span>
          </div>
          <Button size="sm" onClick={saveEmployee} disabled={saveMutation.isPending} className="hidden h-8 px-4 font-bold bg-blue-600 hover:bg-blue-700 text-white sm:inline-flex">
            <Save className="mr-1.5 h-4 w-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Employee'}
          </Button>
        </div>
      </div>

      {/* Identity & Posting — streamlined for establishment only */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="space-y-6 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-600/20 flex items-center justify-center text-white"><Users className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">Identity &amp; Posting</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Core service details for the establishment register. Pay, allowances and deductions are maintained in GTR-30.</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold"><Shield className="h-3.5 w-3.5" /> {data.active ? 'Active' : 'Inactive'}</span>
          </div>

          {formStatus && (
            <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border shadow-sm ${formStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : formStatus.type === 'error' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>{formStatus.message}</div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-1 rounded-full bg-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Personal</h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative lg:col-span-2" ref={dropdownRef}>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Employee Name *</Label>
                <Input value={data.name} onChange={(e) => { setField('name', e.target.value); setIsDropdownDismissed(false); if (formStatus) setFormStatus(null); }} placeholder="Type to search existing..." autoComplete="off" className="mt-1 h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:ring-blue-600" />
                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {nameSearchResults.map((emp) => (
                      <button key={emp.id} type="button" onClick={() => selectSearchedEmployee(emp)} className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">{emp.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-xs ml-2">{emp.pan || emp.hrpnNo || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Name (Gujarati)</Label>
                <Input value={data.nameGu ?? ''} onChange={(e) => setField('nameGu', e.target.value)} className="mt-1 h-9 bg-white dark:bg-slate-900 font-gujSans" placeholder="e.g. પટેલ સુરેશભાઈ" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Mobile No.</Label>
                <Input type="tel" value={data.mobileNo ?? ''} onChange={(e) => setField('mobileNo', e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 15))} className="mt-1 h-9 font-mono bg-white dark:bg-slate-900" placeholder="e.g. 9876543210" maxLength={15} />
              </div>
              <div>
                <Label className="text-xs font-semibold">HRPN No.</Label>
                <Input value={data.hrpnNo ?? ''} onChange={(e) => setField('hrpnNo', e.target.value.toUpperCase().trim())} className="mt-1 h-9 font-mono uppercase bg-white dark:bg-slate-900" placeholder="e.g. 100123" maxLength={50} />
              </div>
              <div>
                <Label className="text-xs font-semibold">PAN <span className="text-red-500">*</span></Label>
                <Input value={data.pan ?? ''} onChange={(e) => setField('pan', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} className="mt-1 h-9 font-mono uppercase font-semibold tracking-wider bg-white dark:bg-slate-900" placeholder="ABCDE1234F" maxLength={10} />
              </div>
              <div className="lg:col-span-2">
                <Label className="text-xs font-semibold">Designation (English)</Label>
                <Input value={data.designation ?? ''} onChange={(e) => setField('designation', e.target.value)} className="mt-1 h-9 bg-white dark:bg-slate-900" placeholder="e.g. Research Assistant" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Designation (Gujarati) <span className="font-normal text-slate-400 text-xs">(from sanctioned posts)</span></Label>
                <div className="mt-1">
                  <EstablishmentGujaratiDesignationPicker id="est-designationGu" value={data.designationGu ?? ''} onChange={(v) => setField('designationGu', v)} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-1 rounded-full bg-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Service &amp; Posting</h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Departmental Position</span>
                  {currentPosition && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Current Position: #{currentPosition.positionNo}
                    </span>
                  )}
                </Label>
                <select
                  value={selectedPositionId}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="">— Unassigned (Awaiting Post) —</option>
                  {availablePositions.map((p) => {
                    const isCurrent = p.id === currentPosition?.id;
                    return (
                      <option key={p.id} value={p.id}>
                        [Position #{p.positionNo}] {p.postName} {isCurrent ? '★ (Current Assignment)' : '(Vacant)'}{p.budgetHeadCode ? ` • Budget: ${p.budgetHeadCode}` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">
                  Selecting a position auto-populates designation and budget head.
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Cadre Class</Label>
                <select value={data.cadreClass ?? ''} onChange={(e) => setField('cadreClass', e.target.value)} className="mt-1 w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                  <option value=""></option>
                  <option value="1">Class 1</option>
                  <option value="2">Class 2</option>
                  <option value="3">Class 3</option>
                  <option value="4">Class 4</option>
                  {data.cadreClass && !['', '1', '2', '3', '4'].includes(data.cadreClass) && <option value={data.cadreClass}>{data.cadreClass}</option>}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Join Date</Label>
                <Input type="date" value={data.joinDate ?? ''} onChange={(e) => setField('joinDate', e.target.value)} className="mt-1 h-9 num text-xs bg-white dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Transfer Date</Label>
                <Input type="date" value={data.transferDate ?? ''} onChange={(e) => setField('transferDate', e.target.value)} className="mt-1 h-9 num text-xs bg-white dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <select value={data.active ? 'active' : 'inactive'} onChange={(e) => setField('active', e.target.value === 'active')} className="mt-1 w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Budget Head</Label>
                <select value={data.budgetHeadId ?? ''} onChange={(e) => setField('budgetHeadId', e.target.value)} className="mt-1 w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                  <option value="">— Unassigned —</option>
                  {heads.map((head) => (
                    <option key={head.id} value={head.id}>
                      {head.code} — {head.name}
                    </option>
                  ))}
                  {data.budgetHeadId && !heads.some((h) => h.id === data.budgetHeadId) && <option value={data.budgetHeadId}>{data.budgetHeadId} (legacy tag)</option>}
                </select>
                <p className="text-xs text-slate-400 mt-1">Drives Budget Head Report grouping.</p>
              </div>
            </div>
          </div>

          {(data.joinDate || data.transferDate) && (
            <div className="rounded-xl px-4 py-3 text-xs bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-center gap-2 font-medium shadow-sm">
              {(() => {
                const activeMonths = getActiveEntryMonths(storeFY, data.joinDate || null, data.transferDate || null);
                if (activeMonths.length === 0) return <span>Not active for any salary entry in FY {fyLabel}.</span>;
                const first = activeMonths[0];
                const last = activeMonths[activeMonths.length - 1];
                const nextIdx = MONTHS.indexOf(last) + 1;
                return (<span><b>Active for salary entry:</b> {first} → {last}{data.transferDate && nextIdx < MONTHS.length && <span className="text-amber-700 dark:text-amber-400 ml-1">(transferred from {MONTHS[nextIdx]} onward)</span>}</span>);
              })()}
            </div>
          )}
        </div>
      </Card>

      {/* Bottom save bar — robust */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900/95 px-3 pb-safe pt-3 text-white shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center"><Users className="h-4 w-4" /></div>
              <div><div className="text-slate-400 text-xs uppercase tracking-wide font-bold">Staff</div><div className="font-bold text-white -mt-1">{data.name || 'Unnamed'}</div></div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/10" />
            <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" /> {data.active ? 'Active' : 'Inactive'} · FY {fyLabel}
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <Button variant="outline" size="sm" onClick={() => navigate('/establishment')} className="flex-1 bg-white/10 text-white hover:bg-white/15 border-white/15 h-10 text-xs font-semibold sm:flex-none">
              Cancel
            </Button>
            <Button size="sm" onClick={saveEmployee} disabled={saveMutation.isPending} className={cn('flex-1 justify-center font-black text-white h-10 text-xs px-4 shadow-lg sm:flex-none sm:px-5', 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-900/20')}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saveMutation.isPending ? 'Saving…' : 'Save Employee'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

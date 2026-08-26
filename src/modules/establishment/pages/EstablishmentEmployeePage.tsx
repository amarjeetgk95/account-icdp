import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Save,
  Shield,
  Users,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentEmployees,
  useSaveEstablishmentEmployees,
} from '../hooks/useEstablishment';
import { createBlankEstablishmentEmployee } from '../constants';
import { EstablishmentGujaratiDesignationPicker } from '../components/EstablishmentGujaratiDesignationPicker';
import { useUIStore } from '@/core/stores/ui-store';
import { MONTHS } from '@/shared/constants';
import { getActiveEntryMonths } from '@/modules/payroll/utils/employeeDates';
import type { EstablishmentEmployee } from '../types';

export function EstablishmentEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const employeesQuery = useEstablishmentEmployees();
  const saveMutation = useSaveEstablishmentEmployees();
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
    const others = employeesQuery.data.filter((e) => e.id !== data.id);
    const isPopup = typeof window !== 'undefined' && window.opener != null;
    try {
      await saveMutation.mutateAsync([...others, data]);
      toast({ title: 'Employee Saved', description: `${data.name} saved to the establishment register.` });
      if (isPopup) {
        try {
          window.opener?.postMessage({ type: 'establishment:refresh', id: data.id }, '*');
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
    <div className="max-w-5xl mx-auto space-y-6 pb-28">
      {/* Robust Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/15 rounded-full blur-3xl translate-y-1/3 -translate-x-10" />
        <div className="relative p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/establishment')} className="shrink-0 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 backdrop-blur">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-blue-200">
                  <Building2 className="h-3.5 w-3.5" /> Establishment · Register
                  <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white text-[10px] font-semibold">
                    <Sparkles className="h-3 w-3" /> Govt. of Gujarat
                  </span>
                </div>
                <h1 className="mt-1 text-2xl lg:text-3xl font-black tracking-tight text-white">
                  {id ? 'Edit Employee' : 'Register New Employee'}
                  <span className="ml-2 font-serif font-normal text-blue-200 text-lg">— કર્મચારી નોંધણી</span>
                </h1>
                <p className="mt-1 text-sm text-blue-100/80 max-w-2xl">
                  {id ? 'Update identity and posting details for the establishment register.' : 'Create a canonical service record. Pay-related details are managed in GTR-30 pay bills.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur text-white">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold">FY {fyLabel}</span>
                <span className="text-xs text-blue-200">• {data.active ? 'Active' : 'Inactive'}</span>
              </div>
              <Button size="sm" onClick={saveEmployee} disabled={saveMutation.isPending} className="h-9 px-5 font-bold bg-white text-blue-900 hover:bg-blue-50 shadow-lg shadow-blue-900/20">
                <Save className="mr-1.5 h-4 w-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Employee'}
              </Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 max-w-2xl">
            <div className="col-span-3 sm:col-span-1 bg-white/10 backdrop-blur rounded-xl border border-white/10 p-3">
              <div className="text-[11px] font-bold tracking-widest uppercase text-blue-200">Profile Completion</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all" style={{ width: `${completion}%` }} />
                </div>
                <span className="text-sm font-black text-white font-mono">{completion}%</span>
              </div>
            </div>
            <div className="hidden sm:flex bg-white rounded-xl p-3 items-center gap-3 shadow-sm">
              <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><BadgeCheck className="h-5 w-5" /></div>
              <div><div className="text-[11px] font-bold uppercase text-slate-500">HRPN</div><div className="text-sm font-mono font-bold text-slate-900">{data.hrpnNo || '—'}</div></div>
            </div>
            <div className="hidden sm:flex bg-white rounded-xl p-3 items-center gap-3 shadow-sm">
              <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600"><Shield className="h-5 w-5" /></div>
              <div><div className="text-[11px] font-bold uppercase text-slate-500">Cadre</div><div className="text-sm font-bold text-slate-900">{data.cadreClass ? `Class ${data.cadreClass}` : '—'}</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Identity & Posting — streamlined for establishment only */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="p-5 lg:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-600/20 flex items-center justify-center text-white"><Users className="h-5 w-5" /></div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">Identity &amp; Posting — ઓળખ અને નિમણૂક</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Core service details for the establishment register. Pay, allowances and deductions are maintained in GTR-30.</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold"><Shield className="h-3.5 w-3.5" /> {data.active ? 'Active' : 'Inactive'}</span>
          </div>

          {formStatus && (
            <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border shadow-sm ${formStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : formStatus.type === 'error' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>{formStatus.message}</div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-1 rounded-full bg-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Personal</h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative lg:col-span-2" ref={dropdownRef}>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Employee Name * <span className="font-normal text-slate-400">— કર્મચારીનું નામ</span></Label>
                <Input value={data.name} onChange={(e) => { setField('name', e.target.value); setIsDropdownDismissed(false); if (formStatus) setFormStatus(null); }} placeholder="Type to search existing..." autoComplete="off" className="mt-1 h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:ring-blue-600" />
                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {nameSearchResults.map((emp) => (
                      <button key={emp.id} type="button" onClick={() => selectSearchedEmployee(emp)} className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{emp.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-xs ml-2">{emp.pan || emp.hrpnNo || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">HRPN No. — એચઆરપીએન</Label>
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
                <Label className="text-xs font-semibold">Designation (Gujarati) — હોદ્દો <span className="font-normal text-slate-400 text-[11px]">(from sanctioned posts)</span></Label>
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
                <Label className="text-xs font-semibold">Cadre Class — વર્ગ</Label>
                <select value={data.cadreClass ?? ''} onChange={(e) => setField('cadreClass', e.target.value)} className="mt-1 w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                  <option value=""></option>
                  <option value="1">વર્ગ ૧ — Class 1</option>
                  <option value="2">વર્ગ ૨ — Class 2</option>
                  <option value="3">વર્ગ ૩ — Class 3</option>
                  <option value="4">વર્ગ ૪ — Class 4</option>
                  {data.cadreClass && !['', '1', '2', '3', '4'].includes(data.cadreClass) && <option value={data.cadreClass}>{data.cadreClass}</option>}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Join Date — જોડાણ તારીખ</Label>
                <Input type="date" value={data.joinDate ?? ''} onChange={(e) => setField('joinDate', e.target.value)} className="mt-1 h-9 font-mono text-xs bg-white dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Transfer Date — બદલી તારીખ</Label>
                <Input type="date" value={data.transferDate ?? ''} onChange={(e) => setField('transferDate', e.target.value)} className="mt-1 h-9 font-mono text-xs bg-white dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Status — સ્થિતિ</Label>
                <select value={data.active ? 'active' : 'inactive'} onChange={(e) => setField('active', e.target.value === 'active')} className="mt-1 w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm">
                  <option value="active">Active — સક્રિય</option>
                  <option value="inactive">Inactive — નિષ્ક્રિય</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <Label className="text-xs font-semibold">Headquarter Name — મુખ્ય મથક</Label>
                <Input value={data.headquarter ?? ''} onChange={(e) => setField('headquarter', e.target.value)} className="mt-1 h-9 bg-white dark:bg-slate-900" placeholder="e.g. Surat, Gandhinagar" />
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 text-white border-t border-slate-800 px-4 sm:px-6 py-3 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center"><Users className="h-4 w-4" /></div>
              <div><div className="text-slate-400 text-[11px] uppercase tracking-wide font-bold">Staff</div><div className="font-bold text-white -mt-1">{data.name || 'Unnamed'}</div></div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/10" />
            <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" /> {data.active ? 'Active' : 'Inactive'} · FY {fyLabel}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate('/establishment')} className="bg-white/10 text-white hover:bg-white/15 border-white/15 h-9 text-xs font-semibold">
              Cancel
            </Button>
            <Button size="sm" onClick={saveEmployee} disabled={saveMutation.isPending} className={cn('font-black text-white h-9 text-xs px-5 shadow-lg', 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-900/20')}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saveMutation.isPending ? 'Saving…' : 'Save Employee'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

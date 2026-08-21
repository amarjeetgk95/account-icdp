import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  UserCog,
  TreePine,
  UserRound,
  FileText,
  ScrollText,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Percent,
  Calendar,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useGTR30Settings,
  useSaveGTR30Settings,
  useResetGTR30Settings,
} from '../hooks/useGTR30Settings';
import type { GTR30DARateEntry, GTR30DefaultSettings, GTR30DefaultEmployeeTemplate } from '../types/settings';
import type { GTR30PostItem } from '../types';
import { GTR30BillCodeMappingView } from './GTR30BillCodeMappingView';
import { normalizeDARates, DEFAULT_DA_PERCENT, parseFlexibleDateToISO } from '../utils/gtr30GovRules';

const EMPTY_POST: GTR30PostItem = {
  id: '',
  srNo: '',
  designation: '',
  cadreClass: '૩',
  sanctioned: 1,
  filled: 0,
  vacant: 1,
  total: 1,
};

const CADRE_CLASS_OPTIONS = ['૧', '૨', '૩', '૪'];
const ASCII_TO_GUJARATI: Record<string, string> = {
  '1': '૧',
  '2': '૨',
  '3': '૩',
  '4': '૪',
};
const toGujaratiCadre = (value: string) => ASCII_TO_GUJARATI[value] ?? value;

const GIS_GROUP_OPTIONS = ['ક', 'ખ', 'ગ', 'ઘ'];

type TabId = 'office' | 'drawing' | 'budget' | 'template' | 'posts' | 'daRates' | 'resolutions';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'office', label: 'Office & Treasury', icon: Building2 },
  { id: 'drawing', label: 'Drawing Officer', icon: UserCog },
  { id: 'budget', label: 'Budget Heads', icon: TreePine },
  { id: 'template', label: 'Employee Template', icon: UserRound },
  { id: 'posts', label: 'Establishment Posts', icon: FileText },
  { id: 'daRates', label: 'DA Rates', icon: Percent },
  { id: 'resolutions', label: 'Resolutions & Bill Codes', icon: ScrollText },
];

function validateSettings(s: GTR30DefaultSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!s.officeName.trim()) errors.officeName = 'Required — printed on the bill header.';
  if (!s.officeFullName.trim()) errors.officeFullName = 'Required — printed on the bill header.';
  if (!s.treasuryName.trim()) errors.treasuryName = 'Required — printed on the bill header.';
  if (!s.drawingOfficerName.trim()) errors.drawingOfficerName = 'Required — signed on every bill.';
  const district = s.district.trim();
  if (district && !/^\d+$/.test(district)) errors.district = 'District code should contain digits only.';
  const headDigits = s.headChargeable.replace(/[^0-9]/g, '');
  if (headDigits && headDigits.length !== 13) {
    errors.headChargeable = `Head of account should total 13 digits (currently ${headDigits.length}).`;
  }
  return errors;
}

function validateDaRates(rates: GTR30DARateEntry[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (rates.length === 0) errors.daRates = 'At least one DA rate is required.';
  const seen = new Set<string>();
  rates.forEach((r, idx) => {
    const raw = (r.effectiveFrom || '').trim();
    if (!raw) {
      errors[`da_${idx}_date`] = 'Effective date required.';
    } else {
      const iso = parseFlexibleDateToISO(raw);
      // Allow partial typing: don't flag format error for very short inputs (e.g. "0", "01")
      // Only validate once user has typed at least 6 chars (e.g. "01-07-")
      if (!iso && raw.length >= 6) {
        errors[`da_${idx}_date`] = 'Use YYYY-MM-DD or DD-MM-YYYY (e.g. 01-07-2026).';
      } else if (iso) {
        if (seen.has(iso)) errors[`da_${idx}_date`] = 'Duplicate effective date.';
        else seen.add(iso);
      }
    }
    if (r.rate === undefined || r.rate === null || String(r.rate).trim() === '') errors[`da_${idx}_rate`] = 'Rate required.';
    else if (Number(r.rate) < 0 || Number(r.rate) > 100) errors[`da_${idx}_rate`] = 'Rate must be 0–100%.';
  });
  return errors;
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
      <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function SettingsField({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass = (invalid?: boolean) =>
  `h-9 mt-1 text-sm bg-white dark:bg-slate-900 ${
    invalid
      ? 'border-red-400 focus-visible:ring-red-400'
      : 'border-slate-300 dark:border-slate-700'
  }`;

const selectClass = (invalid?: boolean) =>
  `w-full h-9 mt-1 rounded-md border bg-white dark:bg-slate-900 px-2 text-sm dark:text-slate-200 ${
    invalid ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'
  }`;

export function GTR30SettingsView() {
  const { toast } = useToast();
  const settingsQuery = useGTR30Settings();
  const saveMutation = useSaveGTR30Settings();
  const resetMutation = useResetGTR30Settings();

  const initial = settingsQuery.data;

  const [activeTab, setActiveTab] = useState<TabId>('office');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<GTR30DefaultSettings>(() => ({
    ...(initial?.settings ?? ({} as GTR30DefaultSettings)),
  }));
  const [localTemplate, setLocalTemplate] = useState<GTR30DefaultEmployeeTemplate>(() => ({
    ...(initial?.employeeTemplate ?? ({} as GTR30DefaultEmployeeTemplate)),
  }));
  const [localPosts, setLocalPosts] = useState<GTR30PostItem[]>(() =>
    (initial?.defaultPosts ?? []).map((p) => ({ ...p }))
  );
  const [localDaRates, setLocalDaRates] = useState<GTR30DARateEntry[]>(() =>
    (initial?.daRates ?? []).map((r) => ({ ...r }))
  );

  const savedSnapshot = useMemo(
    () =>
      JSON.stringify({
        settings: initial?.settings,
        employeeTemplate: initial?.employeeTemplate,
        defaultPosts: initial?.defaultPosts,
        daRates: initial?.daRates,
      }),
    [initial]
  );
  const [resyncedSnapshot, setResyncedSnapshot] = useState(savedSnapshot);
  if (initial && savedSnapshot !== resyncedSnapshot) {
    setResyncedSnapshot(savedSnapshot);
    setLocalSettings({ ...initial.settings });
    setLocalTemplate({ ...initial.employeeTemplate });
    setLocalPosts(initial.defaultPosts.map((p) => ({ ...p })));
    setLocalDaRates((initial.daRates ?? []).map((r) => ({ ...r })));
  }
  const localSnapshot = JSON.stringify({
    settings: localSettings,
    employeeTemplate: localTemplate,
    defaultPosts: localPosts,
    daRates: localDaRates,
  });
  const dirty = savedSnapshot !== localSnapshot;

  const errors = useMemo(() => validateSettings(localSettings), [localSettings]);
  const daErrors = useMemo(() => validateDaRates(localDaRates), [localDaRates]);
  const hasErrors = Object.keys(errors).length > 0 || Object.keys(daErrors).length > 0;

  const tabIssues: Record<TabId, boolean> = {
    office: Boolean(errors.officeName || errors.officeFullName || errors.treasuryName || errors.district),
    drawing: Boolean(errors.drawingOfficerName),
    budget: Boolean(errors.headChargeable),
    template: false,
    posts: false,
    daRates: Object.keys(daErrors).length > 0,
    resolutions: false,
  };

  const handleSettingChange = <K extends keyof GTR30DefaultSettings>(
    field: K,
    value: GTR30DefaultSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = <K extends keyof GTR30DefaultEmployeeTemplate>(
    field: K,
    value: GTR30DefaultEmployeeTemplate[K]
  ) => {
    setLocalTemplate((prev) => ({ ...prev, [field]: value }));
  };

  const updatePost = (id: string, field: keyof GTR30PostItem, value: string | number) => {
    setLocalPosts((prev) =>
      prev.map((post) => {
        if (post.id !== id) return post;
        const updated = { ...post, [field]: value };
        if (field === 'sanctioned' || field === 'filled') {
          const sanc = Number(field === 'sanctioned' ? value : post.sanctioned) || 0;
          const fill = Number(field === 'filled' ? value : post.filled) || 0;
          updated.vacant = Math.max(0, sanc - fill);
          updated.total = sanc;
        }
        return updated;
      })
    );
  };

  const addPost = () => {
    setLocalPosts((prev) => [
      ...prev,
      { ...EMPTY_POST, id: crypto.randomUUID(), srNo: String(prev.length + 1) },
    ]);
  };

  const removePost = (id: string) => {
    setLocalPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateDaRate = (id: string, field: keyof GTR30DARateEntry, value: string | number) => {
    setLocalDaRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: field === 'rate' ? Number(value) || 0 : String(value) } : r))
    );
  };

  const addDaRate = () => {
    const nextDate = new Date().toISOString().slice(0, 10);
    setLocalDaRates((prev) => [
      ...prev,
      { id: crypto.randomUUID(), effectiveFrom: nextDate, rate: DEFAULT_DA_PERCENT, description: '', resolutionNo: '' },
    ]);
  };

  const removeDaRate = (id: string) => {
    setLocalDaRates((prev) => {
      if (prev.length <= 1) {
        toast({ title: 'Cannot Remove', description: 'At least one DA rate must remain.', variant: 'destructive' });
        return prev;
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const sortedDaRatesPreview = useMemo(
    () => [...localDaRates].sort((a, b) => (a.effectiveFrom || '').localeCompare(b.effectiveFrom || '') || a.id.localeCompare(b.id)),
    [localDaRates]
  );

  const handleSave = async () => {
    if (hasErrors) {
      const firstTab = TABS.find((t) => tabIssues[t.id]);
      if (firstTab) setActiveTab(firstTab.id);
      toast({
        variant: 'destructive',
        title: 'Fix validation issues',
        description:
          'Required or malformed fields are highlighted — review and correct before saving.',
      });
      return;
    }
    try {
      const normalizedDaRates = normalizeDARates(localDaRates);
      const saved = await saveMutation.mutateAsync({
        settings: localSettings,
        employeeTemplate: localTemplate,
        defaultPosts: localPosts,
        daRates: normalizedDaRates,
      });
      setLocalSettings({ ...saved.settings });
      setLocalTemplate({ ...saved.employeeTemplate });
      setLocalPosts(saved.defaultPosts.map((p) => ({ ...p })));
      setLocalDaRates((saved.daRates ?? []).map((r) => ({ ...r })));
      toast({
        title: 'Settings Saved',
        description: 'GTR-30 reusable defaults updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not persist settings. Please try again.',
      });
    }
  };

  const handleReset = async () => {
    setConfirmResetOpen(false);
    const reset = await resetMutation.mutateAsync();
    setLocalSettings({ ...reset.settings });
    setLocalTemplate({ ...reset.employeeTemplate });
    setLocalPosts(reset.defaultPosts.map((p) => ({ ...p })));
    setLocalDaRates((reset.daRates ?? []).map((r) => ({ ...r })));
    toast({ title: 'Settings Reset', description: 'Built-in defaults restored.' });
  };

  const cadreOptions = useMemo(() => {
    const current = toGujaratiCadre(localTemplate.cadreClass ?? '');
    return CADRE_CLASS_OPTIONS.includes(current)
      ? CADRE_CLASS_OPTIONS
      : [...CADRE_CLASS_OPTIONS, current];
  }, [localTemplate.cadreClass]);

  const gisOptions = useMemo(() => {
    const current = localTemplate.insuranceGroup ?? '';
    return GIS_GROUP_OPTIONS.includes(current)
      ? GIS_GROUP_OPTIONS
      : [...GIS_GROUP_OPTIONS, current].filter(Boolean);
  }, [localTemplate.insuranceGroup]);

  const completeness = useMemo(() => {
    let total = 6;
    let filled = 0;
    if (localSettings.officeName.trim()) filled++;
    if (localSettings.officeFullName.trim()) filled++;
    if (localSettings.treasuryName.trim()) filled++;
    if (localSettings.drawingOfficerName.trim()) filled++;
    if (localDaRates.length > 0) filled++;
    if (localPosts.length > 0) filled++;
    const percent = Math.round((filled / total) * 100);
    return { filled, total, percent };
  }, [localSettings, localDaRates, localPosts]);

  return (
    <div className="space-y-5">
      {/* Setup Completeness Progress Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Setup Completeness ({completeness.filled}/{completeness.total} configured)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completeness.percent === 100
                ? 'All mandatory bill defaults and payroll settings are fully configured.'
                : 'Configure remaining office and treasury parameters for seamless bill generation.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-48">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {completeness.percent}%
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const hasIssue = tabIssues[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={active}
                role="tab"
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {hasIssue && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-amber-300' : 'bg-amber-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Office & Treasury */}
      {activeTab === 'office' && (
        <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <SectionHeader
            icon={Building2}
            title="Office & Treasury Defaults"
            subtitle="Printed on the GTR-30 bill header"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SettingsField label="Office Name (Short)" required error={errors.officeName}>
              <Input
                value={localSettings.officeName}
                onChange={(e) => handleSettingChange('officeName', e.target.value)}
                className={inputClass(Boolean(errors.officeName))}
              />
            </SettingsField>
            <SettingsField
              label="Office Full Name"
              required
              error={errors.officeFullName}
              className="sm:col-span-2"
            >
              <Input
                value={localSettings.officeFullName}
                onChange={(e) => handleSettingChange('officeFullName', e.target.value)}
                className={inputClass(Boolean(errors.officeFullName))}
              />
            </SettingsField>
            <SettingsField label="Branch Name (Gujarati)">
              <Input
                value={localSettings.branchName}
                onChange={(e) => handleSettingChange('branchName', e.target.value)}
                className={`font-serif ${inputClass()}`}
              />
            </SettingsField>
            <SettingsField label="Treasury Name" required error={errors.treasuryName}>
              <Input
                value={localSettings.treasuryName}
                onChange={(e) => handleSettingChange('treasuryName', e.target.value)}
                className={inputClass(Boolean(errors.treasuryName))}
              />
            </SettingsField>
            <SettingsField label="Station">
              <Input
                value={localSettings.station}
                onChange={(e) => handleSettingChange('station', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField
              label="District Code"
              error={errors.district}
              hint="Numeric code of the district"
            >
              <Input
                value={localSettings.district}
                onChange={(e) => handleSettingChange('district', e.target.value)}
                className={inputClass(Boolean(errors.district))}
              />
            </SettingsField>
            <SettingsField label="Office Phone">
              <Input
                value={localSettings.phoneNo}
                onChange={(e) => handleSettingChange('phoneNo', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Cardex No.">
              <Input
                value={localSettings.cardexNo}
                onChange={(e) => handleSettingChange('cardexNo', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="DDO Code" hint="Drawing & Disbursing Officer code">
              <Input
                value={localSettings.ddoCode}
                onChange={(e) => handleSettingChange('ddoCode', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
          </div>
        </Card>
      )}

      {/* Drawing Officer & Messenger */}
      {activeTab === 'drawing' && (
        <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <SectionHeader
            icon={UserCog}
            title="Drawing Officer & Messenger Defaults"
            subtitle="Signature block of the bill"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SettingsField
              label="Drawing Officer Name"
              required
              error={errors.drawingOfficerName}
            >
              <Input
                value={localSettings.drawingOfficerName}
                onChange={(e) => handleSettingChange('drawingOfficerName', e.target.value)}
                className={inputClass(Boolean(errors.drawingOfficerName))}
              />
            </SettingsField>
            <SettingsField label="Drawing Officer Name (Gujarati)">
              <Input
                value={localSettings.drawingOfficerNameGujarati}
                onChange={(e) => handleSettingChange('drawingOfficerNameGujarati', e.target.value)}
                className={`font-serif ${inputClass()}`}
              />
            </SettingsField>
            <SettingsField label="Designation">
              <Input
                value={localSettings.drawingOfficerDesignation}
                onChange={(e) => handleSettingChange('drawingOfficerDesignation', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Designation (Gujarati)">
              <Input
                value={localSettings.drawingOfficerDesignationGujarati}
                onChange={(e) =>
                  handleSettingChange('drawingOfficerDesignationGujarati', e.target.value)
                }
                className={`font-serif ${inputClass()}`}
              />
            </SettingsField>
            <SettingsField label="Office">
              <Input
                value={localSettings.drawingOfficerOffice}
                onChange={(e) => handleSettingChange('drawingOfficerOffice', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Office (Gujarati)">
              <Input
                value={localSettings.drawingOfficerOfficeGujarati}
                onChange={(e) => handleSettingChange('drawingOfficerOfficeGujarati', e.target.value)}
                className={`font-serif ${inputClass()}`}
              />
            </SettingsField>
            <SettingsField label="Drawing Officer Code" hint="4-digit DO code">
              <Input
                value={localSettings.drawingOfficer}
                onChange={(e) => handleSettingChange('drawingOfficer', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Messenger Name">
              <Input
                value={localSettings.messengerName}
                onChange={(e) => handleSettingChange('messengerName', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Messenger Designation">
              <Input
                value={localSettings.messengerDesignation}
                onChange={(e) => handleSettingChange('messengerDesignation', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
          </div>
        </Card>
      )}

      {/* Budget Classification */}
      {activeTab === 'budget' && (
        <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <SectionHeader
            icon={TreePine}
            title="Budget Classification Defaults"
            subtitle="Head of account block of the bill"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SettingsField label="Class of Expenditure" hint="e.g. Charged / Voted">
              <Input
                value={localSettings.classOfExpenditure}
                onChange={(e) => handleSettingChange('classOfExpenditure', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Fund" hint="e.g. Consolidated Fund">
              <Input
                value={localSettings.fund}
                onChange={(e) => handleSettingChange('fund', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Demand No.">
              <Input
                value={localSettings.demandNo}
                onChange={(e) => handleSettingChange('demandNo', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Type of Budget" hint="e.g. Annual / Supplementary">
              <Input
                value={localSettings.typeOfBudget}
                onChange={(e) => handleSettingChange('typeOfBudget', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Scheme No.">
              <Input
                value={localSettings.schemeNo}
                onChange={(e) => handleSettingChange('schemeNo', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Budget Year">
              <Input
                value={localSettings.budgetYear}
                onChange={(e) => handleSettingChange('budgetYear', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField
              label="Head Chargeable (13 Digits)"
              required
              error={errors.headChargeable}
              hint="e.g. 2401-01-101-01-00 — digits must total 13"
              className="sm:col-span-2"
            >
              <Input
                value={localSettings.headChargeable}
                onChange={(e) => handleSettingChange('headChargeable', e.target.value)}
                className={`font-mono ${inputClass(Boolean(errors.headChargeable))}`}
              />
            </SettingsField>
            <SettingsField label="Sector">
              <Input
                value={localSettings.sector}
                onChange={(e) => handleSettingChange('sector', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Major Head">
              <Input
                value={localSettings.majorHead}
                onChange={(e) => handleSettingChange('majorHead', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Minor Head">
              <Input
                value={localSettings.minorHead}
                onChange={(e) => handleSettingChange('minorHead', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Sub Head" className="sm:col-span-3">
              <Input
                value={localSettings.subHead}
                onChange={(e) => handleSettingChange('subHead', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
          </div>
        </Card>
      )}

      {/* Employee Template */}
      {activeTab === 'template' && (
        <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <SectionHeader
            icon={UserRound}
            title="Default Employee Template"
            subtitle="Prefills new employee registration"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SettingsField label="Designation">
              <Input
                value={localTemplate.designation}
                onChange={(e) => handleTemplateChange('designation', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Designation (Gujarati)">
              <Input
                value={localTemplate.designationGujarati}
                onChange={(e) => handleTemplateChange('designationGujarati', e.target.value)}
                className={`font-serif ${inputClass()}`}
              />
            </SettingsField>
            <SettingsField label="Cadre Class" hint="વર્ગ ૧–૪">
              <select
                value={toGujaratiCadre(localTemplate.cadreClass ?? '')}
                onChange={(e) => handleTemplateChange('cadreClass', e.target.value)}
                className={`font-serif ${selectClass()}`}
              >
                {cadreOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </SettingsField>
            <SettingsField label="Pay Scale">
              <Input
                value={localTemplate.payScale}
                onChange={(e) => handleTemplateChange('payScale', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Grade Pay">
              <Input
                value={localTemplate.gradePay}
                onChange={(e) => handleTemplateChange('gradePay', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Pay Level / Cell">
              <Input
                value={localTemplate.payLevelCell}
                onChange={(e) => handleTemplateChange('payLevelCell', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="PPA No.">
              <Input
                value={localTemplate.ppaNo}
                onChange={(e) => handleTemplateChange('ppaNo', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="GIS Group" hint="ક / ખ / ગ / ઘ">
              <select
                value={localTemplate.insuranceGroup}
                onChange={(e) => handleTemplateChange('insuranceGroup', e.target.value)}
                className={`font-serif ${selectClass()}`}
              >
                {gisOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </SettingsField>
            <SettingsField label="Default Quarter Address" className="sm:col-span-2 lg:col-span-3">
              <Input
                value={localTemplate.quarterAddress}
                onChange={(e) => handleTemplateChange('quarterAddress', e.target.value)}
                className={inputClass()}
              />
            </SettingsField>
            <SettingsField label="Insurance Type">
              <select
                value={localTemplate.insuranceType}
                onChange={(e) =>
                  handleTemplateChange(
                    'insuranceType',
                    e.target.value as 'savings_and_insurance' | 'insurance_only'
                  )
                }
                className={selectClass()}
              >
                <option value="savings_and_insurance">Savings + Insurance</option>
                <option value="insurance_only">Insurance Only</option>
              </select>
            </SettingsField>
          </div>
        </Card>
      )}

      {/* Establishment Posts */}
      {activeTab === 'posts' && (
        <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <SectionHeader
              icon={FileText}
              title="Default Establishment Posts"
              subtitle="Sanctioned strength shown on the bill"
            />
            <Button size="sm" variant="outline" onClick={addPost}>
              <Plus className="h-4 w-4 mr-1" /> Add Post
            </Button>
          </div>

          <div className="space-y-3">
            {localPosts.map((post) => {
              const postCadreOptions = CADRE_CLASS_OPTIONS.includes(
                toGujaratiCadre(post.cadreClass ?? '')
              )
                ? CADRE_CLASS_OPTIONS
                : [...CADRE_CLASS_OPTIONS, toGujaratiCadre(post.cadreClass ?? '')];
              return (
                <div
                  key={post.id}
                  className="grid gap-2 sm:grid-cols-7 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div>
                    <Label className="text-xs">Sr.</Label>
                    <Input
                      value={post.srNo}
                      onChange={(e) => updatePost(post.id, 'srNo', e.target.value)}
                      className={`font-serif ${inputClass()}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Designation</Label>
                    <Input
                      value={post.designation}
                      onChange={(e) => updatePost(post.id, 'designation', e.target.value)}
                      className={`font-serif ${inputClass()}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Class</Label>
                    <select
                      value={toGujaratiCadre(post.cadreClass ?? '')}
                      onChange={(e) => updatePost(post.id, 'cadreClass', e.target.value)}
                      className={`font-serif ${selectClass()}`}
                    >
                      {postCadreOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Sanctioned</Label>
                    <Input
                      type="number"
                      value={post.sanctioned}
                      onChange={(e) =>
                        updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)
                      }
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Filled</Label>
                    <Input
                      type="number"
                      value={post.filled}
                      onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                      className={inputClass()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Vacant</Label>
                      <Input
                        value={post.vacant}
                        disabled
                        className="h-9 mt-1 text-sm bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    {localPosts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 mt-5 hover:bg-red-50 dark:hover:bg-red-900/30"
                        onClick={() => removePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* DA Rates with Effective From */}
      {activeTab === 'daRates' && (
        <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <SectionHeader
              icon={Percent}
              title="Dearness Allowance (DA) Rate History"
              subtitle="Effective-from date determines which % applies for a bill month. Example: 53% from 04-12-2024, 55% from 01-07-2025."
            />
            <Button size="sm" variant="outline" onClick={addDaRate}>
              <Plus className="h-4 w-4 mr-1" /> Add DA Rate
            </Button>
          </div>

          {daErrors.daRates && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5" /> {daErrors.daRates}
            </p>
          )}

          <div className="space-y-3">
            {sortedDaRatesPreview.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No DA rates configured.</p>
            ) : (
              sortedDaRatesPreview.map((rate) => {
                const idx = localDaRates.findIndex((r) => r.id === rate.id);
                const actual = localDaRates[idx];
                // Use actual index for error keys (errors are based on localDaRates order, but sorted order may differ)
                // For simplicity, validate via sorted position
                const dateError = daErrors[`da_${idx}_date`];
                const rateError = daErrors[`da_${idx}_rate`];
                return (
                  <div
                    key={rate.id}
                    className="grid gap-3 sm:grid-cols-12 items-end bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-semibold">Effective From</Label>
                      <Input
                        type="text"
                        placeholder="YYYY-MM-DD or DD-MM-YYYY (01-07-2026)"
                        value={actual.effectiveFrom}
                        onChange={(e) => updateDaRate(actual.id, 'effectiveFrom', e.target.value)}
                        onBlur={(e) => {
                          const iso = parseFlexibleDateToISO(e.target.value.trim());
                          if (iso && iso !== e.target.value.trim()) {
                            updateDaRate(actual.id, 'effectiveFrom', iso);
                          }
                        }}
                        className={`h-9 mt-1 text-sm font-mono ${dateError ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-slate-900`}
                      />
                      {dateError && <p className="text-[11px] text-red-500 mt-1">{dateError}</p>}
                      {!dateError && actual.effectiveFrom && parseFlexibleDateToISO(actual.effectiveFrom.trim()) && (
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          → {parseFlexibleDateToISO(actual.effectiveFrom.trim())}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-semibold">DA Rate %</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={actual.rate}
                          onChange={(e) => updateDaRate(actual.id, 'rate', e.target.value)}
                          className={`h-9 text-sm pr-7 ${rateError ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-slate-900 font-mono font-bold`}
                        />
                        <Percent className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      {rateError && <p className="text-[11px] text-red-500 mt-1">{rateError}</p>}
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-semibold">Resolution / GR No.</Label>
                      <Input
                        value={actual.resolutionNo ?? ''}
                        onChange={(e) => updateDaRate(actual.id, 'resolutionNo', e.target.value)}
                        placeholder="e.g. વલભ-૧૦૨૦૧૬-જીઓઆઈ-૭-ચ"
                        className="h-9 mt-1 text-sm font-serif bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-semibold">Description</Label>
                      <Input
                        value={actual.description ?? ''}
                        onChange={(e) => updateDaRate(actual.id, 'description', e.target.value)}
                        placeholder="e.g. 7th Pay 53% DA"
                        className="h-9 mt-1 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        onClick={() => removeDaRate(actual.id)}
                        title="Remove DA rate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex gap-2">
            <History className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-bold">How it works:</p>
              <p className="mt-1">
                For a Pay Bill of <span className="font-mono font-bold">August-2026</span>, the system picks the latest DA rate whose{' '}
                <span className="font-bold">Effective From ≤ 2026-08-01</span>. If you add 55% from 2025-07-01 and 53% from 2024-12-04,
                July 2025 and later bills will use 55% automatically, while earlier bills keep 53%.
              </p>
              <p className="mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Sorted ascending; duplicate dates are merged (last wins).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Resolutions & Bill Codes */}
      {activeTab === 'resolutions' && (
        <div className="space-y-5">
          <Card className="border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 bg-white dark:bg-slate-900">
            <SectionHeader
              icon={ScrollText}
              title="Government Resolution Texts"
              subtitle="GR references quoted on the bill"
            />
            <div className="space-y-3">
              <SettingsField label="Scheme Permanent Sanction Resolution">
                <Input
                  value={localSettings.schemeResolutionText}
                  onChange={(e) => handleSettingChange('schemeResolutionText', e.target.value)}
                  className={`font-serif ${inputClass()}`}
                />
              </SettingsField>
              <SettingsField label="DA Resolution Text">
                <Input
                  value={localSettings.daResolutionText}
                  onChange={(e) => handleSettingChange('daResolutionText', e.target.value)}
                  className={`font-serif ${inputClass()}`}
                />
              </SettingsField>
            </div>
          </Card>
          <GTR30BillCodeMappingView />
        </div>
      )}

      {/* Footer actions */}
      <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-semibold">
              <CircleDashed className="h-3.5 w-3.5" /> Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> All changes saved
            </span>
          )}
          {hasErrors && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 font-semibold">
              <AlertCircle className="h-3.5 w-3.5" /> {Object.keys(errors).length + Object.keys(daErrors).length}{' '}
              {Object.keys(errors).length + Object.keys(daErrors).length === 1 ? 'issue' : 'issues'} to fix
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmResetOpen(true)}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving…' : 'Save GTR-30 Settings'}
          </Button>
        </div>
      </div>

      {/* Reset confirmation */}
      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <RotateCcw className="h-5 w-5 text-amber-600" /> Reset GTR-30 defaults?
            </DialogTitle>
            <DialogDescription>
              This restores the built-in office, treasury, budget head, drawing officer, employee
              template, and establishment post defaults. Your currently saved settings will be
              overwritten.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? 'Resetting…' : 'Reset to Defaults'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
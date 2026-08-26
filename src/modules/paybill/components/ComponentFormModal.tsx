import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/components/Modal';
import { toast } from '@/shared/components/Toast';
import { componentMasterService } from '../services/componentMaster.service';
import type {
  PayrollComponent,
  PayrollComponentKind,
  PayrollComponentType,
} from '../types/componentMaster';
import { X, Plus } from 'lucide-react';

interface ComponentFormModalProps {
  open: boolean;
  onClose: () => void;
  component: PayrollComponent | null;
  /** Pre-fill values for a new component (e.g. an unknown component detected in a PDF). */
  preset?: { componentCode: string | null; componentName: string; type: PayrollComponentType } | null;
  onSaved: () => void;
}

interface FormState {
  componentCode: string;
  componentName: string;
  shortName: string;
  type: PayrollComponentType;
  kind: PayrollComponentKind;
  category: string;
  displayOrder: string;
  isMandatory: boolean;
  active: boolean;
  headerAliases: string[];
  codeAliases: string[];
  notes: string;
}

const fieldClass =
  'w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

function toFormState(
  component: PayrollComponent | null,
  preset?: ComponentFormModalProps['preset']
): FormState {
  if (!component) {
    return {
      componentCode: preset?.componentCode || '',
      componentName: preset?.componentName || '',
      shortName: '',
      type: preset?.type || 'EARNING',
      kind: 'COMPONENT',
      category: '',
      displayOrder: '100',
      isMandatory: false,
      active: true,
      headerAliases: [],
      codeAliases: [],
      notes: '',
    };
  }
  return {
    componentCode: component.componentCode || '',
    componentName: component.componentName,
    shortName: component.shortName || '',
    type: component.type,
    kind: component.kind,
    category: component.category || '',
    displayOrder: String(component.displayOrder),
    isMandatory: component.isMandatory,
    active: component.active,
    headerAliases: [...component.pdfHeaderAliases],
    codeAliases: [...component.pdfCodeAliases],
    notes: component.notes || '',
  };
}

function AliasChipInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim().replace(/,\s*$/, '');
    if (!trimmed) return;
    const next = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.includes(s));
    if (next.length > 0) onChange([...value, ...next]);
    setDraft('');
  };

  return (
    <div>
      <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={commit}
          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          aria-label={`Add ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((alias, i) => (
            <span
              key={`${alias}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900"
            >
              {alias}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="hover:text-rose-600 transition-colors"
                aria-label={`Remove ${alias}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComponentFormModal({
  open,
  onClose,
  component,
  preset,
  onSaved,
}: ComponentFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(component, preset));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setForm(toFormState(component, preset));
      setError(null);
    });
  }, [open, component, preset]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isEdit = Boolean(component);
  const duplicateCheck = useMemo(() => {
    if (isEdit) return null;
    const master = componentMasterService.getCachedComponents();
    const code = form.componentCode.trim();
    const name = form.componentName.trim();
    if (!name) return null;
    return master.find(
      (c) =>
        c.componentName.toLowerCase() === name.toLowerCase() &&
        (code === '' || c.componentCode === code || (c.componentCode || '') === '')
    );
  }, [form.componentCode, form.componentName, isEdit]);

  const handleSave = async () => {
    const name = form.componentName.trim();
    if (!name) {
      setError('Component name is required.');
      return;
    }
    if (duplicateCheck) {
      setError(
        `A component with the same name${form.componentCode ? ' and code' : ''} already exists: "${duplicateCheck.componentName}".`
      );
      return;
    }
    if (form.kind !== 'COMPONENT' && form.type === 'EARNING' && form.kind === 'NET_PAY') {
      setError('NET_PAY is only valid for deduction-side components.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const repo = componentMasterService.getRepository();
      const input = {
        componentCode: form.componentCode.trim() || null,
        componentName: name,
        shortName: form.shortName.trim() || null,
        type: form.type,
        kind: form.kind,
        category: form.category.trim() || null,
        displayOrder: parseInt(form.displayOrder, 10) || 0,
        active: form.active,
        pdfHeaderAliases: form.headerAliases,
        pdfCodeAliases: form.codeAliases,
        isMandatory: form.isMandatory,
        isTotalField: form.kind !== 'COMPONENT',
        notes: form.notes.trim() || null,
      };
      if (isEdit && component) {
        await repo.update(component.id, input);
      } else {
        await repo.create(input);
      }
      await componentMasterService.refresh();
      toast.success(isEdit ? 'Component updated.' : 'Component added to master.');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the component.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Component — ${component?.componentName}` : 'Add Payroll Component'}
      maxWidth="lg"
      footerActions={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: saving },
        { label: isEdit ? 'Save Changes' : 'Add Component', onClick: handleSave, disabled: saving },
      ]}
    >
      <div className="space-y-4">
        {error && (
          <div className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Component Name *
            </label>
            <input
              type="text"
              value={form.componentName}
              onChange={(e) => set('componentName', e.target.value)}
              placeholder="e.g. City Compensatory Allowance"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Short Name
            </label>
            <input
              type="text"
              value={form.shortName}
              onChange={(e) => set('shortName', e.target.value)}
              placeholder="e.g. CLA"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Component Code
            </label>
            <input
              type="text"
              value={form.componentCode}
              onChange={(e) => set('componentCode', e.target.value)}
              placeholder="e.g. 0111"
              className={fieldClass}
            />
            <p className="text-[0.65rem] text-slate-400 mt-1">
              IFMS / payroll code printed in the PDF header.
            </p>
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => set('displayOrder', e.target.value)}
              className={fieldClass}
            />
            <p className="text-[0.65rem] text-slate-400 mt-1">
              Lower numbers appear first in PDF column order.
            </p>
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value as PayrollComponentType)}
              className={fieldClass}
            >
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Kind
            </label>
            <select
              value={form.kind}
              onChange={(e) => set('kind', e.target.value as PayrollComponentKind)}
              className={fieldClass}
            >
              <option value="COMPONENT">Component (column)</option>
              <option value="TOTAL">Total</option>
              <option value="NET_PAY">Net Pay</option>
            </select>
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Category
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. Allowance, Tax, Fund"
              className={fieldClass}
            />
          </div>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isMandatory}
                onChange={(e) => set('isMandatory', e.target.checked)}
                className="accent-blue-600"
              />
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="accent-blue-600"
              />
              Active
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AliasChipInput
            label="PDF Header Aliases"
            placeholder="e.g. CLA, City Comp Allow"
            value={form.headerAliases}
            onChange={(v) => set('headerAliases', v)}
          />
          <AliasChipInput
            label="PDF Code Aliases"
            placeholder="e.g. 0111, 0112"
            value={form.codeAliases}
            onChange={(v) => set('codeAliases', v)}
          />
        </div>

        <div>
          <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder="Optional notes about this component"
            className={`${fieldClass} resize-y`}
          />
        </div>
      </div>
    </Modal>
  );
}
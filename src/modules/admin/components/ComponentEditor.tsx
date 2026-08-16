import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Save } from 'lucide-react';
import { AdminModal } from '@/shared/components/AdminModal';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { useAdminComponentSave } from '../hooks/useAdminComponents';
import type { AdminComponent } from '../types/components';

interface ComponentEditorProps {
  open: boolean;
  onClose: () => void;
  component: AdminComponent | null;
  onSaved: () => void;
}

const editorSchema = z.object({
  componentName: z.string().trim().min(1, 'Component name is required'),
  componentCode: z.string().trim(),
  shortName: z.string().trim(),
  type: z.enum(['EARNING', 'DEDUCTION']),
  kind: z.enum(['COMPONENT', 'TOTAL', 'NET_PAY']),
  category: z.string().trim(),
  displayOrder: z.coerce.number().int().min(0),
  isMandatory: z.boolean(),
  active: z.boolean(),
  notes: z.string().trim(),
});

type EditorValues = z.infer<typeof editorSchema>;

const fieldClass =
  'w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';

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
          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
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

function toDefaults(component: AdminComponent | null): EditorValues {
  if (!component) {
    return {
      componentName: '',
      componentCode: '',
      shortName: '',
      type: 'EARNING',
      kind: 'COMPONENT',
      category: '',
      displayOrder: 100,
      isMandatory: false,
      active: true,
      notes: '',
    };
  }
  return {
    componentName: component.component_name,
    componentCode: component.component_code || '',
    shortName: component.short_name || '',
    type: component.type,
    kind: component.kind,
    category: component.category || '',
    displayOrder: component.display_order,
    isMandatory: component.is_mandatory,
    active: component.active,
    notes: component.notes || '',
  };
}

function toAliases(component: AdminComponent | null): { header: string[]; code: string[] } {
  if (!component) return { header: [], code: [] };
  return {
    header: component.aliases.filter((a) => a.alias_type === 'HEADER').map((a) => a.alias_text),
    code: component.aliases.filter((a) => a.alias_type === 'CODE').map((a) => a.alias_text),
  };
}

export function ComponentEditor({ open, onClose, component, onSaved }: ComponentEditorProps) {
  const saveMutation = useAdminComponentSave();
  const isEdit = Boolean(component);

  const [headerAliases, setHeaderAliases] = useState<string[]>(() => toAliases(component).header);
  const [codeAliases, setCodeAliases] = useState<string[]>(() => toAliases(component).code);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: toDefaults(component),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await saveMutation.saveComponentAsync({
        id: component?.id ?? null,
        component_code: values.componentCode || null,
        component_name: values.componentName,
        short_name: values.shortName || null,
        type: values.type,
        kind: values.kind,
        category: values.category || null,
        sub_category: null,
        active: values.active,
        display_order: values.displayOrder,
        is_mandatory: values.isMandatory,
        is_total_field: values.kind !== 'COMPONENT',
        is_system_generated: component?.is_system_generated ?? false,
        validation_rule: component?.validation_rule ?? null,
        notes: values.notes || null,
        aliases: [
          ...headerAliases.map((a) => ({ alias_text: a, alias_type: 'HEADER' as const })),
          ...codeAliases.map((a) => ({ alias_text: a, alias_type: 'CODE' as const })),
        ],
      });
      onSaved();
      onClose();
    } catch {
      // error surfaced via saveMutation.error
    }
  });

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Component — ${component?.component_name ?? ''}` : 'Add Payroll Component'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {saveMutation.error && (
          <ErrorBanner error={saveMutation.error} className="animate-fade-in" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Component Name *
            </label>
            <input
              type="text"
              placeholder="e.g. City Compensatory Allowance"
              className={fieldClass}
              {...register('componentName')}
            />
            {errors.componentName && (
              <p className="text-[0.68rem] text-rose-600 mt-1">{errors.componentName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Short Name
            </label>
            <input type="text" placeholder="e.g. CLA" className={fieldClass} {...register('shortName')} />
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Component Code
            </label>
            <input type="text" placeholder="e.g. 0111" className={fieldClass} {...register('componentCode')} />
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
              min={0}
              className={fieldClass}
              {...register('displayOrder')}
            />
            <p className="text-[0.65rem] text-slate-400 mt-1">
              Lower numbers appear first in PDF column order.
            </p>
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Type
            </label>
            <select className={fieldClass} {...register('type')}>
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </div>
          <div>
            <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Kind
            </label>
            <select className={fieldClass} {...register('kind')}>
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
              placeholder="e.g. Allowance, Tax, Fund"
              className={fieldClass}
              {...register('category')}
            />
          </div>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" className="accent-indigo-600" {...register('isMandatory')} />
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" className="accent-indigo-600" {...register('active')} />
              Active
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AliasChipInput
            label="PDF Header Aliases"
            placeholder="e.g. CLA, City Comp Allow"
            value={headerAliases}
            onChange={setHeaderAliases}
          />
          <AliasChipInput
            label="PDF Code Aliases"
            placeholder="e.g. 0111, 0112"
            value={codeAliases}
            onChange={setCodeAliases}
          />
        </div>

        <div>
          <label className="block text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            placeholder="Optional notes about this component"
            className={`${fieldClass} resize-y`}
            {...register('notes')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saveMutation.isSaving} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saveMutation.isSaving} className="btn btn-primary">
            {saveMutation.isSaving ? (
              <span className="inline-flex items-center gap-1">
                <span className="animate-spin rounded-full border-2 border-white/30 border-t-white h-4 w-4"></span>
                Saving...
              </span>
            ) : (
              <>
                <Save size={14} /> {isEdit ? 'Save Changes' : 'Add Component'}
              </>
            )}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

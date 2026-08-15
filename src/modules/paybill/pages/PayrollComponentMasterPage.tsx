import { useCallback, useEffect, useState } from 'react';
import { componentMasterService } from '../services/componentMaster.service';
import type { PayrollComponent, PayrollComponentType } from '../types/componentMaster';
import { PbPanel, PbButton, PbChip, type PbChipTone } from '../components/ui';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { toast } from '@/shared/components/Toast';
import { ComponentFormModal } from '../components/ComponentFormModal';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Power,
  Layers,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';

interface Filters {
  search: string;
  type: PayrollComponentType | 'ALL';
  category: string;
  active: boolean | 'ALL';
}

const filterClass =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

const emptyFilters: Filters = { search: '', type: 'ALL', category: 'ALL', active: 'ALL' };

const TYPE_TONE: Record<PayrollComponentType, PbChipTone> = {
  EARNING: 'blue',
  DEDUCTION: 'amber',
};

export function PayrollComponentMasterPage() {
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [isLoading, setIsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollComponent | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, cats] = await Promise.all([
        componentMasterService.listComponents(filters),
        componentMasterService.getCategories(),
      ]);
      setComponents(list);
      setCategories(cats);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load components.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [list, cats] = await Promise.all([
          componentMasterService.listComponents(filters),
          componentMasterService.getCategories(),
        ]);
        if (!cancelled) {
          setComponents(list);
          setCategories(cats);
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load components.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const handleEdit = (component: PayrollComponent) => {
    setEditing(component);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleToggleActive = async (component: PayrollComponent) => {
    try {
      await componentMasterService.getRepository().setActive(component.id, !component.active);
      await componentMasterService.refresh();
      toast.success(
        component.active ? `"${component.componentName}" deactivated.` : `"${component.componentName}" activated.`
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not toggle component status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const result = await componentMasterService.getRepository().remove(deleteTarget.id);
      await componentMasterService.refresh();
      if (result.deleted) {
        toast.success(`"${deleteTarget.componentName}" deleted.`);
      } else {
        toast.warning(result.reason || 'Component could not be deleted.');
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete component.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeedBusy(true);
    try {
      await componentMasterService.seedDefaults();
      toast.success('Default government payroll components loaded successfully.');
      setSeedConfirmOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not seed default components.');
    } finally {
      setSeedBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-800 rounded-2xl px-6 py-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Layers size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold font-heading tracking-tight truncate">
              Payroll Component Master
            </h1>
            <p className="text-xs text-indigo-100 truncate">
              Every earning / deduction column the PDF importer recognizes. The parser matches
              detected table headers against this list — add new components here without code changes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PbButton
            variant="secondary"
            icon={RotateCcw}
            onClick={() => setSeedConfirmOpen(true)}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Restore Defaults
          </PbButton>
          <PbButton variant="primary" icon={Plus} onClick={handleAdd} className="bg-white/15 border border-white/25 hover:bg-white/25">
            Add Component
          </PbButton>
        </div>
      </div>

      <PbPanel
        icon={FileSpreadsheet}
        title={`Components (${components.length})`}
        subtitle="Configure PDF header aliases, codes and column order"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setIsLoading(true);
                  setFilters((f) => ({ ...f, search: e.target.value }));
                }}
                placeholder="Search name / code / alias"
                className={`${filterClass} pl-8 w-52`}
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => {
                setIsLoading(true);
                setFilters((f) => ({ ...f, type: e.target.value as Filters['type'] }));
              }}
              className={filterClass}
            >
              <option value="ALL">All Types</option>
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => {
                setIsLoading(true);
                setFilters((f) => ({ ...f, category: e.target.value }));
              }}
              className={filterClass}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={String(filters.active)}
              onChange={(e) => {
                setIsLoading(true);
                const v = e.target.value;
                setFilters((f) => ({
                  ...f,
                  active: v === 'ALL' ? 'ALL' : v === 'true',
                }));
              }}
              className={filterClass}
            >
              <option value="ALL">Active + Inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        }
      >
        {isLoading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : components.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No components found"
            hint="Load standard government payroll components (Basic, DA, HRA, CLA, Medical, Transport, etc.) or add custom components."
            action={
              <div className="flex items-center gap-2">
                <PbButton variant="primary" icon={RotateCcw} onClick={() => setSeedConfirmOpen(true)}>
                  Load Default Components
                </PbButton>
                <PbButton variant="secondary" icon={Plus} onClick={handleAdd}>
                  Add Component
                </PbButton>
              </div>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-4 -my-4">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-left text-[0.65rem] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 font-bold">Code</th>
                  <th className="px-4 py-2.5 font-bold">Name</th>
                  <th className="px-4 py-2.5 font-bold">Type</th>
                  <th className="px-4 py-2.5 font-bold">Category</th>
                  <th className="px-4 py-2.5 font-bold text-right">Order</th>
                  <th className="px-4 py-2.5 font-bold">Aliases</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {components.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {c.componentCode || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {c.componentName}
                      </div>
                      {c.shortName && (
                        <div className="text-[0.68rem] text-slate-400">{c.shortName}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <PbChip tone={TYPE_TONE[c.type]}>{c.type}</PbChip>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {c.category || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                      {c.displayOrder}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {[...c.pdfHeaderAliases, ...c.pdfCodeAliases].slice(0, 4).map((a, i) => (
                          <span
                            key={`${a}-${i}`}
                            className="px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {a}
                          </span>
                        ))}
                        {c.pdfHeaderAliases.length + c.pdfCodeAliases.length > 4 && (
                          <span className="text-[0.65rem] text-slate-400">
                            +{c.pdfHeaderAliases.length + c.pdfCodeAliases.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <PbChip tone={c.active ? 'emerald' : 'rose'}>
                        {c.active ? 'Active' : 'Inactive'}
                      </PbChip>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <PbButton
                          variant="ghost"
                          size="xs"
                          icon={Pencil}
                          title="Edit"
                          onClick={() => handleEdit(c)}
                        >
                          Edit
                        </PbButton>
                        <PbButton
                          variant="ghost"
                          size="xs"
                          icon={Power}
                          title={c.active ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(c)}
                        >
                          {c.active ? 'Off' : 'On'}
                        </PbButton>
                        <PbButton
                          variant="ghost"
                          size="xs"
                          icon={Trash2}
                          className="hover:text-rose-600"
                          title="Delete"
                          onClick={() => setDeleteTarget(c)}
                        >
                          Delete
                        </PbButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PbPanel>

      <ComponentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        component={editing}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Component?"
        danger
        icon={Trash2}
        confirmLabel="Delete"
        busy={deleteBusy}
        message={
          deleteTarget
            ? `Delete "${deleteTarget.componentName}" from the component master? Components referenced by historical pay bills cannot be hard-deleted and must be deactivated instead.`
            : undefined
        }
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={seedConfirmOpen}
        title="Restore Default Components?"
        icon={RotateCcw}
        confirmLabel="Restore Defaults"
        busy={seedBusy}
        message="This will populate all standard Gujarat Government payroll components (Basic Pay, DA, HRA, CLA, Medical, Transport, Special Pay, Washing, Income Tax, PT, GPF, NPS, GIS, Net Pay) with standard budget codes and aliases. Existing custom components will be preserved."
        onConfirm={() => void handleSeedDefaults()}
        onCancel={() => setSeedConfirmOpen(false)}
      />
    </div>
  );
}
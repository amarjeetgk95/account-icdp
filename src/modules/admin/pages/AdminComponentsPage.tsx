import { useMemo, useState } from 'react';
import { Layers, Plus, Pencil, Power, Trash2, Search } from 'lucide-react';
import { useAdminComponents, useAdminComponentSetActive, useAdminComponentDelete } from '../hooks/useAdminComponents';
import { ComponentEditor } from '../components/ComponentEditor';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { getSectionIcon } from '@/shared/icons';
import type { AdminComponent } from '../types/components';
import type { PayrollComponentType } from '@/modules/paybill/types/componentMaster';

interface Filters {
  search: string;
  type: PayrollComponentType | 'ALL';
  active: boolean | 'ALL';
}

const filterClass =
  'px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const TYPE_TONE: Record<PayrollComponentType, string> = {
  EARNING: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-800/50',
  DEDUCTION: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-800/50',
};

export function AdminComponentsPage() {
  const { toast } = useToast();
  const { data: components, isLoading, isError, error, refetch } = useAdminComponents();
  const setActive = useAdminComponentSetActive();
  const removeComponent = useAdminComponentDelete();

  const [filters, setFilters] = useState<Filters>({ search: '', type: 'ALL', active: 'ALL' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminComponent | null>(null);

  const list = useMemo(() => {
    let rows = components ?? [];
    if (filters.type !== 'ALL') rows = rows.filter((c) => c.type === filters.type);
    if (filters.active !== 'ALL') rows = rows.filter((c) => c.active === filters.active);
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          (c.component_code || '').toLowerCase().includes(q) ||
          c.component_name.toLowerCase().includes(q) ||
          (c.short_name || '').toLowerCase().includes(q) ||
          c.aliases.some((a) => a.alias_text.toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) => a.display_order - b.display_order);
  }, [components, filters]);

  const categories = useMemo(
    () => Array.from(new Set((components ?? []).map((c) => c.category).filter(Boolean) as string[])).sort(),
    [components]
  );

  const handleAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleEdit = (component: AdminComponent) => {
    setEditing(component);
    setEditorOpen(true);
  };

  const handleToggleActive = async (component: AdminComponent) => {
    try {
      await setActive.setActiveAsync({ componentId: component.id, active: !component.active });
      toast({
        title: component.active ? 'Component deactivated' : 'Component activated',
        description: `"${component.component_name}" is now ${component.active ? 'inactive' : 'active'}.`,
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not toggle component status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await removeComponent.deleteComponentAsync(deleteTarget.id);
      if (result.deleted) {
        toast({ title: 'Component deleted', description: `"${deleteTarget.component_name}" was removed.` });
      } else {
        toast({
          title: 'Cannot delete',
          description: result.reason ?? 'Component could not be deleted',
          variant: 'destructive',
        });
      }
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Could not delete component',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout
      title="Component Master"
      icon={getSectionIcon('layers')}
      actions={[
        { label: 'Add Component', icon: Plus, onClick: handleAdd, variant: 'primary' },
      ]}
    >
      <div className="space-y-4">
        {isError && <ErrorBanner title="Failed to load components:" error={error} className="animate-fade-in" />}

        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search name / code / alias"
              className={`${filterClass} pl-8 w-48`}
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as Filters['type'] }))}
            className={filterClass}
          >
            <option value="ALL">All Types</option>
            <option value="EARNING">Earning</option>
            <option value="DEDUCTION">Deduction</option>
          </select>
          <select
            value={filters.active === 'ALL' ? 'ALL' : String(filters.active)}
            onChange={(e) => {
              const v = e.target.value;
              setFilters((f) => ({ ...f, active: v === 'ALL' ? 'ALL' : v === 'true' }));
            }}
            className={filterClass}
          >
            <option value="ALL">Active + Inactive</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            Components: <strong className="tabular-nums font-bold">{list.length}</strong>
          </span>
          {categories.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              Categories: <strong className="tabular-nums font-bold">{categories.length}</strong>
            </span>
          )}
        </div>

        <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
          <div className="card-body p-0">
            {isLoading ? (
              <div className="p-4">
                <SkeletonTable rows={7} cols={7} />
              </div>
            ) : list.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No components found"
                hint="Add standard government payroll components (Basic, DA, HRA, CLA, Medical, Transport, etc.) or adjust the filters."
                action={
                  <button onClick={handleAdd} className="btn btn-primary btn-sm">
                    <Plus size={14} /> Add Component
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
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
                    {list.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                          {c.component_code || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {c.component_name}
                          </div>
                          {c.short_name && (
                            <div className="text-[0.68rem] text-slate-400">{c.short_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold border ${TYPE_TONE[c.type]}`}
                          >
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {c.category || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                          {c.display_order}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {c.aliases.slice(0, 4).map((a, i) => (
                              <span
                                key={`${a.id}-${i}`}
                                className="px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {a.alias_text}
                              </span>
                            ))}
                            {c.aliases.length > 4 && (
                              <span className="text-[0.65rem] text-slate-400">+{c.aliases.length - 4}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold border ${
                              c.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-800/50'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-800/50'
                            }`}
                          >
                            {c.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(c)}
                              className="um-icon-btn"
                              title="Edit component"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => void handleToggleActive(c)}
                              disabled={setActive.isSettingActive}
                              className="um-icon-btn"
                              title={c.active ? 'Deactivate' : 'Activate'}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              disabled={removeComponent.isDeleting}
                              className="um-icon-btn um-icon-btn-ghost hover:text-rose-600"
                              title="Delete component"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComponentEditor
        key={editing?.id ?? 'new'}
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        component={editing}
        onSaved={() => void refetch()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Component?"
        danger
        icon={Trash2}
        confirmLabel="Delete"
        busy={removeComponent.isDeleting}
        message={
          deleteTarget
            ? `Delete "${deleteTarget.component_name}" from the component master? Components referenced by historical pay bills cannot be hard-deleted and must be deactivated instead.`
            : undefined
        }
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

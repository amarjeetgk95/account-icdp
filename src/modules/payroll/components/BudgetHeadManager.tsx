import { useState, type FormEvent } from 'react';
import { useBudgetHeads } from '../hooks/useBudgetHeads';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pencil, Trash2, Plus, RefreshCw, Save, X, Tag, FolderOpen } from 'lucide-react';
import type { BudgetHeadInput } from '../types';

export function BudgetHeadManager() {
  const { heads, isLoading, isCreating, isUpdating, isDeleting, createAsync, updateAsync, deleteAsync } =
    useBudgetHeads();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setStatus(null);
  };

  const startEdit = (head: { id: string; code: string; name: string }) => {
    setEditingId(head.id);
    setCode(head.code);
    setName(head.name);
    setStatus(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      setStatus({ type: 'error', message: 'Both code and name are required' });
      return;
    }

    const input: BudgetHeadInput = editingId ? { id: editingId, code: trimmedCode, name: trimmedName } : { code: trimmedCode, name: trimmedName };

    try {
      setStatus({ type: 'info', message: 'Saving...' });
      if (editingId) {
        await updateAsync(input);
        setStatus({ type: 'success', message: `Budget head "${trimmedCode} — ${trimmedName}" updated.` });
      } else {
        await createAsync(input);
        setStatus({ type: 'success', message: `Budget head "${trimmedCode} — ${trimmedName}" created.` });
      }
      resetForm();
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save budget head' });
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    try {
      await deleteAsync(id);
      setDeleteConfirmId(null);
      setStatus({ type: 'success', message: 'Budget head deleted. Employees remain but are unassigned.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete budget head' });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Tag size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {editingId ? 'Edit Budget Head' : 'Add Budget Head'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {editingId
                ? 'Update the code and name of the budget head'
                : 'Create a budget head to classify employee salaries'}
            </p>
          </div>
        </div>
      </div>
      <div className="card-body">
        {status && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-4 ${
              status.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : status.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {status.type === 'info' ? <RefreshCw size={14} className="animate-spin" /> : status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div>
            <label htmlFor="headCode" className="label">
              Code <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              id="headCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="input text-sm"
              placeholder="e.g. 2071"
              maxLength={20}
            />
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Short code shown in reports (unique per office)</p>
          </div>

          <div>
            <label htmlFor="headName" className="label">
              Name <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              id="headName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-sm"
              placeholder="e.g. Salaries — Pension Payments"
              maxLength={100}
            />
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Full budget head classification name</p>
          </div>

          <div className="flex items-center gap-2 md:pt-[22px]">
            <button type="submit" disabled={isCreating || isUpdating} className="btn btn-primary btn-md">
              {isCreating || isUpdating ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                  Saving...
                </>
              ) : editingId ? (
                <>
                  <Save size={14} className="mr-1.5" />
                  Update
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-1.5" />
                  Add Head
                </>
              )}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn btn-secondary btn-md">
                <X size={14} className="mr-1.5" />
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="spinner h-8 w-8"></div>
            </div>
          ) : heads.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No budget heads defined yet."
              hint="Add a head above, then assign employees to it."
              compact
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th className="text-left" style={{ width: '110px' }}>Code</th>
                    <th className="text-left">Name</th>
                    <th className="text-center" style={{ width: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {heads.map((head) => (
                    <tr key={head.id}>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
                          {head.code}
                        </span>
                      </td>
                      <td className="font-medium text-slate-800 dark:text-slate-200">{head.name}</td>
                      <td>
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => startEdit(head)}
                            className="btn btn-icon btn-sm btn-secondary"
                            title="Edit budget head"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(head.id)}
                            disabled={isDeleting}
                            className={`btn btn-icon btn-sm ${
                              deleteConfirmId === head.id ? 'btn-danger' : 'btn-outline'
                            }`}
                            title={deleteConfirmId === head.id ? 'Click again to confirm' : 'Delete budget head'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {deleteConfirmId === head.id && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 text-center font-medium">
                            Delete {`"${head.code} — ${head.name}"`}? Employees stay but become unassigned.
                          </p>
                        )}
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
  );
}

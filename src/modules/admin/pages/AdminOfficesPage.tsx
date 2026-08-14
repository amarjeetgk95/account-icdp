import { useState } from 'react';
import { Building2, Plus, Save, Edit3, X } from 'lucide-react';
import { useOffices, useCreateOffice, useUpdateOffice } from '../hooks/useAdmin';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { getSectionIcon } from '@/shared/icons';
import type { Office } from '../types';

export function AdminOfficesPage() {
  const { toast } = useToast();
  const { data: offices, isLoading, error } = useOffices();
  const createOffice = useCreateOffice();
  const updateOffice = useUpdateOffice();

  const [newName, setNewName] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDistrict, setEditDistrict] = useState('');

  const startEdit = (office: Office) => {
    setEditingId(office.id);
    setEditName(office.name);
    setEditDistrict(office.district ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDistrict('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (name.length < 2) {
      toast({ title: 'Validation', description: 'Office name must be at least 2 characters.', variant: 'destructive' });
      return;
    }
    try {
      await updateOffice.mutateAsync({ officeId: editingId, name, district: editDistrict.trim() || null });
      toast({ title: 'Office updated', description: `${name} has been renamed.` });
      cancelEdit();
    } catch (error) {
      toast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Could not update office', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    const district = newDistrict.trim() || null;
    if (name.length < 2) {
      toast({ title: 'Validation', description: 'Office name must be at least 2 characters.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      await createOffice.mutateAsync({ name, district });
      toast({ title: 'Office created', description: `${name} was added.` });
      setNewName('');
      setNewDistrict('');
    } catch (error) {
      toast({ title: 'Create failed', description: error instanceof Error ? error.message : 'Could not create office', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AdminLayout
      title="Office Management"
      subtitle="Register offices, edit details, and review office-level staffing"
      icon={getSectionIcon('offices')}
    >
      <div className="space-y-5">
        {error && (
          <div className="alert alert-danger rounded-xl">
            Failed to load offices: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        <div className="card rounded-2xl animate-fade-in">
          <div className="card-body">
            <h3 className="font-heading font-semibold text-slate-800 dark:text-white mb-3">Add Office</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="um-field mb-0">
                <label className="label">Office name</label>
                <div className="relative">
                  <Building2 size={15} className="um-field-icon" />
                  <input
                    type="text"
                    className="input pl-9"
                    placeholder="e.g. Surat Central"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <div className="um-field mb-0">
                <label className="label">District</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Surat"
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                />
              </div>
              <div>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || createOffice.isPending}
                  className="btn btn-primary w-full"
                >
                  {isCreating || createOffice.isPending ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="animate-spin rounded-full border-2 border-white/30 border-t-white h-4 w-4"></span>
                      Adding...
                    </span>
                  ) : (
                    <>
                      <Plus size={14} /> Add Office
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
          <div className="card-body p-0">
            <div className="overflow-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Office</th>
                    <th>District</th>
                    <th>Users</th>
                    <th>Suspended</th>
                    <th>Financial Year</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offices?.map((office) => (
                    <tr key={office.id}>
                      <td className="font-medium text-slate-800 dark:text-slate-100">
                        {editingId === office.id ? (
                          <input
                            type="text"
                            className="input input-sm w-full max-w-xs"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          office.name
                        )}
                      </td>
                      <td>
                        {editingId === office.id ? (
                          <input
                            type="text"
                            className="input input-sm w-full max-w-xs"
                            value={editDistrict}
                            onChange={(e) => setEditDistrict(e.target.value)}
                          />
                        ) : (
                          office.district || '-'
                        )}
                      </td>
                      <td className="tabular-nums">{office.users ?? 0}</td>
                      <td className="tabular-nums">{office.suspended_users ?? 0}</td>
                      <td className="tabular-nums">
                        {office.current_fy ? `${office.current_fy}-${String(office.current_fy + 1).slice(-2)}` : '-'}
                      </td>
                      <td className="text-center">
                        {editingId === office.id ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={saveEdit} disabled={updateOffice.isPending} className="um-icon-btn" title="Save">
                              <Save size={15} />
                            </button>
                            <button onClick={cancelEdit} className="um-icon-btn um-icon-btn-ghost" title="Cancel">
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(office)} className="um-icon-btn" title="Edit office">
                            <Edit3 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!isLoading && offices?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center">
                        <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Building2 size={20} className="text-slate-400 dark:text-slate-500" />
                        </span>
                        <p className="empty-state-text">No offices registered yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {isLoading && (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  Loading offices...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
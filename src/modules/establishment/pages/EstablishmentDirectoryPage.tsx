import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ArrowRight,
  Wallet,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { StatCardSkeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentEmployees,
  useEstablishmentPosts,
  useEstablishmentLastSyncedAt,
  useHydrateEstablishment,
  useEstablishmentAutoSync,
} from '../hooks/useEstablishment';
import { EstablishmentSyncStatusBadge } from '../components/EstablishmentSyncStatusBadge';
import { EstablishmentEmployeeList } from '../components/EstablishmentEmployeeList';
import { EstablishmentEmployeeForm } from '../components/EstablishmentEmployeeForm';
import { Modal } from '@/shared/components/Modal';
import { latestPayOf } from '../types';
import type { EstablishmentEmployee } from '../types';

const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function EstablishmentDirectoryPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const employeesQuery = useEstablishmentEmployees();
  const postsQuery = useEstablishmentPosts();
  const lastSyncedQuery = useEstablishmentLastSyncedAt();
  const hydrateMutation = useHydrateEstablishment();

  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const lastSyncedAt = lastSyncedQuery.data ?? null;
  const queryClient = useQueryClient();

  useEstablishmentAutoSync();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'establishment:refresh') {
        queryClient.invalidateQueries({ queryKey: ['establishmentEmployees'] });
        queryClient.invalidateQueries({ queryKey: ['establishmentPosts'] });
        queryClient.invalidateQueries({ queryKey: ['establishmentLastSync'] });
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'establishment:refresh') {
        queryClient.invalidateQueries({ queryKey: ['establishmentEmployees'] });
        queryClient.invalidateQueries({ queryKey: ['establishmentPosts'] });
      }
    };
    const onFocus = () => {
      // Fallback: when popup closes and focus returns, refresh if backend changed
      queryClient.invalidateQueries({ queryKey: ['establishmentEmployees'] });
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [queryClient]);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EstablishmentEmployee | null>(null);

  const stats = useMemo(() => {
    let activeCount = 0;
    let totalPay = 0;
    for (const e of employees) {
      if (e.active) activeCount += 1;
      totalPay += latestPayOf(e)?.basicPay ?? 0;
    }
    const sanctioned = (postsQuery.data ?? []).reduce((s, p) => s + p.sanctioned, 0);
    const filled = (postsQuery.data ?? []).reduce((s, p) => s + p.filled, 0);
    return { total: employees.length, active: activeCount, totalPay, sanctioned, filled, vacant: Math.max(0, sanctioned - filled) };
  }, [employees, postsQuery.data]);

  const handleSync = async () => {
    try {
      await hydrateMutation.mutateAsync();
      toast({ title: 'Synced', description: 'Establishment register refreshed from backend.' });
    } catch (error) {
      toast({ title: 'Sync failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };
  const openEditModal = (emp: EstablishmentEmployee) => {
    setEditingEmployee(emp);
    setIsEmployeeModalOpen(true);
  };
  const closeEmployeeModal = () => {
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <WorkspaceHeader
        eyebrow="Establishment · Employee Register"
        title="Establishment Directory"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <EstablishmentSyncStatusBadge lastSyncedAt={lastSyncedAt} isHydrating={hydrateMutation.isPending} onSync={handleSync} />
            <Button size="sm" variant="outline" onClick={() => navigate('/establishment/posts')} className="hidden sm:inline-flex bg-white dark:bg-slate-900">
              <Wallet className="mr-1 h-4 w-4" /> Sanctioned Posts (મહેકમ)
            </Button>
            <Button size="sm" onClick={openAddModal} className="font-bold bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-1 h-4 w-4" /> Add Employee
            </Button>
          </div>
        }
      />

      {employeesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="stat-tile p-4">
              <div className="stat-label">Total Staff</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-sub">{stats.active} active · {stats.total - stats.active} inactive</div>
            </Card>
            <Card className="stat-tile stat-tile-accent border-l-emerald-500 p-4">
              <div className="stat-label text-emerald-600">Monthly Pay Bill</div>
              <div className="stat-value text-money text-emerald-600">{INR(stats.totalPay)}</div>
              <div className="stat-sub">Sum of latest basic pay</div>
            </Card>
            <Card
              className="stat-tile stat-tile-accent border-l-blue-500 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
              onClick={() => navigate('/establishment/posts')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/establishment/posts')}
              title="Open Sanctioned Posts (મહેકમ માહિતી)"
            >
              <div className="stat-label text-blue-600 flex items-center justify-between">
                Sanctioned Posts
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="stat-value">{stats.sanctioned}</div>
              <div className="stat-sub">{stats.filled} filled · click to manage →</div>
            </Card>
            <Card
              className="stat-tile stat-tile-accent border-l-amber-500 p-4 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
              onClick={() => navigate('/establishment/posts')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/establishment/posts')}
              title="Open Sanctioned Posts (મહેકમ માહિતી)"
            >
              <div className="stat-label text-amber-600 flex items-center justify-between">
                Vacant Posts
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="stat-value">{stats.vacant}</div>
              <div className="stat-sub">To be filled (મહેકમ)</div>
            </Card>
          </div>

          {/* Sanctioned Posts — separate section CTA */}
          <Card className="border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sanctioned Posts (મહેકમ માહિતી) — Separate Section</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {postsQuery.data?.length ?? 0} posts · {stats.sanctioned} sanctioned · {stats.filled} filled · {stats.vacant} vacant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => navigate('/establishment/posts')} className="bg-white dark:bg-slate-900">
                  <Layers className="mr-1.5 h-3.5 w-3.5" /> View Posts
                </Button>
                <Button size="sm" onClick={() => navigate('/establishment/posts')} className="font-bold bg-blue-600 hover:bg-blue-700 text-white">
                  Manage Posts <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Employee Directory — modal-based edit only */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <Plus size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Employee Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">All registered employees for this office (Establishment Register) — click Edit to modify in popup</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <EstablishmentEmployeeList onEdit={openEditModal} />
            </div>
          </div>

          <Modal
            open={isEmployeeModalOpen}
            onClose={closeEmployeeModal}
            title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            maxWidth="xl"
          >
            <EstablishmentEmployeeForm
              editingEmployee={editingEmployee}
              onCancel={closeEmployeeModal}
              onSelect={(emp) => {
                setEditingEmployee(emp);
              }}
            />
          </Modal>
        </>
      )}
    </div>
  );
}

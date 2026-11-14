import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ArrowRight,
  Layers,
  Users,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { StatCardSkeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentEmployees,
  useEstablishmentLastSyncedAt,
  useHydrateEstablishment,
  useEstablishmentAutoSync,
} from '../hooks/useEstablishment';
import { useEstablishmentPositions } from '../hooks/useEstablishmentPositions';
import { EstablishmentSyncStatusBadge } from '../components/EstablishmentSyncStatusBadge';
import { EstablishmentEmployeeList } from '../components/EstablishmentEmployeeList';
import { EstablishmentEmployeeForm } from '../components/EstablishmentEmployeeForm';
import { findDuplicateEstablishmentHrpns } from '../validation/establishment.schema';
import { Modal } from '@/shared/components/Modal';
import { isResolutionStatus, latestPayOf } from '../types';
import type { EstablishmentEmployee } from '../types';
import { formatINRWhole as INR } from '@/shared/domain/currency';

export function EstablishmentDirectoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const employeesQuery = useEstablishmentEmployees();
  const positionsQuery = useEstablishmentPositions();
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
        queryClient.invalidateQueries({ queryKey: ['establishmentPositions'] });
        queryClient.invalidateQueries({ queryKey: ['establishmentLastSync'] });
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'establishment:refresh') {
        queryClient.invalidateQueries({ queryKey: ['establishmentEmployees'] });
        queryClient.invalidateQueries({ queryKey: ['establishmentPositions'] });
      }
    };
    const onFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['establishmentEmployees'] });
      queryClient.invalidateQueries({ queryKey: ['establishmentPositions'] });
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

  const activePositions = useMemo(
    () => (positionsQuery.data ?? []).filter((p) => !isResolutionStatus(p.status)),
    [positionsQuery.data]
  );

  const stats = useMemo(() => {
    let activeCount = 0;
    let totalPay = 0;
    for (const e of employees) {
      if (e.active) activeCount += 1;
      totalPay += latestPayOf(e)?.basicPay ?? 0;
    }
    const sanctioned = activePositions.length;
    const filled = activePositions.filter((p) => p.status === 'Filled').length;
    return {
      total: employees.length,
      active: activeCount,
      totalPay,
      sanctioned,
      filled,
      vacant: Math.max(0, sanctioned - filled),
    };
  }, [employees, activePositions]);

  // Duplicate HRPN check
  const duplicateHrpns = useMemo(() => findDuplicateEstablishmentHrpns(employees), [employees]);

  const handleSync = async () => {
    try {
      await hydrateMutation.mutateAsync();
      toast({ title: 'Synced', description: 'Establishment register refreshed from backend.' });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
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
    <div className="max-w-7xl mx-auto space-y-4 pb-16">
      {/* 1. Dedicated Page Header */}
      <WorkspaceHeader
        eyebrow="ICDP SURAT"
        title="Employee Register"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <EstablishmentSyncStatusBadge
              lastSyncedAt={lastSyncedAt}
              isHydrating={hydrateMutation.isPending}
              onSync={handleSync}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/establishment/posts')}
              className="bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              Position Register →
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/establishment/posts/master')}
              className="bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <Award className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
              Post Master
            </Button>
            <Button
              size="sm"
              onClick={openAddModal}
              className="font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Employee
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
          {duplicateHrpns.length > 0 && (
            <div
              className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3"
              role="alert"
            >
              <span
                className="mt-0.5 w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                !
              </span>
              <div className="flex-1 text-xs text-rose-700 dark:text-rose-300">
                <div className="font-bold">
                  Duplicate HRPN No. not allowed — {duplicateHrpns.length} duplicate(s) found
                </div>
                <div className="mt-0.5 opacity-90 break-words">
                  {duplicateHrpns.join(', ')} — each HRPN No. must be unique (HRPN is the single source of truth
                  linking Establishment and Paybill). Edit the employees to fix duplicates.
                </div>
              </div>
            </div>
          )}

          {/* Compact KPI tiles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="stat-tile p-3.5">
              <div className="stat-label">Total Staff</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-sub">
                {stats.active} active · {stats.total - stats.active} transferred/retained
              </div>
            </Card>
            <Card className="stat-tile stat-tile-accent border-l-emerald-500 p-3.5">
              <div className="stat-label text-emerald-600">Monthly Pay Bill</div>
              <div className="stat-value text-money text-emerald-600">{INR(stats.totalPay)}</div>
              <div className="stat-sub">Sum of active basic pay</div>
            </Card>
            <Card
              className="stat-tile stat-tile-accent border-l-blue-500 p-3.5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
              onClick={() => navigate('/establishment/posts')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/establishment/posts')}
              title="Open Position Register"
            >
              <div className="stat-label text-blue-600 flex items-center justify-between">
                Sanctioned Posts
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="stat-value">{stats.sanctioned}</div>
              <div className="stat-sub">{stats.filled} filled · view posts →</div>
            </Card>
            <Card
              className="stat-tile stat-tile-accent border-l-amber-500 p-3.5 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
              onClick={() => navigate('/establishment/posts')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/establishment/posts')}
              title="Open Position Register"
            >
              <div className="stat-label text-amber-600 flex items-center justify-between">
                Vacant Posts
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="stat-value">{stats.vacant}</div>
              <div className="stat-sub">Vacant positions to be filled</div>
            </Card>
          </div>

          {/* Employee Directory List — maximum vertical room */}
          <div className="card">
            <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Users size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-800">Employee Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    HRPN identity, active posts &amp; permanent records for Form 16 / TDS continuity.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={openAddModal} className="font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                <Plus className="mr-1 h-4 w-4" /> Add Employee
              </Button>
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

export default EstablishmentDirectoryPage;

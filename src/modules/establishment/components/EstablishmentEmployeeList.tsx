import { useState, useMemo } from 'react';
import { Pencil, Trash2, Search, Filter, X, ShieldCheck, ShieldAlert, Tag, ChevronUp, ChevronDown, GripVertical, History, Layers, MapPin } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { formatDate } from '@/shared/utilities';
import { useEstablishmentEmployees, useDeleteEstablishmentEmployee, useReorderEstablishmentEmployees } from '../hooks/useEstablishment';
import { useEstablishmentPositions } from '../hooks/useEstablishmentPositions';
import { useBudgetHeads } from '@/modules/payroll/hooks/useBudgetHeads';
import { englishDesignationOf } from '../constants/establishmentPostCatalog';
import { compareEstablishmentOrder } from '../types';
import type { EstablishmentEmployee } from '../types';
import { PostingHistoryModal, PostingHistoryTarget } from './PostingHistoryModal';

interface EstablishmentEmployeeListProps {
  onEdit?: (employee: EstablishmentEmployee) => void;
}

export function EstablishmentEmployeeList({ onEdit }: EstablishmentEmployeeListProps) {
  const { data: employeesData, isLoading } = useEstablishmentEmployees();
  // Manual office sequence order first, then name. This is the order reports follow.
  const employees = useMemo(
    () => [...(employeesData ?? [])].sort(compareEstablishmentOrder),
    [employeesData]
  );
  const seqById = useMemo(() => new Map(employees.map((e, i) => [e.id, i + 1])), [employees]);
  const { heads } = useBudgetHeads();
  const { data: positionsData } = useEstablishmentPositions();
  const positions = useMemo(() => positionsData ?? [], [positionsData]);

  const posByEmployeeId = useMemo(() => {
    const map = new Map<string, typeof positions[0]>();
    for (const p of positions) {
      if (p.currentEmployeeId) {
        map.set(p.currentEmployeeId, p);
      }
    }
    return map;
  }, [positions]);

  const deleteMutation = useDeleteEstablishmentEmployee();
  const reorderMutation = useReorderEstablishmentEmployees();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'transferred'>('all');
  const [deleteTarget, setDeleteTarget] = useState<EstablishmentEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<PostingHistoryTarget | null>(null);

  const headMap = useMemo(() => new Map(heads.map((h) => [String(h.id), h])), [heads]);

  // Reordering is only meaningful on the full, unfiltered list — moving a row
  // while searching would write a wrong global sequence.
  const isReorderLocked = searchTerm.trim() !== '' || statusFilter !== 'all';

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const isTransferred = Boolean(emp.transferDate);
      if (statusFilter === 'active' && isTransferred) return false;
      if (statusFilter === 'transferred' && !isTransferred) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const pos = posByEmployeeId.get(emp.id);
      const desigGu = emp.designationGu || (pos ? pos.postName : '');
      const desigEn = emp.designation || (pos?.designationTitleEn) || (pos ? englishDesignationOf(pos.postName) : '');
      const hq = pos?.headquarter || '';

      return (
        emp.name.toLowerCase().includes(term) ||
        (emp.nameGu || '').toLowerCase().includes(term) ||
        (emp.mobileNo || '').toLowerCase().includes(term) ||
        (emp.pan || '').toLowerCase().includes(term) ||
        (emp.hrpnNo || '').toLowerCase().includes(term) ||
        desigEn.toLowerCase().includes(term) ||
        desigGu.toLowerCase().includes(term) ||
        hq.toLowerCase().includes(term) ||
        (pos ? pos.positionNo.toLowerCase().includes(term) : false)
      );
    });
  }, [employees, searchTerm, statusFilter, posByEmployeeId]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const persistOrder = async (nextOrdered: EstablishmentEmployee[]) => {
    setReorderError(null);
    try {
      await reorderMutation.mutateAsync(nextOrdered.map((e) => e.id));
    } catch (error) {
      setReorderError(error instanceof Error ? error.message : 'Failed to save order');
    }
  };

  const moveEmployee = (id: string, dir: -1 | 1) => {
    if (isReorderLocked || reorderMutation.isPending) return;
    const idx = employees.findIndex((e) => e.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= employees.length) return;
    const next = [...employees];
    const [moved] = next.splice(idx, 1);
    next.splice(nextIdx, 0, moved);
    void persistOrder(next);
  };

  const handleDropOn = (targetId: string) => {
    if (isReorderLocked || reorderMutation.isPending || !dragSrcId || dragSrcId === targetId) return;
    const srcIdx = employees.findIndex((e) => e.id === dragSrcId);
    const dstIdx = employees.findIndex((e) => e.id === targetId);
    if (srcIdx < 0 || dstIdx < 0) return;
    const next = [...employees];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(dstIdx, 0, moved);
    setDragSrcId(null);
    void persistOrder(next);
  };

  const handleEdit = (emp: EstablishmentEmployee) => {
    if (onEdit) {
      onEdit(emp);
      return;
    }
    window.open(`/establishment/employees/edit/${emp.id}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="empty-state py-8">
        <div className="empty-state-icon">👥</div>
        <p className="empty-state-text text-slate-700 dark:text-slate-200">No employees registered yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add employees using the form above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, PAN, HRPN, designation, headquarter..."
            className="input text-xs pl-8 pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex w-full items-center gap-1.5 overflow-x-auto bg-white p-1 rounded-lg border border-slate-200 sm:w-auto sm:shrink-0 dark:border-slate-700 dark:bg-slate-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Filter size={13} className="text-slate-400 ml-1.5 mr-0.5" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            All ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'active' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            Active ({employees.filter((e) => !e.transferDate).length})
          </button>
          <button
            onClick={() => setStatusFilter('transferred')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'transferred' ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            Transferred ({employees.filter((e) => Boolean(e.transferDate)).length})
          </button>
        </div>
      </div>

      {reorderError && (
        <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300" role="alert">
          <span className="font-bold">Order not saved — </span>{reorderError}
        </div>
      )}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
        {isReorderLocked
          ? 'Reorder paused while searching/filtering — clear search and show All to change the office sequence.'
          : `Drag rows or use ↑ ↓ in # column to set office sequence — same order appears in Paybill and other reports.${reorderMutation.isPending ? ' Saving…' : ''}`}
      </p>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="table table-mobile-cards text-xs">
          <thead>
            <tr>
              <th className="text-center" style={{ width: '86px' }} title="Manual office sequence order. Same order appears in reports.">#</th>
              <th className="text-left">HRPN No.</th>
              <th className="text-left">Name</th>
              <th className="text-left">PAN</th>
              <th className="text-center">Designation / Headquarter / Budget</th>
              <th className="text-center">Status</th>
              <th className="text-center">Join Date</th>
              <th className="text-center">Transfer Date</th>
              <th className="text-center" style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} data-label="" className="cell-full text-center py-8 text-slate-400 dark:text-slate-500 text-xs">No matching employees found for &quot;{searchTerm}&quot;</td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const seq = seqById.get(employee.id) ?? 0;
                const isTransferred = Boolean(employee.transferDate);
                const headId = employee.budgetHeadId || null;
                const head = headId ? headMap.get(String(headId)) : null;
                return (
                  <tr
                    key={employee.id}
                    draggable={!isReorderLocked}
                    onDragStart={() => setDragSrcId(employee.id)}
                    onDragOver={(e) => { if (!isReorderLocked) e.preventDefault(); }}
                    onDrop={() => handleDropOn(employee.id)}
                    onDragEnd={() => setDragSrcId(null)}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${dragSrcId === employee.id ? 'opacity-50' : ''}`}
                  >
                    <td data-label="#" className="cell-full text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {!isReorderLocked && (
                          <span className="cursor-grab text-slate-300 hover:text-slate-500" title="Drag to reorder — same order appears in reports">
                            <GripVertical size={13} />
                          </span>
                        )}
                        <span className="text-slate-500 font-bold min-w-[18px]">{seq}</span>
                        <span className="flex flex-col">
                          <button
                            onClick={() => moveEmployee(employee.id, -1)}
                            disabled={isReorderLocked || reorderMutation.isPending || seq <= 1}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                            title={isReorderLocked ? 'Clear search/filter to reorder' : 'Move up'}
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => moveEmployee(employee.id, 1)}
                            disabled={isReorderLocked || reorderMutation.isPending || seq >= employees.length}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                            title={isReorderLocked ? 'Clear search/filter to reorder' : 'Move down'}
                          >
                            <ChevronDown size={13} />
                          </button>
                        </span>
                      </div>
                    </td>
                    <td data-label="HRPN" className="font-semibold text-slate-700 dark:text-slate-300">{employee.hrpnNo || '-'}</td>
                    <td data-label="Name" className="cell-full">
                      <div
                        className="font-semibold text-slate-900 dark:text-slate-100 text-xs"
                        title={employee.nameGu ? `Gujarati Name: ${employee.nameGu}` : undefined}
                      >
                        {employee.name || employee.nameGu || '-'}
                      </div>
                      {employee.mobileNo && (
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {employee.mobileNo}
                        </div>
                      )}
                      {(() => {
                        const pos = posByEmployeeId.get(employee.id);
                        if (pos) {
                          return (
                            <span
                              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                              title={pos.postName ? `Position: ${pos.postName}` : undefined}
                            >
                              <Layers size={11} /> Position #{pos.positionNo}
                            </span>
                          );
                        }
                        if (isTransferred) {
                          return (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] italic">
                              Relieved
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                            Unassigned (Awaiting Post)
                          </span>
                        );
                      })()}
                    </td>
                    <td data-label="PAN" className="font-semibold uppercase text-slate-700 dark:text-slate-300">{employee.pan || '-'}</td>
                    <td data-label="Designation" className="cell-full text-center">
                      {(() => {
                        const pos = posByEmployeeId.get(employee.id);
                        const desigGu = employee.designationGu || (pos ? pos.postName : '');
                        const desigEn = employee.designation || (pos?.designationTitleEn) || (pos ? englishDesignationOf(pos.postName) : '');
                        const hq = pos?.headquarter || '';
                        const cadre = employee.cadreClass || (pos?.cadreClass ? pos.cadreClass.match(/\d/)?.[0] : null);

                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="text-xs font-semibold text-slate-800 dark:text-slate-100"
                              title={desigGu ? `Designation (Gujarati): ${desigGu}` : undefined}
                            >
                              {desigEn || desigGu || '-'}
                            </span>
                            {head ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                                <Tag size={10} /> {head.code} — {head.name}
                              </span>
                            ) : null}
                            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {cadre && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                                  Class {cadre}
                                </span>
                              )}
                              {hq && (
                                <span
                                  className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300 font-gujSans"
                                  title="Headquarter"
                                >
                                  <MapPin size={10} className="text-rose-500" /> {hq}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td data-label="Status" className="text-center">
                      {isTransferred ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                          <ShieldAlert size={11} /> Transferred
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                          <ShieldCheck size={11} /> Active
                        </span>
                      )}
                    </td>
                    <td data-label="Joined" className="text-center text-slate-600 dark:text-slate-300 text-xs">{employee.joinDate ? formatDate(employee.joinDate) : '-'}</td>
                    <td data-label="Transferred" className="text-center text-slate-600 dark:text-slate-300 text-xs">{employee.transferDate ? formatDate(employee.transferDate) : '-'}</td>
                    <td className="cell-actions">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setHistoryTarget({
                              type: 'EMPLOYEE',
                              id: employee.id,
                              name: employee.name || employee.nameGu || 'Employee',
                              hrpn: employee.hrpnNo,
                            });
                            setIsHistoryModalOpen(true);
                          }}
                          className="btn btn-icon btn-sm btn-outline text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          title="Posting History"
                        >
                          <History size={14} />
                        </button>
                        <button onClick={() => handleEdit(employee)} className="btn btn-icon btn-sm btn-secondary" title="Edit employee">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(employee)} className="btn btn-icon btn-sm btn-outline text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50" title="Delete employee">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Employee Record"
        message={
          deleteTarget ? (
            <div className="space-y-2">
              <p>Are you sure you want to delete employee <strong>{deleteTarget.name}</strong> (PAN: {deleteTarget.pan || '-'})?</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Note: If this employee was transferred or retired, do not delete them. Instead, enter their transfer date so their historical Form 16 and TDS records remain preserved.</p>
            </div>
          ) : undefined
        }
        confirmLabel="Yes, Delete Employee"
        cancelLabel="Cancel"
        danger
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <PostingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTarget(null);
        }}
        target={historyTarget}
      />
    </div>
  );
}

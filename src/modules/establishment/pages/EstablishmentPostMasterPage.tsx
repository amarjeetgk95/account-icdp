import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  RotateCcw,
  Layers,
  Users,
  Tag,
  Briefcase,
} from 'lucide-react';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentPostCatalog,
  useSavePostCatalog,
  useResetPostCatalog,
} from '../hooks/useEstablishmentPostCatalog';
import { useEstablishmentPositions } from '../hooks/useEstablishmentPositions';
import { comparePostCatalogHigherToLower } from '../constants/establishmentPostCatalog';
import { PostCatalogModal } from '../components/PostCatalogModal';
import type { PostCatalogItem } from '../types/postCatalog';

const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function EstablishmentPostMasterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const catalogQuery = useEstablishmentPostCatalog();
  const positionsQuery = useEstablishmentPositions();
  const saveMutation = useSavePostCatalog();
  const resetMutation = useResetPostCatalog();

  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const positions = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data]);

  // Count active positions using each post name
  const positionsCountByPostName = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of positions) {
      const name = (p.postName || '').trim();
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    }
    return map;
  }, [positions]);

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<'all' | 'Class-1' | 'Class-2' | 'Class-3' | 'Class-4'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PostCatalogItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PostCatalogItem | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Filtered post catalog sorted from higher pay to lower
  const filteredCatalog = useMemo(() => {
    return catalog
      .filter((item) => {
        if (classFilter !== 'all' && item.cadreClass !== classFilter) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          item.nameGu.toLowerCase().includes(term) ||
          item.nameEn.toLowerCase().includes(term) ||
          item.payLevel.toLowerCase().includes(term) ||
          item.payScale.toLowerCase().includes(term) ||
          item.cadreClass.toLowerCase().includes(term) ||
          (item.remarks || '').toLowerCase().includes(term)
        );
      })
      .sort(comparePostCatalogHigherToLower);
  }, [catalog, classFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    let c1 = 0;
    let c2 = 0;
    let c3 = 0;
    let c4 = 0;
    for (const it of catalog) {
      if (it.cadreClass === 'Class-1') c1++;
      else if (it.cadreClass === 'Class-2') c2++;
      else if (it.cadreClass === 'Class-3') c3++;
      else if (it.cadreClass === 'Class-4') c4++;
    }
    return {
      total: catalog.length,
      c1,
      c2,
      c3,
      c4,
    };
  }, [catalog]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PostCatalogItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSaveItem = async (
    savedItem: PostCatalogItem,
    cascade: boolean,
    oldNameGu?: string
  ) => {
    const existingIndex = catalog.findIndex((c) => c.id === savedItem.id);
    let next: PostCatalogItem[];
    if (existingIndex >= 0) {
      next = [...catalog];
      next[existingIndex] = savedItem;
    } else {
      next = [savedItem, ...catalog];
    }

    await saveMutation.mutateAsync({
      catalog: next,
      cascade: cascade && oldNameGu ? { oldNameGu, updated: savedItem } : undefined,
    });

    toast({
      title: 'Post Saved',
      description: `Post "${savedItem.nameGu}" has been saved successfully.`,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const next = catalog.filter((c) => c.id !== deleteTarget.id);
    await saveMutation.mutateAsync({ catalog: next });
    setDeleteTarget(null);
    toast({
      title: 'Post Removed',
      description: `Post "${deleteTarget.nameGu}" has been removed from catalogue.`,
    });
  };

  const handleResetDefaults = async () => {
    await resetMutation.mutateAsync();
    setResetConfirmOpen(false);
    toast({
      title: 'Catalog Reset',
      description: 'All posts have been reset to official department defaults.',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-16">
      {/* 1. Header */}
      <WorkspaceHeader
        eyebrow="ICDP SURAT"
        title="Post &amp; Cadre Master"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={() => navigate('/establishment/employees')}
              className="bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <Users className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Staff List →
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResetConfirmOpen(true)}
              className="bg-white dark:bg-slate-900 text-xs text-slate-600 hover:text-slate-900"
              title="Reset to official department catalog"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Post
            </Button>
          </div>
        }
      />

      {/* 2. KPI Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="stat-tile p-3.5">
          <div className="stat-label">Total Post Titles</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Active designations in master list</div>
        </Card>
        <Card className="stat-tile stat-tile-accent border-l-blue-500 p-3.5">
          <div className="stat-label text-blue-600">Class 1</div>
          <div className="stat-value text-blue-600">{stats.c1}</div>
          <div className="stat-sub">Gazetted</div>
        </Card>
        <Card className="stat-tile stat-tile-accent border-l-indigo-500 p-3.5">
          <div className="stat-label text-indigo-600">Class 2</div>
          <div className="stat-value text-indigo-600">{stats.c2}</div>
          <div className="stat-sub">Gazetted / Officer</div>
        </Card>
        <Card className="stat-tile stat-tile-accent border-l-emerald-500 p-3.5">
          <div className="stat-label text-emerald-600">Class 3</div>
          <div className="stat-value text-emerald-600">{stats.c3}</div>
          <div className="stat-sub">Executive &amp; Clerical</div>
        </Card>
        <Card className="stat-tile stat-tile-accent border-l-amber-500 p-3.5">
          <div className="stat-label text-amber-600">Class 4</div>
          <div className="stat-value text-amber-600">{stats.c4}</div>
          <div className="stat-sub">Subordinate Staff</div>
        </Card>
      </div>

      {/* 3. Search and Class Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full flex-1 min-w-0 sm:min-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by post name, English designation, level, or pay scale..."
            className="input text-xs pl-8 pr-4"
          />
        </div>
        <div className="flex w-full items-center gap-1.5 overflow-x-auto bg-white p-1 rounded-lg border border-slate-200 sm:w-auto sm:shrink-0 dark:border-slate-700 dark:bg-slate-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Filter size={13} className="text-slate-400 ml-1.5 mr-0.5" />
          <button
            onClick={() => setClassFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              classFilter === 'all'
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            All ({catalog.length})
          </button>
          <button
            onClick={() => setClassFilter('Class-1')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              classFilter === 'Class-1'
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Class 1 ({stats.c1})
          </button>
          <button
            onClick={() => setClassFilter('Class-2')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              classFilter === 'Class-2'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Class 2 ({stats.c2})
          </button>
          <button
            onClick={() => setClassFilter('Class-3')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              classFilter === 'Class-3'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Class 3 ({stats.c3})
          </button>
          <button
            onClick={() => setClassFilter('Class-4')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              classFilter === 'Class-4'
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Class 4 ({stats.c4})
          </button>
        </div>
      </div>

      {/* 4. Posts Data Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Briefcase size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Sanctioned Post Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Master list used when assigning designations to positions and employee service records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              Higher to Lower Pay
            </span>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredCatalog.length} of {catalog.length} post titles
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-mobile-cards text-xs">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '60px' }}>#</th>
                <th className="text-left">Designation (Gujarati)</th>
                <th className="text-left">Designation (English)</th>
                <th className="text-center">Cadre Class</th>
                <th className="text-center">Pay Level</th>
                <th className="text-center">Pay Scale</th>
                <th className="text-center">Min Basic Pay</th>
                <th className="text-center">Sanctioned Positions</th>
                <th className="text-center" style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={9} data-label="" className="cell-full text-center py-8 text-slate-400 text-xs">
                    No matching post titles found for &quot;{searchTerm}&quot;
                  </td>
                </tr>
              ) : (
                filteredCatalog.map((item, idx) => {
                  const inUseCount = positionsCountByPostName.get(item.nameGu.trim()) || 0;
                  const classBadgeColor =
                    item.cadreClass === 'Class-1'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      : item.cadreClass === 'Class-2'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                      : item.cadreClass === 'Class-3'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td data-label="#" className="text-center font-bold text-slate-400">{idx + 1}</td>
                      <td data-label="Designation (ગુજરાતી)" className="cell-full font-bold text-slate-800 dark:text-slate-100 font-gujSans">
                        {item.nameGu}
                        {item.remarks && (
                          <div className="text-[10px] text-slate-400 font-normal">{item.remarks}</div>
                        )}
                      </td>
                      <td data-label="Designation (English)" className="font-semibold text-slate-600 dark:text-slate-300">
                        {item.nameEn || '-'}
                      </td>
                      <td data-label="Cadre" className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${classBadgeColor}`}
                        >
                          {item.cadreClass === 'Class-1'
                            ? 'Class 1'
                            : item.cadreClass === 'Class-2'
                            ? 'Class 2'
                            : item.cadreClass === 'Class-3'
                            ? 'Class 3'
                            : 'Class 4'}
                        </span>
                      </td>
                      <td data-label="Pay Level" className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] num font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.payLevel}
                        </span>
                      </td>
                      <td data-label="Pay Scale" className="text-center num font-semibold text-slate-700 dark:text-slate-300">
                        {item.payScale || '-'}
                      </td>
                      <td data-label="Min Basic" className="text-center num font-bold text-slate-800 dark:text-slate-200">
                        {INR(item.minPay)}
                      </td>
                      <td data-label="Positions" className="text-center">
                        {inUseCount > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 cursor-pointer hover:bg-blue-100"
                            onClick={() => navigate('/establishment/posts')}
                            title="Click to view positions for this post"
                          >
                            <Tag size={10} /> {inUseCount} positions
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">0 positions</span>
                        )}
                      </td>
                      <td className="cell-actions">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="btn btn-icon btn-sm btn-secondary"
                            title="Edit Post"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            disabled={inUseCount > 0}
                            className="btn btn-icon btn-sm btn-outline text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-30 disabled:hover:bg-transparent"
                            title={
                              inUseCount > 0
                                ? 'Cannot delete post while assigned to active positions'
                                : 'Delete Post'
                            }
                          >
                            <Trash2 size={13} />
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
      </div>

      {/* Edit / Add Modal */}
      <PostCatalogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editingItem}
        existingCatalog={catalog}
        onSave={handleSaveItem}
        isPending={saveMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Post"
        message={`Are you sure you want to remove "${deleteTarget?.nameGu}" from the catalogue?`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        danger={true}
      />

      {/* Reset Defaults Confirmation */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={handleResetDefaults}
        title="Reset Post Catalogue to Defaults?"
        message="Are you sure you want to reset all posts and pay scales to the official department defaults? Any custom added posts will be removed."
        confirmLabel="Yes, Reset"
        cancelLabel="Cancel"
        danger={true}
      />
    </div>
  );
}

export default EstablishmentPostMasterPage;

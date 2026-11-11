import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Building2,
  FileText,
  Layers,
  FolderTree,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { grMasterService } from '../services/grMaster.service';
import { invalidateGRMetadata } from '../hooks/useGRMetadata';
import { useToast } from '@/hooks/use-toast';
import {
  GRMasterItemEditor,
  type MasterEditorState,
  type MasterTabType,
} from './GRMasterItemEditor';
import { GRModal } from './GRModal';
import type { GRCategory } from '../types';

interface GRMasterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MASTER_QUERY_KEYS: Record<MasterTabType, readonly string[]> = {
  docTypes: ['gr-master', 'doc-types'],
  departments: ['gr-master', 'departments'],
  categories: ['gr-master', 'categories'],
  subcategories: ['gr-master', 'subcategories'],
};

export function GRMasterSettingsModal({ isOpen, onClose }: GRMasterSettingsModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<MasterTabType>('docTypes');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<MasterEditorState | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const docTypesQuery = useQuery({
    queryKey: MASTER_QUERY_KEYS.docTypes,
    queryFn: () => grMasterService.getDocumentTypes(),
    enabled: isOpen,
  });
  const departmentsQuery = useQuery({
    queryKey: MASTER_QUERY_KEYS.departments,
    queryFn: () => grMasterService.getDepartments(),
    enabled: isOpen,
  });
  const categoriesQuery = useQuery({
    queryKey: MASTER_QUERY_KEYS.categories,
    queryFn: () => grMasterService.getCategories(),
    enabled: isOpen,
  });
  const subcategoriesQuery = useQuery({
    queryKey: MASTER_QUERY_KEYS.subcategories,
    queryFn: () => grMasterService.getSubcategories(),
    enabled: isOpen,
  });

  const docTypes = docTypesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const categories: GRCategory[] = categoriesQuery.data ?? [];
  const subcategories = subcategoriesQuery.data ?? [];
  const isLoading =
    docTypesQuery.isLoading ||
    departmentsQuery.isLoading ||
    categoriesQuery.isLoading ||
    subcategoriesQuery.isLoading;

  // Clear any in-progress editor / delete confirmation whenever the modal opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setEditingItem(null);
      setPendingDeleteId(null);
    }
  }

  const refreshAfterChange = (tab: MasterTabType) => {
    queryClient.invalidateQueries({ queryKey: MASTER_QUERY_KEYS[tab] });
    invalidateGRMetadata(queryClient);
  };

  const saveMutation = useMutation({
    mutationFn: async (state: MasterEditorState) => {
      switch (state.type) {
        case 'docTypes':
          return grMasterService.saveDocumentType(state.data);
        case 'departments':
          return grMasterService.saveDepartment(state.data);
        case 'categories':
          return grMasterService.saveCategory(state.data);
        case 'subcategories':
          return grMasterService.saveSubcategory(state.data);
      }
    },
    onSuccess: (_data, state) => {
      refreshAfterChange(state.type);
      setEditingItem(null);
      toast({ title: 'Saved', description: 'Master data updated successfully.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save the item.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: MasterTabType; id: string }) => {
      switch (type) {
        case 'docTypes':
          return grMasterService.deleteDocumentType(id);
        case 'departments':
          return grMasterService.deleteDepartment(id);
        case 'categories':
          return grMasterService.deleteCategory(id);
        case 'subcategories':
          return grMasterService.deleteSubcategory(id);
      }
    },
    onSuccess: (_data, variables) => {
      refreshAfterChange(variables.type);
      setPendingDeleteId(null);
      toast({ title: 'Deleted', description: 'The item was removed from master data.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete the item.',
        variant: 'destructive',
      });
    },
  });

  const switchTab = (tab: MasterTabType) => {
    setActiveTab(tab);
    setEditingItem(null);
    setPendingDeleteId(null);
  };

  const startAdd = () => {
    const nextOrder =
      activeTab === 'docTypes'
        ? docTypes.length + 1
        : activeTab === 'categories'
        ? categories.length + 1
        : activeTab === 'subcategories'
        ? subcategories.length + 1
        : 1;

    if (activeTab === 'departments') {
      setEditingItem({
        type: 'departments',
        mode: 'add',
        data: { id: '', name: '', code: null, description: null },
      });
      return;
    }

    setEditingItem({
      type: activeTab,
      mode: 'add',
      data: {
        id: '',
        name_en: '',
        name_gu: '',
        display_order: nextOrder,
        is_active: true,
        ...(activeTab === 'subcategories' ? { category_id: categories[0]?.id || 'CAT-01' } : {}),
      },
    } as MasterEditorState);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || saveMutation.isPending) return;

    const { data } = editingItem;

    if (!data.id?.trim()) {
      toast({ title: 'Missing ID', description: 'A unique code/ID is required.', variant: 'destructive' });
      return;
    }
    if (editingItem.type === 'departments') {
      if (!editingItem.data.name?.trim()) {
        toast({ title: 'Missing Name', description: 'Department name is required.', variant: 'destructive' });
        return;
      }
    } else if (editingItem.type === 'subcategories') {
      if (!editingItem.data.category_id?.trim() || !editingItem.data.name_en?.trim()) {
        toast({
          title: 'Missing Fields',
          description: 'Subcategory requires a parent category and an English name.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!editingItem.data.name_en?.trim()) {
      toast({ title: 'Missing Name', description: 'English name is required.', variant: 'destructive' });
      return;
    }

    saveMutation.mutate(editingItem);
  };

  const renderRowActions = (id: string) => (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setPendingDeleteId(null);
          if (activeTab === 'docTypes') {
            const item = docTypes.find((d) => d.id === id);
            if (item) setEditingItem({ type: 'docTypes', mode: 'edit', data: { ...item } });
          } else if (activeTab === 'departments') {
            const item = departments.find((d) => d.id === id);
            if (item) setEditingItem({ type: 'departments', mode: 'edit', data: { ...item } });
          } else if (activeTab === 'categories') {
            const item = categories.find((c) => c.id === id);
            if (item) setEditingItem({ type: 'categories', mode: 'edit', data: { ...item } });
          } else {
            const item = subcategories.find((s) => s.id === id);
            if (item) setEditingItem({ type: 'subcategories', mode: 'edit', data: { ...item } });
          }
        }}
        className="h-7 px-2 text-xs text-indigo-600"
      >
        <Edit2 size={12} className="mr-1" /> Edit
      </Button>

      {pendingDeleteId === id ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => deleteMutation.mutate({ type: activeTab, id })}
          disabled={deleteMutation.isPending}
          className="h-7 px-2 text-xs bg-rose-600 hover:bg-rose-700 text-white"
        >
          {deleteMutation.isPending ? (
            <Loader2 size={12} className="mr-1 animate-spin" />
          ) : (
            <Trash2 size={12} className="mr-1" />
          )}
          Confirm?
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPendingDeleteId(id)}
          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
        >
          <Trash2 size={12} />
        </Button>
      )}
    </div>
  );

  return (
    <GRModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      maxHeightClass="max-h-[92vh]"
      ariaLabelledBy="gr-master-settings-title"
    >
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Settings size={18} />
          </div>
          <div>
            <h2 id="gr-master-settings-title" className="text-xs font-bold text-slate-900 dark:text-white">
              Master Taxonomy & Classification Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add, edit, or reorganize document types, departments, categories, and subcategories
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="shrink-0 flex items-center border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/40 dark:bg-slate-900/40 gap-2 overflow-x-auto text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
        {(
          [
            { key: 'docTypes', icon: FileText, label: `Document Types (${docTypes.length})` },
            { key: 'departments', icon: Building2, label: `Departments (${departments.length})` },
            { key: 'categories', icon: Layers, label: `Categories (${categories.length})` },
            { key: 'subcategories', icon: FolderTree, label: `Subcategories (${subcategories.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTab(tab.key)}
            className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            {activeTab === 'docTypes' && 'Manage Document Types (DOC-01, Circular, etc.)'}
            {activeTab === 'departments' && 'Manage Departments (Animal Husbandry, GAD, etc.)'}
            {activeTab === 'categories' && 'Manage Master Categories (CAT-01 to CAT-09)'}
            {activeTab === 'subcategories' && 'Manage Subcategories (SUB-0101 to SUB-0906)'}
          </h3>

          <Button
            size="sm"
            onClick={startAdd}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            <Plus size={13} className="mr-1.5" /> Add New{' '}
            {activeTab === 'docTypes'
              ? 'Doc Type'
              : activeTab === 'departments'
              ? 'Department'
              : activeTab === 'categories'
              ? 'Category'
              : 'Subcategory'}
          </Button>
        </div>

        {editingItem && (
          <GRMasterItemEditor
            state={editingItem}
            categories={categories}
            onChange={setEditingItem}
            onCancel={() => setEditingItem(null)}
            onSubmit={handleSave}
            isSaving={saveMutation.isPending}
          />
        )}

        {activeTab === 'subcategories' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Filter by Category:</span>
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}: {c.name_en}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs flex flex-col">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span>Loading master taxonomy records...</span>
            </div>
          ) : (
            <div
              key={activeTab}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
            >
              <table className="w-full text-left border-collapse">
                <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50 dark:[&_th]:bg-slate-800">
                  <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Code / ID</th>
                  {activeTab === 'subcategories' && <th className="py-2.5 px-3">Category</th>}
                  <th className="py-2.5 px-3">Name (English)</th>
                  <th className="py-2.5 px-3">નામ (ગુજરાતી)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeTab === 'docTypes' &&
                  docTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">{item.id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{item.name_en}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{item.name_gu}</td>
                      <td className="py-2.5 px-3">{renderRowActions(item.id)}</td>
                    </tr>
                  ))}

                {activeTab === 'departments' &&
                  departments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">{item.id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.code || '—'}</td>
                      <td className="py-2.5 px-3">{renderRowActions(item.id)}</td>
                    </tr>
                  ))}

                {activeTab === 'categories' &&
                  categories.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">{item.id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{item.name_en}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{item.name_gu}</td>
                      <td className="py-2.5 px-3">{renderRowActions(item.id)}</td>
                    </tr>
                  ))}

                {activeTab === 'subcategories' &&
                  subcategories
                    .filter((s) => selectedCatFilter === 'all' || s.category_id === selectedCatFilter)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">{item.id}</td>
                        <td className="py-2.5 px-3 text-xs text-slate-500 font-semibold">{item.category_id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{item.name_en}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{item.name_gu}</td>
                        <td className="py-2.5 px-3">{renderRowActions(item.id)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between text-xs text-slate-500">
        <span>Changes are saved directly to the database and apply to all search filters and add forms.</span>
        <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
          Close
        </Button>
      </div>
    </GRModal>
  );
}

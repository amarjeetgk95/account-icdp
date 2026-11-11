import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GRCategory, GRDepartment, GRDocumentType, GRSubcategory } from '../types';

export type MasterTabType = 'docTypes' | 'departments' | 'categories' | 'subcategories';

export type MasterEditorState =
  | { type: 'docTypes'; mode: 'add' | 'edit'; data: GRDocumentType }
  | { type: 'departments'; mode: 'add' | 'edit'; data: GRDepartment }
  | { type: 'categories'; mode: 'add' | 'edit'; data: GRCategory }
  | { type: 'subcategories'; mode: 'add' | 'edit'; data: GRSubcategory };

interface GRMasterItemEditorProps {
  state: MasterEditorState;
  categories: GRCategory[];
  onChange: (state: MasterEditorState) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

function EditorFooter({
  onCancel,
  label,
  isSaving,
}: {
  onCancel: () => void;
  label: string;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={isSaving}
        className="h-7 text-xs"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={isSaving}
        className="h-7 text-xs bg-indigo-600 text-white"
      >
        <Save size={12} className="mr-1" /> {label}
      </Button>
    </div>
  );
}

export function GRMasterItemEditor({
  state,
  categories,
  onChange,
  onCancel,
  onSubmit,
  isSaving,
}: GRMasterItemEditorProps) {
  const isEdit = state.mode === 'edit';
  const update = (patch: Record<string, string | boolean | number>) => {
    onChange({ ...state, data: { ...state.data, ...patch } } as MasterEditorState);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
          {isEdit ? 'Edit Item' : 'Add New Item'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>

      {state.type === 'docTypes' && (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-600">ID Code (e.g. DOC-09)</Label>
              <Input
                value={state.data.id}
                onChange={(e) => update({ id: e.target.value })}
                disabled={isEdit}
                placeholder="DOC-09"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">English Name</Label>
              <Input
                value={state.data.name_en}
                onChange={(e) => update({ name_en: e.target.value })}
                placeholder="e.g. Press Note"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">Gujarati Name (ગુજરાતી નામ)</Label>
              <Input
                value={state.data.name_gu}
                onChange={(e) => update({ name_gu: e.target.value })}
                placeholder="e.g. અખબારી યાદી"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <EditorFooter onCancel={onCancel} label="Save Doc Type" isSaving={isSaving} />
        </form>
      )}

      {state.type === 'departments' && (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-600">ID (e.g. dept_rev)</Label>
              <Input
                value={state.data.id}
                onChange={(e) => update({ id: e.target.value })}
                disabled={isEdit}
                placeholder="dept_rev"
                className="h-8 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-slate-600">Department Name</Label>
              <Input
                value={state.data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Revenue Department"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <EditorFooter onCancel={onCancel} label="Save Department" isSaving={isSaving} />
        </form>
      )}

      {state.type === 'categories' && (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-600">Category Code (e.g. CAT-10)</Label>
              <Input
                value={state.data.id}
                onChange={(e) => update({ id: e.target.value })}
                disabled={isEdit}
                placeholder="CAT-10"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">English Name</Label>
              <Input
                value={state.data.name_en}
                onChange={(e) => update({ name_en: e.target.value })}
                placeholder="e.g. Disaster Relief"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">Gujarati Name (ગુજરાતી)</Label>
              <Input
                value={state.data.name_gu}
                onChange={(e) => update({ name_gu: e.target.value })}
                placeholder="e.g. આપત્તિ વ્યવસ્થાપન"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <EditorFooter onCancel={onCancel} label="Save Category" isSaving={isSaving} />
        </form>
      )}

      {state.type === 'subcategories' && (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-600">Subcategory Code</Label>
              <Input
                value={state.data.id}
                onChange={(e) => update({ id: e.target.value })}
                disabled={isEdit}
                placeholder="SUB-0107"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">Parent Category</Label>
              <select
                value={state.data.category_id}
                onChange={(e) => update({ category_id: e.target.value })}
                className="w-full h-8 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-slate-800 dark:text-slate-200"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}: {c.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">English Name</Label>
              <Input
                value={state.data.name_en}
                onChange={(e) => update({ name_en: e.target.value })}
                placeholder="e.g. Security & Surveillance"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">Gujarati Name</Label>
              <Input
                value={state.data.name_gu}
                onChange={(e) => update({ name_gu: e.target.value })}
                placeholder="e.g. સુરક્ષા અને સીસીટીવી"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <EditorFooter onCancel={onCancel} label="Save Subcategory" isSaving={isSaving} />
        </form>
      )}
    </div>
  );
}

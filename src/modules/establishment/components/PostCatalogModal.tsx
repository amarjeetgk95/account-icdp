import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Sparkles } from 'lucide-react';
import { useDialogBehaviour } from '@/shared/hooks/useDialogBehaviour';
import {
  STANDARD_LEVEL_DETAILS,
  standardPayScaleForLevel,
  englishDesignationOf,
} from '../constants/establishmentPostCatalog';
import type { PostCatalogItem } from '../types/postCatalog';

interface PostCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PostCatalogItem | null;
  existingCatalog: PostCatalogItem[];
  onSave: (savedItem: PostCatalogItem, cascade: boolean, oldNameGu?: string) => Promise<void>;
  isPending: boolean;
}

const AVAILABLE_PAY_LEVELS = [
  'Level 13 A',
  'Level 13',
  'Level 12',
  'Level 11',
  'Level 10',
  'Level 9',
  'Level 8',
  'Level 7',
  'Level 6',
  'Level 5',
  'Level 4',
  'Level 3',
  'Level 2',
  'Level 1',
  'IS, 3',
  'IS, 2',
  'IS, 1',
];

export const PostCatalogModal: React.FC<PostCatalogModalProps> = ({
  isOpen,
  onClose,
  item,
  existingCatalog,
  onSave,
  isPending,
}) => {
  const panelRef = useDialogBehaviour(onClose, isOpen);

  const [nameGu, setNameGu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [cadreClass, setCadreClass] = useState<'Class-1' | 'Class-2' | 'Class-3' | 'Class-4'>('Class-3');
  const [payLevel, setPayLevel] = useState('Level 4');
  const [payScale, setPayScale] = useState('25500-81100');
  const [minPay, setMinPay] = useState<number>(25500);
  const [remarks, setRemarks] = useState('');
  const [syncExistingPositions, setSyncExistingPositions] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setNameGu(item.nameGu);
      setNameEn(item.nameEn);
      setCadreClass(item.cadreClass);
      setPayLevel(item.payLevel);
      setPayScale(item.payScale);
      setMinPay(item.minPay);
      setRemarks(item.remarks || '');
      setSyncExistingPositions(true);
      setErrorMsg(null);
    } else {
      setNameGu('');
      setNameEn('');
      setCadreClass('Class-3');
      setPayLevel('Level 4');
      setPayScale('25500-81100');
      setMinPay(25500);
      setRemarks('');
      setSyncExistingPositions(false);
      setErrorMsg(null);
    }
  }, [item, isOpen]);

  const handlePayLevelChange = (lvl: string) => {
    setPayLevel(lvl);
    const std = standardPayScaleForLevel(lvl);
    setPayScale(std.payScale);
    setMinPay(std.minPay);
    setCadreClass(std.cadreClass);
  };

  const handleNameGuBlur = () => {
    if (nameGu.trim() && !nameEn.trim()) {
      const suggested = englishDesignationOf(nameGu.trim());
      if (suggested && suggested !== nameGu.trim()) {
        setNameEn(suggested);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedGu = nameGu.trim();
    const trimmedEn = nameEn.trim();

    if (!trimmedGu) {
      setErrorMsg('Designation (Gujarati) is required.');
      return;
    }
    if (!trimmedEn) {
      setErrorMsg('Designation (English) is required for statutory reports and Form 16.');
      return;
    }

    // Check duplicate nameGu (excluding current editing item)
    const duplicate = existingCatalog.find(
      (c) => c.nameGu.trim().toLowerCase() === trimmedGu.toLowerCase() && c.id !== item?.id
    );
    if (duplicate) {
      setErrorMsg(`Designation "${trimmedGu}" already exists in the catalogue.`);
      return;
    }

    const payload: PostCatalogItem = {
      id: item?.id || `post-${Date.now()}`,
      nameGu: trimmedGu,
      nameEn: trimmedEn,
      cadreClass,
      payLevel: payLevel.trim(),
      payScale: payScale.trim(),
      minPay: Number(minPay) || 0,
      remarks: remarks.trim() || undefined,
      isActive: true,
      displayOrder: item?.displayOrder,
    };

    try {
      await onSave(payload, Boolean(item && syncExistingPositions), item?.nameGu);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save post.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/95 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
              {item ? 'Edit Sanctioned Post' : 'Add Sanctioned Post'}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {item ? `Editing: ${item.nameGu}` : 'Post cadre class and 7th Pay Matrix level'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 sm:mx-6">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4 text-xs sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label text-slate-700 dark:text-slate-300">
                Designation (Gujarati) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                onBlur={handleNameGuBlur}
                className="input text-xs font-gujSans"
                placeholder="e.g. સિનિયર કારકુન, પશુચિકિત્સા અધિકારી"
                required
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Official post title as per sanctioned establishment orders
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="label text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Designation (English) <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                  <Sparkles size={11} /> Required for Form 24Q / Form 16
                </span>
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="input text-xs"
                placeholder="e.g. Senior Clerk, Veterinary Officer"
                required
              />
            </div>

            <div>
              <label className="label text-slate-700 dark:text-slate-300">
                Pay Level <span className="text-red-500">*</span>
              </label>
              <select
                value={payLevel}
                onChange={(e) => handlePayLevelChange(e.target.value)}
                className="input text-xs font-semibold"
              >
                {AVAILABLE_PAY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} ({STANDARD_LEVEL_DETAILS[lvl]?.cadreClass})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-slate-700 dark:text-slate-300">
                Cadre Class <span className="text-red-500">*</span>
              </label>
              <select
                value={cadreClass}
                onChange={(e) => setCadreClass(e.target.value as any)}
                className="input text-xs font-semibold"
              >
                <option value="Class-1">Class-1</option>
                <option value="Class-2">Class-2</option>
                <option value="Class-3">Class-3</option>
                <option value="Class-4">Class-4</option>
              </select>
            </div>

            <div>
              <label className="label text-slate-700 dark:text-slate-300">
                7th Pay Scale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={payScale}
                onChange={(e) => setPayScale(e.target.value)}
                className="input font-mono text-xs"
                placeholder="e.g. 25500-81100"
                required
              />
            </div>

            <div>
              <label className="label text-slate-700 dark:text-slate-300">
                Min Basic Pay
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={minPay}
                  onChange={(e) => setMinPay(parseInt(e.target.value, 10) || 0)}
                  className="input pl-7 font-mono text-xs"
                  placeholder="25500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label text-slate-700 dark:text-slate-300">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="input text-xs font-gujSans"
                placeholder="e.g. State Service, Subordinate Service, etc."
              />
            </div>

            {item && (
              <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="sync-existing"
                  checked={syncExistingPositions}
                  onChange={(e) => setSyncExistingPositions(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sync-existing" className="text-xs text-blue-900 dark:text-blue-200 font-medium cursor-pointer">
                  Sync all existing positions holding this post to updated pay scale ({payScale}) and cadre class ({cadreClass})
                </label>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-4 pb-safe pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn btn-secondary text-xs px-4 py-2 justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary text-xs font-bold px-5 py-2 flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={14} /> {item ? 'Save Changes' : 'Add Post'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

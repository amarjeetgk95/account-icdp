import { useState, useRef, useCallback } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Plus,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGRMetadata } from '../hooks/useGRMetadata';
import { grDocumentStorage } from '../services/grDocumentStorage.service';
import { GRModal } from './GRModal';
import { MAX_PDF_SIZE_MB } from '../constants';
import type { GRFormData, GRRecord } from '../types';

interface GRFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: GRFormData, onProgress?: (percent: number) => void) => Promise<void>;
  initialData?: GRRecord | null;
  mode: 'add' | 'edit';
  isSubmitting?: boolean;
}

export function GRFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  isSubmitting = false,
}: GRFormModalProps) {
  const { departments, documentTypes, categories, getSubcategoriesForCategory } =
    useGRMetadata();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [grNumber, setGrNumber] = useState('');
  const [title, setTitle] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('DOC-01');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const availableSubcategories = getSubcategoriesForCategory(categoryId);

  // Populate the form when the modal opens. Keyed on open state + record identity so
  // metadata queries resolving in the background never reset user input.
  const initialId = initialData?.id ?? null;
  const openKey = isOpen ? `${mode}:${initialId ?? 'new'}` : null;
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey) {
      if (mode === 'edit' && initialData) {
        setGrNumber(initialData.gr_number || '');
        setTitle(initialData.title || '');
        setDocumentTypeId(initialData.document_type_id || 'DOC-01');
        setDepartmentId(initialData.department_id || '');
        setCategoryId(initialData.category_id || '');
        setSubcategoryId(initialData.subcategory_id || '');
        setIssueDate(initialData.issue_date || '');
        setDescription(initialData.description || '');
        setKeywords(initialData.keywords || []);
        setSelectedFile(null);
      } else {
        setGrNumber('');
        setTitle('');
        setDocumentTypeId('DOC-01');
        setDepartmentId('');
        setCategoryId('');
        setSubcategoryId('');
        setIssueDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setKeywords([]);
        setSelectedFile(null);
      }

      setKeywordInput('');
      setErrors({});
      setUploadProgress(null);
      setIsDragOver(false);
    }
  }

  // Fill in sensible defaults once the taxonomy metadata is available (add mode only),
  // without clobbering anything the user has already chosen.
  if (isOpen && mode === 'add') {
    if (!departmentId && departments.length > 0) {
      setDepartmentId(departments[0].id);
    }
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }

  // When the active category changes, pick a valid subcategory for it.
  if (isOpen && categoryId) {
    const validSubs = getSubcategoriesForCategory(categoryId);
    if (subcategoryId && !validSubs.some((s) => s.id === subcategoryId)) {
      setSubcategoryId('');
    }
  }

  const handleAddKeyword = () => {
    const clean = keywordInput.trim();
    if (!clean) return;
    if (!keywords.includes(clean)) {
      setKeywords((prev) => [...prev, clean]);
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (tagToRemove: string) => {
    setKeywords((prev) => prev.filter((k) => k !== tagToRemove));
  };

  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = await grDocumentStorage.validatePdfFile(file, file.name);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, file: validation.error || 'Invalid PDF document.' }));
      setSelectedFile(null);
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
    setSelectedFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!grNumber.trim()) errs.grNumber = 'GR Number is required.';
    if (!title.trim()) errs.title = 'Title / Subject is required.';
    if (!documentTypeId) errs.documentTypeId = 'Document Type is required.';
    if (!categoryId) errs.categoryId = 'Category is required.';
    if (mode === 'add' && !selectedFile) {
      errs.file = 'A PDF document is required for new GR records.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    const formData: GRFormData = {
      gr_number: grNumber.trim(),
      title: title.trim(),
      document_type_id: documentTypeId,
      department_id: departmentId || undefined,
      category_id: categoryId || undefined,
      subcategory_id: subcategoryId || undefined,
      issue_date: issueDate || undefined,
      description: description.trim() || undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      visibility: 'public',
      file: selectedFile,
    };

    try {
      setErrors({});
      setUploadProgress(mode === 'add' ? 5 : null);
      await onSubmit(formData, (percent) => setUploadProgress(percent));
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save GR record.';
      setErrors((prev) => ({ ...prev, submit: errorMsg }));
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <GRModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      maxHeightClass="max-h-[92vh]"
      ariaLabelledBy="gr-form-modal-title"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <h2 id="gr-form-modal-title" className="text-xs font-bold text-slate-900 dark:text-white">
              {mode === 'add' ? 'Add New Government Resolution' : 'Edit Government Resolution'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'add'
                ? 'Upload and classify a resolution or official circular'
                : `Editing record: ${initialData?.gr_number}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
        {errors.submit && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <span>{errors.submit}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="grNumber" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              GR / Document Number <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="grNumber"
              value={grNumber}
              onChange={(e) => setGrNumber(e.target.value)}
              placeholder="e.g. MSB-102026-104-V"
              className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800/40"
            />
            {errors.grNumber && <p className="text-xs text-rose-500">{errors.grNumber}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documentType" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Document Type (દસ્તાવેજનો પ્રકાર) <span className="text-rose-500">*</span>
            </Label>
            <select
              id="documentType"
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
              className="w-full h-9 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {documentTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.id}: {dt.name_en} ({dt.name_gu})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Subject / Title (વિષય / શીર્ષક) <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Regarding subsidy for procurement of milk testing kits under ICDP..."
            className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800/40"
          />
          {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="department" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Department (વિભાગ)
            </Label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full h-9 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Category (મુખ્ય વર્ગ) <span className="text-rose-500">*</span>
            </Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-9 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}: {c.name_en} ({c.name_gu})
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subcategory" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Subcategory (પેટા વર્ગ)
            </Label>
            <select
              id="subcategory"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={availableSubcategories.length === 0}
              className="w-full h-9 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">-- Select Subcategory --</option>
              {availableSubcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}: {s.name_en} ({s.name_gu})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="issueDate" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Issue Date (તારીખ)
            </Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keywords" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Tag size={12} /> Keywords / Tags (શોધ માટેના કીવર્ડ્સ)
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="e.g. DBT, AI, Grass, Chaff Cutter"
                className="h-9 text-xs bg-slate-50/50 dark:bg-slate-800/40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddKeyword}
                className="h-9 px-2.5 text-xs"
              >
                <Plus size={14} /> Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(tag)}
                      className="text-indigo-400 hover:text-indigo-600"
                      aria-label={`Remove keyword ${tag}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Description & Circular Notes (વિગત / નોંધ)
          </Label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add key highlights, circular references, or implementation notes..."
            className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {(mode === 'add' || selectedFile) && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              PDF Document <span className="text-rose-500">*</span>
            </Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/40 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => void handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for upload
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag & Drop your GR PDF file here, or{' '}
                      <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      PDF format only • Max file size: {MAX_PDF_SIZE_MB}MB
                    </p>
                  </div>
                </>
              )}
            </div>
            {errors.file && <p className="text-xs text-rose-500">{errors.file}</p>}
          </div>
        )}

        {uploadProgress !== null && (
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Uploading document...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </form>

      <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
          className="text-xs font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="mr-1.5 animate-spin" /> Saving...
            </>
          ) : mode === 'add' ? (
            'Upload & Create GR'
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </GRModal>
  );
}

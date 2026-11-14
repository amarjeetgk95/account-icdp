import { useState, useMemo, useCallback } from 'react';
import { Plus, FileText, Settings, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGRList } from '../hooks/useGRList';
import { useGRMetadata } from '../hooks/useGRMetadata';
import { useGRMutations } from '../hooks/useGRMutations';
import { grAuditService } from '../services/grAudit.service';
import { downloadGRDocument } from '../utils/download';
import { GRFilters } from './GRFilters';
import { GRTable } from './GRTable';
import { GRCardList } from './GRCardList';
import { GRPagination } from './GRPagination';
import { PDFViewerModal } from './PDFViewerModal';
import { GRDetailsModal } from './GRDetailsModal';
import { GRFormModal } from './GRFormModal';
import { GRReplacePdfModal } from './GRReplacePdfModal';
import { GRDeleteDialog } from './GRDeleteDialog';
import { GRAuditTrailModal } from './GRAuditTrailModal';
import { GRMasterSettingsModal } from './GRMasterSettingsModal';
import type { GRRecord, GRAuditLog, GRFormData } from '../types';

type ActiveModal =
  | 'details'
  | 'preview'
  | 'add'
  | 'edit'
  | 'replace'
  | 'delete'
  | 'audit'
  | null;

export function GRListPage() {
  const { toast } = useToast();
  const [isMasterSettingsOpen, setIsMasterSettingsOpen] = useState(false);
  const { departments, documentTypes, categories, getSubcategoriesForCategory, getDocumentTypeLabel } =
    useGRMetadata();

  const {
    records,
    pagination,
    filters,
    isLoading,
    error,
    setFilterField,
    resetFilters,
    setPage,
    setPageSize,
    refetch,
  } = useGRList();

  const {
    createGR,
    isCreating,
    updateGR,
    isUpdating,
    replacePDF,
    isReplacingPDF,
    archiveGR,
    restoreGR,
    deleteGR,
    isDeleting,
  } = useGRMutations();

  const [selectedGR, setSelectedGR] = useState<GRRecord | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [auditLogs, setAuditLogs] = useState<GRAuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear + 1; y >= 2010; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const filterSubcategories = useMemo(
    () => getSubcategoriesForCategory(filters.categoryId),
    [filters.categoryId, getSubcategoriesForCategory]
  );

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedGR(null);
  }, []);

  const handleCategoryFilterChange = (categoryId: string) => {
    setFilterField('categoryId', categoryId);
    setFilterField('subcategoryId', 'all');
  };

  const handleOpenPreview = (gr: GRRecord) => {
    setSelectedGR(gr);
    setActiveModal('preview');
  };

  const handleOpenDetails = (gr: GRRecord) => {
    setSelectedGR(gr);
    setActiveModal('details');
  };

  const handleOpenAdd = () => {
    setSelectedGR(null);
    setActiveModal('add');
  };

  const handleOpenEdit = (gr: GRRecord) => {
    setSelectedGR(gr);
    setActiveModal('edit');
  };

  const handleOpenReplace = (gr: GRRecord) => {
    setSelectedGR(gr);
    setActiveModal('replace');
  };

  const handleOpenDelete = (gr: GRRecord) => {
    setSelectedGR(gr);
    setActiveModal('delete');
  };

  const handleOpenAudit = async (gr?: GRRecord) => {
    const target = gr || selectedGR;
    setSelectedGR(target);
    setActiveModal('audit');
    setIsAuditLoading(true);
    try {
      setAuditLogs(await grAuditService.fetchAuditLogs(target?.id));
    } catch (err) {
      console.warn('[GRListPage] Could not load audit logs:', err);
      setAuditLogs([]);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleDownloadPdf = async (gr: GRRecord) => {
    try {
      await downloadGRDocument(gr);
    } catch (err) {
      toast({
        title: 'Download Failed',
        description:
          err instanceof Error ? err.message : 'Could not download this document.',
        variant: 'destructive',
      });
    }
  };

  const handleFormSubmit = async (
    formData: GRFormData,
    onProgress?: (percent: number) => void
  ) => {
    if (activeModal === 'add') {
      await createGR({ formData, onProgress });
    } else if (activeModal === 'edit' && selectedGR) {
      await updateGR({ id: selectedGR.id, formData });
    }
  };

  const handleReplaceSubmit = async (
    newFile: File,
    onProgress?: (percent: number) => void
  ) => {
    if (!selectedGR) return;
    await replacePDF({ id: selectedGR.id, newFile, onProgress });
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGR) return;
    await deleteGR(selectedGR.id);
    closeModal();
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <GRFilters
        filters={filters}
        onFilterChange={setFilterField}
        onCategoryChange={handleCategoryFilterChange}
        onReset={resetFilters}
        departments={departments}
        documentTypes={documentTypes}
        categories={categories}
        subcategories={filterSubcategories}
        years={years}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsMasterSettingsOpen(true)}
              className="font-semibold text-xs h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Settings size={13} className="mr-1.5 text-slate-500" /> Taxonomy Settings
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm h-9 px-3.5"
            >
              <Plus size={14} className="mr-1.5" /> Add New GR
            </Button>
          </>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-xs font-semibold">Loading Government Resolutions...</p>
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Could not load the repository
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error instanceof Error ? error.message : 'An unexpected error occurred.'}
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="text-xs">
              Try Again
            </Button>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <FileText size={28} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">No GRs found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Try changing your search keywords or filter criteria to find the resolution you are
              looking for.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={resetFilters} className="text-xs">
                Reset Filters
              </Button>
              <Button size="sm" onClick={handleOpenAdd} className="text-xs bg-indigo-600 text-white">
                <Plus size={13} className="mr-1.5" /> Add New GR
              </Button>
            </div>
          </div>
        ) : (
          <>
            <GRTable
              records={records}
              getDocumentTypeLabel={getDocumentTypeLabel}
              onPreview={handleOpenPreview}
              onDownload={(gr) => void handleDownloadPdf(gr)}
              onDetails={handleOpenDetails}
              onEdit={handleOpenEdit}
              onReplace={handleOpenReplace}
              onDelete={handleOpenDelete}
            />

            <GRCardList
              records={records}
              getDocumentTypeLabel={getDocumentTypeLabel}
              onPreview={handleOpenPreview}
              onDownload={(gr) => void handleDownloadPdf(gr)}
              onDetails={handleOpenDetails}
              onEdit={handleOpenEdit}
            />

            <GRPagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      <PDFViewerModal
        isOpen={activeModal === 'preview'}
        onClose={closeModal}
        gr={selectedGR}
      />

      <GRDetailsModal
        isOpen={activeModal === 'details'}
        onClose={closeModal}
        gr={selectedGR}
        onPreview={handleOpenPreview}
        onDownload={(gr) => void handleDownloadPdf(gr)}
        onEdit={handleOpenEdit}
        onReplacePdf={handleOpenReplace}
        onArchive={async (gr) => {
          await archiveGR(gr.id);
          closeModal();
        }}
        onRestore={async (gr) => {
          await restoreGR(gr.id);
          closeModal();
        }}
        onDelete={handleOpenDelete}
        onViewAudit={handleOpenAudit}
      />

      <GRFormModal
        isOpen={activeModal === 'add' || activeModal === 'edit'}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={selectedGR}
        mode={activeModal === 'edit' ? 'edit' : 'add'}
        isSubmitting={isCreating || isUpdating}
      />

      <GRReplacePdfModal
        isOpen={activeModal === 'replace'}
        onClose={closeModal}
        onReplace={handleReplaceSubmit}
        gr={selectedGR}
        isReplacing={isReplacingPDF}
      />

      <GRDeleteDialog
        isOpen={activeModal === 'delete'}
        onClose={closeModal}
        onConfirm={handleDeleteConfirm}
        gr={selectedGR}
        isDeleting={isDeleting}
      />

      <GRAuditTrailModal
        isOpen={activeModal === 'audit'}
        onClose={closeModal}
        logs={auditLogs}
        grNumber={selectedGR?.gr_number}
        isLoading={isAuditLoading}
      />

      <GRMasterSettingsModal
        isOpen={isMasterSettingsOpen}
        onClose={() => setIsMasterSettingsOpen(false)}
      />
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { UnifiedPdfStudio } from '../components/UnifiedPdfStudio';

export const PdfEditorPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in pb-12">
      {/* Top Main Navigation Header */}
      <PdfToolsNavHeader
        title="All-in-One PDF Workbench"
        subtitle="Merge, split, images-to-PDF, rotate, reorder, compress & watermark on a single visual canvas"
        badge="Pure Client-Side Engine"
        showBack={false}
        actions={
          <button
            type="button"
            onClick={() => navigate('/pdf-tools/ocr')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Open OCR Document Studio &rarr;</span>
          </button>
        }
      />

      {/* Unified All-In-One Studio Canvas Workspace */}
      <UnifiedPdfStudio />
    </div>
  );
};

export default PdfEditorPage;

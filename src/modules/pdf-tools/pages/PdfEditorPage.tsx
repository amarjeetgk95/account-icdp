import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Merge,
  Split,
  RotateCw,
  Minimize2,
  Stamp,
  Images,
  Image as ImageIcon,
  Languages,
  FileSpreadsheet,
} from 'lucide-react';
import { PdfToolsNavHeader } from '../components/PdfToolsNavHeader';
import { PdfMergePage } from './PdfMergePage';
import { PdfSplitPage } from './PdfSplitPage';
import { PdfOrganizePage } from './PdfOrganizePage';
import { PdfCompressPage } from './PdfCompressPage';
import { PdfWatermarkPage } from './PdfWatermarkPage';
import { ImagesToPdfPage } from './ImagesToPdfPage';
import { PdfToImagesPage } from './PdfToImagesPage';
import { PdfTextExtractPage } from './PdfTextExtractPage';

export type PdfEditorToolId =
  | 'merge'
  | 'split'
  | 'organize'
  | 'compress'
  | 'watermark'
  | 'img-to-pdf'
  | 'pdf-to-img'
  | 'text';

interface ToolDef {
  id: PdfEditorToolId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  color: string;
}

const TOOLS: ToolDef[] = [
  {
    id: 'merge',
    label: 'Merge PDFs',
    shortLabel: 'Merge',
    icon: Merge,
    description: 'Combine multiple PDF files with visual drag-and-drop ordering',
    badge: 'Combine',
    color: 'hover:border-blue-500 text-blue-600',
  },
  {
    id: 'split',
    label: 'Split & Extract',
    shortLabel: 'Split',
    icon: Split,
    description: 'Extract custom page ranges or burst pages to a ZIP archive',
    badge: 'Extract',
    color: 'hover:border-cyan-500 text-cyan-600',
  },
  {
    id: 'organize',
    label: 'Rotate & Organize',
    shortLabel: 'Organize',
    icon: RotateCw,
    description: 'Rotate individual pages 90°/180°, reorder, and delete pages',
    badge: 'Reorder',
    color: 'hover:border-amber-500 text-amber-600',
  },
  {
    id: 'compress',
    label: 'Compress PDF',
    shortLabel: 'Compress',
    icon: Minimize2,
    description: 'Reduce file size for strict government portal uploads with % savings',
    badge: '<200KB',
    color: 'hover:border-rose-500 text-rose-600',
  },
  {
    id: 'watermark',
    label: 'Watermark & Stamp',
    shortLabel: 'Watermark',
    icon: Stamp,
    description: 'Add custom security watermarks (CONFIDENTIAL, સત્તાવાર નકલ)',
    badge: 'Security',
    color: 'hover:border-orange-500 text-orange-600',
  },
  {
    id: 'img-to-pdf',
    label: 'Images to PDF',
    shortLabel: 'Images → PDF',
    icon: Images,
    description: 'Combine scans, receipts, and JPG/PNG images into a single clean PDF',
    badge: 'Batch',
    color: 'hover:border-teal-500 text-teal-600',
  },
  {
    id: 'pdf-to-img',
    label: 'PDF to Images',
    shortLabel: 'PDF → Images',
    icon: ImageIcon,
    description: 'Export PDF pages to high-resolution PNG or JPEG images (150/300 DPI)',
    badge: '300 DPI',
    color: 'hover:border-sky-500 text-sky-600',
  },
  {
    id: 'text',
    label: 'Searchable Text',
    shortLabel: 'Text Extract',
    icon: Languages,
    description: 'Extract searchable Gujarati & English raw text and markdown streams',
    badge: 'Bilingual',
    color: 'hover:border-purple-500 text-purple-600',
  },
];

export const PdfEditorPage: React.FC = () => {
  const { tool: routeTool } = useParams<{ tool: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tool from URL path (e.g. /pdf-tools/merge or /pdf-tools/editor/split)
  const getToolFromPath = (): PdfEditorToolId => {
    if (routeTool && TOOLS.some((t) => t.id === routeTool)) {
      return routeTool as PdfEditorToolId;
    }
    const pathSegment = location.pathname.split('/').pop();
    if (pathSegment && TOOLS.some((t) => t.id === pathSegment)) {
      return pathSegment as PdfEditorToolId;
    }
    return 'merge';
  };

  const [activeTool, setActiveTool] = useState<PdfEditorToolId>(getToolFromPath());

  useEffect(() => {
    setActiveTool(getToolFromPath());
  }, [location.pathname, routeTool]);

  const handleSelectTool = (toolId: PdfEditorToolId) => {
    setActiveTool(toolId);
    navigate(`/pdf-tools/${toolId}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in pb-12">
      {/* Top Main Navigation Header */}
      <PdfToolsNavHeader
        title="PDF Editor & Utilities Studio"
        subtitle="All-in-one suite for PDF merging, splitting, page organization, compression & image conversion"
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

      {/* Unified Tool Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TOOLS.map((tool) => {
            const IconComp = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSelectTool(tool.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <IconComp size={15} className={isActive ? 'text-indigo-400 dark:text-indigo-600' : ''} />
                <span>{tool.label}</span>
                {tool.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                      isActive
                        ? 'bg-slate-700 dark:bg-slate-200 text-slate-100 dark:text-slate-800'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sub-Tool Rendering Area */}
      <div className="animate-in fade-in transition-all">
        {activeTool === 'merge' && <PdfMergePage showHeader={false} />}
        {activeTool === 'split' && <PdfSplitPage showHeader={false} />}
        {activeTool === 'organize' && <PdfOrganizePage showHeader={false} />}
        {activeTool === 'compress' && <PdfCompressPage showHeader={false} />}
        {activeTool === 'watermark' && <PdfWatermarkPage showHeader={false} />}
        {activeTool === 'img-to-pdf' && <ImagesToPdfPage showHeader={false} />}
        {activeTool === 'pdf-to-img' && <PdfToImagesPage showHeader={false} />}
        {activeTool === 'text' && <PdfTextExtractPage showHeader={false} />}
      </div>
    </div>
  );
};

export default PdfEditorPage;

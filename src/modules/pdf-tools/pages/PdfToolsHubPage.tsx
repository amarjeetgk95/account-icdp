import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Cpu,
  Merge,
  Split,
  RotateCw,
  Minimize2,
  Stamp,
  Image as ImageIcon,
  Images,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Languages,
  Layers,
  FileCode2,
} from 'lucide-react';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { useUIStore } from '@/core/stores/ui-store';

interface ToolCardItem {
  id: string;
  title: string;
  description: string;
  path: string;
  category: 'ocr' | 'management' | 'conversion';
  icon: React.ElementType;
  badge?: string;
  accentColor: string;
  iconBg: string;
  tags: string[];
}

const PDF_TOOLS: ToolCardItem[] = [
  // 1. OCR & Intelligence
  {
    id: 'ocr-studio',
    title: 'OCR Document Studio',
    description: 'Extract and edit documents directly into Editable Word (.docx) and Editable Excel (.xlsx) with bilingual Gujarati & English OCR.',
    path: '/pdf-tools/ocr',
    category: 'ocr',
    icon: FileSpreadsheet,
    badge: 'Word & Excel',
    accentColor: 'border-emerald-500/30 hover:border-emerald-500 text-emerald-600',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    tags: ['Word', 'Excel', 'Editable', 'PaddleOCR', 'Gujarati', 'English'],
  },
  {
    id: 'text-extractor',
    title: 'Gujarati & English Text Extractor',
    description: 'Instant searchable text stream extraction from scanned government orders, circulars, and resolution PDFs.',
    path: '/pdf-tools/text',
    category: 'ocr',
    icon: Languages,
    badge: 'Dual Lang',
    accentColor: 'border-purple-500/30 hover:border-purple-500 text-purple-600',
    iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    tags: ['Gujarati', 'English', 'Raw Text', 'Markdown', 'Search'],
  },
  {
    id: 'ocr-workbench',
    title: 'Interactive OCR Workbench',
    description: 'Split-screen multi-page editor with region crop re-OCR, cell locking, low-confidence review, and undo/redo.',
    path: '/pdf-tools/workbench',
    category: 'ocr',
    icon: Cpu,
    badge: 'Pro Editor',
    accentColor: 'border-indigo-500/30 hover:border-indigo-500 text-indigo-600',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    tags: ['Editor', 'Crop Re-OCR', 'History', 'Diagnostics'],
  },

  // 2. Page & Document Management
  {
    id: 'merge-pdf',
    title: 'Merge PDFs',
    description: 'Combine multiple PDF files into a single unified document with visual drag-and-drop reordering.',
    path: '/pdf-tools/merge',
    category: 'management',
    icon: Merge,
    badge: 'Fast',
    accentColor: 'border-blue-500/30 hover:border-blue-500 text-blue-600',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    tags: ['Combine', 'Reorder', 'Batch', 'Client-side'],
  },
  {
    id: 'split-pdf',
    title: 'Split & Extract Pages',
    description: 'Select individual pages or define page ranges (e.g. 1-3, 5, 8) to extract as a new PDF or download as ZIP.',
    path: '/pdf-tools/split',
    category: 'management',
    icon: Split,
    badge: 'Precision',
    accentColor: 'border-cyan-500/30 hover:border-cyan-500 text-cyan-600',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400',
    tags: ['Extract', 'Page Ranges', 'ZIP Export', 'Thumbnails'],
  },
  {
    id: 'organize-pdf',
    title: 'Rotate & Organize Pages',
    description: 'Rotate individual pages 90°/180°, delete unwanted pages, and reorder document structure visually.',
    path: '/pdf-tools/organize',
    category: 'management',
    icon: RotateCw,
    badge: 'Interactive',
    accentColor: 'border-amber-500/30 hover:border-amber-500 text-amber-600',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    tags: ['Rotate', 'Delete Pages', 'Visual Grid'],
  },

  // 3. Optimization, Conversion & Security
  {
    id: 'compress-pdf',
    title: 'Compress & Optimize PDF',
    description: 'Reduce PDF file size for strict government portal uploads (IFMS, e-Guj, Municipal portals) with % savings.',
    path: '/pdf-tools/compress',
    category: 'conversion',
    icon: Minimize2,
    badge: 'Size Saver',
    accentColor: 'border-rose-500/30 hover:border-rose-500 text-rose-600',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
    tags: ['Optimize', 'Portals', '<200KB', 'High Compression'],
  },
  {
    id: 'watermark-pdf',
    title: 'Watermark & Stamp PDF',
    description: 'Add custom security watermarks (CONFIDENTIAL, APPROVED, સત્તાવાર નકલ) with live preview and color controls.',
    path: '/pdf-tools/watermark',
    category: 'conversion',
    icon: Stamp,
    badge: 'Security',
    accentColor: 'border-orange-500/30 hover:border-orange-500 text-orange-600',
    iconBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400',
    tags: ['Watermark', 'Stamp', 'Gujarati/English', 'Diagonal'],
  },
  {
    id: 'images-to-pdf',
    title: 'Images to PDF',
    description: 'Combine multiple scanned receipts, bills, and voucher images (PNG, JPG, WebP) into a clean multi-page PDF.',
    path: '/pdf-tools/img-to-pdf',
    category: 'conversion',
    icon: Images,
    badge: 'Scanner',
    accentColor: 'border-teal-500/30 hover:border-teal-500 text-teal-600',
    iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
    tags: ['Scans', 'Vouchers', 'A4 Fit', 'Batch Images'],
  },
  {
    id: 'pdf-to-images',
    title: 'PDF to High-Res Images',
    description: 'Convert PDF pages to crystal clear PNG / JPEG images at 150/300 DPI with single-page or ZIP batch download.',
    path: '/pdf-tools/pdf-to-img',
    category: 'conversion',
    icon: ImageIcon,
    badge: '300 DPI',
    accentColor: 'border-sky-500/30 hover:border-sky-500 text-sky-600',
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
    tags: ['PNG', 'JPEG', 'High Def', 'ZIP'],
  },
];

export const PdfToolsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ocr' | 'management' | 'conversion'>('all');

  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  // Filter tools based on search and category
  const filteredTools = PDF_TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12">
      {/* Top Main Workspace Header */}
      <WorkspaceHeader
        eyebrow="Government Document Intelligence &amp; PDF Operations &bull; ICDP Surat"
        title="OCR &amp; PDF Tools Studio"
        context={
          <>
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Secure In-Browser &amp; PaddleOCR Architecture</span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span>FY {fyLabel}</span>
          </>
        }
      />

      {/* Hero Banner with Search & Filters */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-md border border-indigo-950/50">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles size={13} />
            <span>Modernised PDF Intelligence Suite</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Transform, Extract &amp; Manage Government Documents
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            All-in-one suite for bilingual OCR (Gujarati &amp; English), 2D spatial table reconstruction to Excel, and client-side PDF utilities without unnecessary processing overhead.
          </p>

          {/* Search Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name, action (e.g. 'Excel', 'Merge', 'Rotate', 'Watermark', 'Gujarati')..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-xs"
              />
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white px-3 py-2"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategory === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Layers size={14} />
          All Tools ({PDF_TOOLS.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('ocr')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategory === 'ocr'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <FileSpreadsheet size={14} />
          OCR &amp; Intelligence
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('management')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategory === 'management'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Merge size={14} />
          Page &amp; Document Management
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('conversion')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategory === 'conversion'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Minimize2 size={14} />
          Optimization &amp; Conversion
        </button>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {filteredTools.map((tool) => {
          const IconComp = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => navigate(tool.path)}
              className={`group bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${tool.accentColor}`}
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tool.iconBg} transition-transform group-hover:scale-110 duration-200`}>
                    <IconComp size={22} />
                  </div>
                  {tool.badge && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {tool.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  {tool.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Open</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search size={22} />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            No tools found matching "{searchQuery}"
          </h3>
          <p className="text-xs text-slate-500">
            Try a different search keyword or select 'All Tools'.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Quick Tips & Architecture Info */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
            <FileCode2 size={18} />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Government Document Intelligence Compliance
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Standardized for Gujarat State Government circulars, Pay Bills, GTR-30 vouchers, and tax assessment orders with full UTF-8 Unicode Gujarati support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/pdf-tools/ocr')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            Launch OCR Studio
          </button>
          <button
            type="button"
            onClick={() => navigate('/pdf-tools/merge')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
          >
            Merge PDFs
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfToolsHubPage;

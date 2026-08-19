import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PdfEditorPage = lazyNamedExport(() => import('./pages/PdfEditorPage'), 'PdfEditorPage');
const PdfToolsPage = lazyNamedExport(() => import('./pages/PdfToolsPage'), 'PdfToolsPage');

export const pdfToolsRoutes: RouteDefinition[] = [
  // Primary Dedicated Section 1: OCR Document Studio (Editable Word & Excel)
  { path: '/pdf-tools/ocr', element: <PdfToolsPage /> },
  { path: '/pdf-tools/excel', element: <PdfToolsPage /> },
  { path: '/pdf-tools/word', element: <PdfToolsPage /> },

  // Primary Dedicated Section 2: Unified PDF Editor & Utilities
  { path: '/pdf-tools', element: <PdfEditorPage /> },
  { path: '/pdf-tools/editor', element: <PdfEditorPage /> },
  { path: '/pdf-tools/editor/:tool', element: <PdfEditorPage /> },

  // Sub-routes for specific editing operations seamlessly handled by unified editor
  { path: '/pdf-tools/merge', element: <PdfEditorPage /> },
  { path: '/pdf-tools/split', element: <PdfEditorPage /> },
  { path: '/pdf-tools/organize', element: <PdfEditorPage /> },
  { path: '/pdf-tools/compress', element: <PdfEditorPage /> },
  { path: '/pdf-tools/watermark', element: <PdfEditorPage /> },
  { path: '/pdf-tools/img-to-pdf', element: <PdfEditorPage /> },
  { path: '/pdf-tools/pdf-to-img', element: <PdfEditorPage /> },
  { path: '/pdf-tools/text', element: <PdfEditorPage /> },
];


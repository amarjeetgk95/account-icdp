import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const PdfToolsHubPage = lazyNamedExport(() => import('./pages/PdfToolsHubPage'), 'PdfToolsHubPage');
const PdfToolsPage = lazyNamedExport(() => import('./pages/PdfToolsPage'), 'PdfToolsPage');
const PdfMergePage = lazyNamedExport(() => import('./pages/PdfMergePage'), 'PdfMergePage');
const PdfSplitPage = lazyNamedExport(() => import('./pages/PdfSplitPage'), 'PdfSplitPage');
const PdfOrganizePage = lazyNamedExport(() => import('./pages/PdfOrganizePage'), 'PdfOrganizePage');
const PdfWatermarkPage = lazyNamedExport(() => import('./pages/PdfWatermarkPage'), 'PdfWatermarkPage');
const PdfCompressPage = lazyNamedExport(() => import('./pages/PdfCompressPage'), 'PdfCompressPage');
const ImagesToPdfPage = lazyNamedExport(() => import('./pages/ImagesToPdfPage'), 'ImagesToPdfPage');
const PdfToImagesPage = lazyNamedExport(() => import('./pages/PdfToImagesPage'), 'PdfToImagesPage');
const PdfTextExtractPage = lazyNamedExport(() => import('./pages/PdfTextExtractPage'), 'PdfTextExtractPage');

export const pdfToolsRoutes: RouteDefinition[] = [
  // Hub Directory
  { path: '/pdf-tools', element: <PdfToolsHubPage /> },

  // Pure PDF Manipulation Tools (pdf-lib & pdfjs)
  { path: '/pdf-tools/merge', element: <PdfMergePage /> },
  { path: '/pdf-tools/split', element: <PdfSplitPage /> },
  { path: '/pdf-tools/organize', element: <PdfOrganizePage /> },
  { path: '/pdf-tools/compress', element: <PdfCompressPage /> },
  { path: '/pdf-tools/watermark', element: <PdfWatermarkPage /> },
  { path: '/pdf-tools/img-to-pdf', element: <ImagesToPdfPage /> },
  { path: '/pdf-tools/pdf-to-img', element: <PdfToImagesPage /> },

  // OCR & Document Intelligence Tools
  { path: '/pdf-tools/text', element: <PdfTextExtractPage /> },
  { path: '/pdf-tools/ocr', element: <PdfToolsPage /> },
  { path: '/pdf-tools/excel', element: <PdfToolsPage /> },
  { path: '/pdf-tools/word', element: <PdfToolsPage /> },
  { path: '/pdf-tools/workbench', element: <PdfToolsPage /> },
  { path: '/pdf-tools/:tab', element: <PdfToolsPage /> },
];

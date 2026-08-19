import type { ModuleDefinition } from '@/shared/types/module';
import { pdfToolsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'pdf-tools',
  name: 'OCR & PDF Tools',
  icon: 'scan-text',
  navGroup: 'tools',
  permissions: ['office'],
  routes: pdfToolsRoutes,
  sidebar: true,
  featureFlag: 'pdf_tools_module',
  order: 2,
  children: [
    { path: '/pdf-tools', label: 'PDF Tools Hub', icon: 'layers', subtitle: 'All-in-one PDF & OCR directory' },
    { path: '/pdf-tools/ocr', label: 'OCR Document Studio', icon: 'file-spreadsheet', subtitle: 'Extract 2D tables & documents to Excel/Word' },
    { path: '/pdf-tools/text', label: 'Gujarati & English Text', icon: 'languages', subtitle: 'Searchable bilingual text extractor' },
    { path: '/pdf-tools/merge', label: 'Merge PDFs', icon: 'merge', subtitle: 'Combine multiple PDF files' },
    { path: '/pdf-tools/split', label: 'Split & Extract', icon: 'split', subtitle: 'Extract page ranges or burst to ZIP' },
    { path: '/pdf-tools/organize', label: 'Rotate & Organize', icon: 'rotate-cw', subtitle: 'Rotate, reorder, and delete pages' },
    { path: '/pdf-tools/compress', label: 'Compress PDF', icon: 'minimize-2', subtitle: 'Reduce file size for portal upload' },
    { path: '/pdf-tools/watermark', label: 'Watermark & Stamp', icon: 'stamp', subtitle: 'Security stamps and official marks' },
    { path: '/pdf-tools/img-to-pdf', label: 'Images to PDF', icon: 'images', subtitle: 'Combine scans and receipts to PDF' },
    { path: '/pdf-tools/pdf-to-img', label: 'PDF to Images', icon: 'image', subtitle: 'Extract high-res PNG/JPEG pages' },
  ],
};

export default moduleDefinition;

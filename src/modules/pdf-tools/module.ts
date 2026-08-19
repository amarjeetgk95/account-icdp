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
    { path: '/pdf-tools/ocr', label: 'OCR Document Studio', icon: 'file-spreadsheet', subtitle: 'Bilingual OCR to Editable Word & Excel' },
    { path: '/pdf-tools/editor', label: 'PDF Editor & Utilities', icon: 'layers', subtitle: 'Merge, Split, Organize, Compress & Convert' },
  ],
};

export default moduleDefinition;

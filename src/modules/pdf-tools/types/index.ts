/**
 * PDF Tools & Spatial OCR Extractor Module Types
 */

export * from './spatial.types';

// Backward compatibility aliases
export type OcrLanguage = 'eng' | 'guj' | 'hin' | 'eng+guj' | 'eng+hin';
export type ExtractionMode = 'hybrid' | 'ocr_only' | 'digital_only';
export type OutputFormat = 'docx' | 'xlsx' | 'both';

export interface OcrProgressState {
  stage: 'idle' | 'rendering' | 'preprocessing' | 'ocr' | 'detecting_tables' | 'generating_doc' | 'completed' | 'error';
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  currentMessage: string;
  error?: string;
}

export interface TableDetectionOptions {
  minColumns?: number;
  lineThresholdPx?: number;
  columnGapThresholdPx?: number;
  enableNumericParsing?: boolean;
  detectCurrencySymbols?: boolean;
  detectHeaderRows?: boolean;
  detectTotalRows?: boolean;
  detectMergedHeaders?: boolean;
}

export interface ExtractionOptions {
  mode: ExtractionMode;
  language: OcrLanguage;
  renderScale: number; // e.g. 3.0 to 4.0 for 300-400 DPI
  contrastEnhancement: boolean;
  binarization: boolean;
  tableOptions?: TableDetectionOptions;
}

export interface WordExportOptions {
  documentTitle?: string;
  fontSizePt?: number;
  fontFamily?: string;
  includeTables?: boolean;
  includeParagraphs?: boolean;
  accentColorHex?: string;
  pageBreakBetweenPages?: boolean;
}

export interface ExcelExportOptions {
  workbookTitle?: string;
  sheetPerTable?: boolean;
  sheetPerPage?: boolean;
  includeSummarySheet?: boolean;
  accentColorHex?: string;
  autoFitColumns?: boolean;
  formatNumbers?: boolean;
  preserveMergedCells?: boolean;
}

// Aliases for compatibility
export type ExtractedDocument = import('./spatial.types').SpatialDocument;
export type ExtractedPage = import('./spatial.types').SpatialPage;
export type ExtractedTable = import('./spatial.types').SpatialTable;
export type ExtractedRow = import('./spatial.types').SpatialRow;
export type ExtractedCell = import('./spatial.types').SpatialCell;
export type ExtractedWord = import('./spatial.types').ExtractedElement;
export type ExtractedLine = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: import('./spatial.types').ExtractedElement[];
};
export type ExtractedParagraph = import('./spatial.types').SpatialParagraph;

/**
 * Spatial Layout & Unified Extraction Data Models
 * Core philosophy: Do not simply OCR the PDF into plain text. Reconstruct the document spatially.
 * PDF -> Coordinate-Aware Extraction -> 2D Invisible Grid -> Editable React Document -> Manual Correction -> Validated Model -> Excel
 */

export type ElementSource = 'pdf-text' | 'font-recovered' | 'ocr' | 'paddle-ocr' | 'local-ocr' | 'manual';

export type DataType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'percentage'
  | 'table'
  | 'cell'
  | 'header'
  | 'footer'
  | 'identifier'
  | 'formula'
  | 'empty';

export type BoundingBox = [number, number, number, number]; // [x0, y0, x1, y1]

export interface PhysicalCoordinate {
  x: number;
  y: number;
  width: number;
  height: number;
  bbox: BoundingBox;
}

export interface LogicalGridCoordinate {
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
}

export interface ExtractedElement {
  id: string;
  page: number;
  text: string;
  rawText: string;

  x: number; // Left coordinate in PDF / canvas space
  y: number; // Top coordinate in PDF / canvas space
  width: number;
  height: number;
  bbox: BoundingBox; // [x0, y0, x1, y1]

  source: ElementSource;
  confidence: number; // 0 to 100

  language?: string; // 'guj', 'eng', 'eng+guj', etc.
  fontFamily?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  readingOrder?: number;

  type?: DataType;

  row?: number;
  column?: number;
  rowSpan?: number;
  columnSpan?: number;

  locked?: boolean;
  originalValue?: string;
  currentValue?: string;
}

export interface NormalizedCellData {
  rawText: string;
  normalizedValue: string | number | Date | null;
  type: DataType;
  currencySymbol?: string; // '₹' | 'Rs.' | '$'
  isNegative?: boolean;
  dateFormat?: string;
  confidence: number;
}

export interface SpatialCell {
  id: string;
  pageNumber: number;
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  columnSpan: number;
  bbox: BoundingBox;
  elements: ExtractedElement[];
  text: string;
  originalText?: string;
  data: NormalizedCellData;
  isHeader: boolean;
  isSubHeader: boolean;
  isTotal: boolean;
  isMerged: boolean;
  align: 'left' | 'right' | 'center';
  confidence?: number;
  locked?: boolean;
  source?: ElementSource;
  isModified?: boolean;
}

export interface SpatialRow {
  rowIndex: number;
  cells: SpatialCell[];
  bbox: BoundingBox;
  isHeader: boolean;
  isTotal: boolean;
  baselineY: number;
  height: number;
}

export interface SpatialColumn {
  columnIndex: number;
  x0: number;
  x1: number;
  width: number;
  headerText: string;
  predominantType: DataType;
  align: 'left' | 'right' | 'center';
}

export interface SpatialTable {
  id: string;
  pageNumber: number;
  bbox: BoundingBox;
  columns: SpatialColumn[];
  rows: SpatialRow[];
  cells: SpatialCell[][];
  hasBorders: boolean;
  confidence: number;
  columnCount: number;
  rowCount: number;
}

export interface SpatialParagraph {
  id: string;
  text: string;
  elements: ExtractedElement[];
  bbox: BoundingBox;
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3;
  confidence: number;
}

export interface SpatialPage {
  pageNumber: number;
  width: number;
  height: number;
  dpi: number;
  isScanned: boolean;
  elements: ExtractedElement[];
  tables: SpatialTable[];
  paragraphs: SpatialParagraph[];
  rawText: string;
  confidence: number;
  renderingDurationMs: number;
  ocrDurationMs: number;
  canvasElement?: HTMLCanvasElement;
  thumbnailUrl?: string;
}

export interface SpatialDocument {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  pages: SpatialPage[];
  consolidatedTables: SpatialTable[];
  allText: string;
  overallConfidence: number;
  extractionDurationMs: number;
  engineUsed: string;
  isNativeText: boolean;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: string;
    producer?: string;
    version?: string;
  };
}

export interface ImagePreprocessingConfig {
  dpi: number; // 300 - 400 DPI
  enableGrayscale: boolean;
  enableContrastEnhancement: boolean;
  enableAdaptiveThresholding: boolean;
  enableNoiseRemoval: boolean;
  enableSharpening: boolean;
  enableDeskew: boolean;
}

export interface OcrProcessingOptions {
  language?: 'eng' | 'guj' | 'eng+guj' | 'hin' | 'eng+hin';
  dpi?: number;
  preprocessing?: Partial<ImagePreprocessingConfig>;
  serverUrl?: string;
}

export interface OcrPageResult {
  pageNumber: number;
  width: number;
  height: number;
  elements: ExtractedElement[];
  rawText: string;
  confidence: number;
  engine: string;
  durationMs: number;
}

export interface OcrEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  isAvailable(): Promise<boolean>;
  processPage(
    imageSource: HTMLCanvasElement | Blob | string,
    pageNumber: number,
    options?: OcrProcessingOptions
  ): Promise<OcrPageResult>;
}

export interface VisualDebugOptions {
  showBoundingBoxes: boolean;
  showColumnLanes: boolean;
  showRowBands: boolean;
  showCellOutlines: boolean;
  showConfidenceBadges: boolean;
  showSourceBadges: boolean;
  hoveredCellId?: string | null;
  selectedCellId?: string | null;
}

/**
 * Project Persistence Format for document-project.json
 */
export interface ProjectMetadata {
  version: '1.0.0';
  savedAt: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  engineUsed: string;
  overallConfidence: number;
}

export interface ProjectDocumentData {
  metadata: ProjectMetadata;
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    dpi: number;
    isScanned: boolean;
    confidence: number;
    rawText: string;
    elements: ExtractedElement[];
    tables: SpatialTable[];
    paragraphs: SpatialParagraph[];
  }>;
  consolidatedTables: SpatialTable[];
}

/**
 * Undo / Redo History Types
 */
export type HistoryActionType =
  | 'EDIT_CELL'
  | 'CHANGE_CELL_TYPE'
  | 'LOCK_CELL'
  | 'ADD_ROW'
  | 'DELETE_ROW'
  | 'MOVE_ROW'
  | 'ADD_COLUMN'
  | 'DELETE_COLUMN'
  | 'MOVE_COLUMN'
  | 'MERGE_CELLS'
  | 'SPLIT_CELL'
  | 'SEARCH_REPLACE'
  | 'RE_OCR_REGION';

export interface HistoryEntry {
  action: HistoryActionType;
  description: string;
  timestamp: number;
  snapshot: SpatialDocument;
}

/**
 * Search and Replace Options & Results
 */
export interface SearchReplaceOptions {
  searchQuery: string;
  replaceQuery: string;
  matchCase?: boolean;
  exactMatch?: boolean;
  scope: 'all_pages' | 'current_page' | 'current_table';
  targetPageNumber?: number;
  targetTableId?: string;
}

export interface SearchReplaceResult {
  matchesFound: number;
  replacementsMade: number;
  modifiedCellIds: string[];
}

/**
 * Region Crop Re-OCR Selection
 */
export interface RegionCropSelection {
  pageNumber: number;
  bbox: BoundingBox; // [x0, y0, x1, y1]
  canvas?: HTMLCanvasElement;
}

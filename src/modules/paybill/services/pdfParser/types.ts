import type { DetectedComponentInfo } from '../../types';

export interface RawTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export interface PdfTextItem {
  str: string;
  transform?: number[];
  width?: number;
  height?: number;
}

export interface DetectedColumns {
  hasSpecialPay: boolean;
  hasWashing: boolean;
  hasNpp: boolean;
  columnCount: number;
  /** Component columns detected in the PDF header, in PDF (left-to-right) order. */
  components?: DetectedComponentInfo[];
}

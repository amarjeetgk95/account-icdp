/**
 * Paybill PDF parser (v1) - public entry point.
 *
 * Implementation lives in ./pdfParser/*; this barrel preserves the original
 * import surface (pdfParserService, mapPositionalEarningAmounts,
 * PositionalEarningAmounts) so existing importers keep working unchanged.
 */
export { mapPositionalEarningAmounts } from './pdfParser/positionalEarningAmounts';
export type { PositionalEarningAmounts } from './pdfParser/positionalEarningAmounts';
export { pdfParserService } from './pdfParser/PdfParserService';

/**
 * Paybill PDF parser (V2) - public entry point.
 *
 * Implementation lives in ./pdfParserV2/*; this barrel preserves the original
 * import surface (PDF_PARSER_BUILD, V2TextItem, pdfParserV2Service) so
 * existing importers keep working unchanged.
 */
export { PDF_PARSER_BUILD } from './pdfParserV2/constants';
export type { V2TextItem } from './pdfParserV2/types';
export { pdfParserV2Service } from './pdfParserV2/PdfParserV2Service';

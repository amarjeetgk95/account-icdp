import type { SpatialDocument, SpatialTable, SpatialPage } from '../types';

const SAMPLE_PAYBILL_COLUMNS = [
  { columnIndex: 0, x0: 50, x1: 100, width: 50, headerText: 'Sr No', predominantType: 'number' as const, align: 'left' as const },
  { columnIndex: 1, x0: 100, x1: 180, width: 80, headerText: 'HRPN', predominantType: 'text' as const, align: 'left' as const },
  { columnIndex: 2, x0: 180, x1: 340, width: 160, headerText: 'Employee Name', predominantType: 'text' as const, align: 'left' as const },
  { columnIndex: 3, x0: 340, x1: 490, width: 150, headerText: 'Designation', predominantType: 'text' as const, align: 'left' as const },
  { columnIndex: 4, x0: 490, x1: 580, width: 90, headerText: 'Basic Pay', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 5, x0: 580, x1: 670, width: 90, headerText: 'DA', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 6, x0: 670, x1: 750, width: 80, headerText: 'HRA', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 7, x0: 750, x1: 820, width: 70, headerText: 'CLA', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 8, x0: 820, x1: 890, width: 70, headerText: 'Med', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 9, x0: 890, x1: 1000, width: 110, headerText: 'Gross Amt', predominantType: 'currency' as const, align: 'right' as const },
];

const PAYBILL_RAW_ROWS = [
  ['Sr No', 'HRPN', 'Employee Name', 'Designation', 'Basic Pay', 'DA', 'HRA', 'CLA', 'Med', 'Gross Amt'],
  ['1', '20013826', 'Shri. A. K. Rathod', 'Assistant Director', '105600', '52800', '10560', '240', '1000', '170200.00'],
  ['2', '20013910', 'Dr. P. M. Patel', 'Veterinary Officer', '84500', '42250', '8450', '240', '1000', '136440.00'],
  ['3', '20105536', 'Shri. S. N. Desai', 'Senior Clerk', '38600', '19300', '3860', '150', '1000', '62910.00'],
  ['4', '20106112', 'Smt. K. B. Chaudhari', 'Junior Clerk', '27200', '13600', '2720', '150', '1000', '44670.00'],
  ['5', '20108994', 'Shri. R. J. Vasava', 'Livestock Inspector', '33400', '16700', '3340', '150', '1000', '54590.00'],
  ['Total', '', 'Grand Total Amount', '', '289300', '144650', '28930', '930', '5000', '468810.00'],
];

const paybillSpatialRows = PAYBILL_RAW_ROWS.map((rowArr, rIdx) => {
  const isHeader = rIdx === 0;
  const isTotal = rIdx === PAYBILL_RAW_ROWS.length - 1;
  const y0 = 120 + rIdx * 28;
  const y1 = y0 + 26;

  const cells = rowArr.map((text, cIdx) => {
    const col = SAMPLE_PAYBILL_COLUMNS[cIdx];
    const isNum = !isHeader && /^\d+(\.\d+)?$/.test(text);
    const numVal = isNum ? parseFloat(text) : null;
    const isCurr = isNum && cIdx >= 4;

    return {
      id: `cell-pay-r${rIdx}-c${cIdx}`,
      pageNumber: 1,
      rowIndex: rIdx,
      columnIndex: cIdx,
      rowSpan: 1,
      columnSpan: 1,
      bbox: [col.x0, y0, col.x1, y1] as [number, number, number, number],
      elements: [
        {
          id: `el-pay-r${rIdx}-c${cIdx}`,
          page: 1,
          text,
          rawText: text,
          x: col.x0 + 4,
          y: y0 + 4,
          width: col.width - 8,
          height: 18,
          bbox: [col.x0 + 4, y0 + 4, col.x1 - 4, y1 - 4] as [number, number, number, number],
          source: 'pdf-text' as const,
          confidence: 100,
        },
      ],
      text,
      data: {
        rawText: text,
        normalizedValue: numVal !== null ? numVal : text,
        type: isCurr ? ('currency' as const) : isNum ? ('number' as const) : ('text' as const),
        currencySymbol: isCurr ? '₹' : undefined,
        confidence: 100,
      },
      isHeader,
      isSubHeader: false,
      isTotal,
      isMerged: false,
      align: isNum ? ('right' as const) : ('left' as const),
    };
  });

  return {
    rowIndex: rIdx,
    cells,
    bbox: [50, y0, 1000, y1] as [number, number, number, number],
    isHeader,
    isTotal,
    baselineY: y0 + 14,
    height: 26,
  };
});

const sampleEnglishTable: SpatialTable = {
  id: 'tbl-paybill-eng-1',
  pageNumber: 1,
  bbox: [50, 120, 1000, 320],
  columns: SAMPLE_PAYBILL_COLUMNS,
  rows: paybillSpatialRows,
  cells: paybillSpatialRows.map((r) => r.cells),
  hasBorders: true,
  confidence: 98,
  columnCount: 10,
  rowCount: paybillSpatialRows.length,
};

const sampleEnglishPage: SpatialPage = {
  pageNumber: 1,
  width: 1050,
  height: 750,
  dpi: 300,
  isScanned: false,
  elements: paybillSpatialRows.flatMap((r) => r.cells.flatMap((c) => c.elements)),
  tables: [sampleEnglishTable],
  paragraphs: [
    {
      id: 'para-1',
      text: 'PAYBILL INNER SHEET - EARNING SIDE FOR THE MONTH OF : July-2026',
      elements: [],
      bbox: [50, 40, 1000, 70],
      isHeading: true,
      headingLevel: 1,
      confidence: 100,
    },
    {
      id: 'para-2',
      text: 'D.D.O HRPN : 20105451 | Name of D.D.O : ASSISTANT DIRECTOR OF ICDP SURAT | Bill No : Srt0299002201',
      elements: [],
      bbox: [50, 75, 1000, 100],
      isHeading: false,
      confidence: 100,
    },
  ],
  rawText: `PAYBILL INNER SHEET - EARNING SIDE FOR THE MONTH OF : July-2026\nD.D.O HRPN : 20105451 | Name of D.D.O : ASSISTANT DIRECTOR OF ICDP SURAT`,
  confidence: 99,
  renderingDurationMs: 50,
  ocrDurationMs: 0,
};

export const SAMPLE_ENGLISH_PAYBILL_DOC: SpatialDocument = {
  fileName: 'PayBill_Inner_Sheet_July_2026.pdf',
  fileSizeBytes: 145200,
  pageCount: 1,
  pages: [sampleEnglishPage],
  consolidatedTables: [sampleEnglishTable],
  allText: sampleEnglishPage.rawText,
  overallConfidence: 99,
  extractionDurationMs: 240,
  engineUsed: 'PDF.js Native Text Engine',
  isNativeText: true,
};

// --- GUJARATI SAMPLE DOCUMENT ---
const GUJARATI_COLUMNS = [
  { columnIndex: 0, x0: 50, x1: 120, width: 70, headerText: 'અનુક્રમ', predominantType: 'number' as const, align: 'left' as const },
  { columnIndex: 1, x0: 120, x1: 280, width: 160, headerText: 'કર્મચારીનું નામ', predominantType: 'text' as const, align: 'left' as const },
  { columnIndex: 2, x0: 280, x1: 440, width: 160, headerText: 'હોદ્દો', predominantType: 'text' as const, align: 'left' as const },
  { columnIndex: 3, x0: 440, x1: 580, width: 140, headerText: 'મૂળ પગાર (₹)', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 4, x0: 580, x1: 720, width: 140, headerText: 'મોંઘવારી ભથ્થું (₹)', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 5, x0: 720, x1: 860, width: 140, headerText: 'ઘરભાડું ભથ્થું (₹)', predominantType: 'currency' as const, align: 'right' as const },
  { columnIndex: 6, x0: 860, x1: 1000, width: 140, headerText: 'કુલ રકમ (₹)', predominantType: 'currency' as const, align: 'right' as const },
];

const GUJARATI_RAW_ROWS = [
  ['અનુક્રમ', 'કર્મચારીનું નામ', 'હોદ્દો', 'મૂળ પગાર (₹)', 'મોંઘવારી ભથ્થું (₹)', 'ઘરભાડું ભથ્થું (₹)', 'કુલ રકમ (₹)'],
  ['૧', 'શ્રી એ. કે. રાઠોડ', 'મદદનીશ નિયામક', '૧,૦૫,૬૦૦', '૫૨,૮૦૦', '૧૦,૫૬૦', '૧,૬૮,૯૬૦'],
  ['૨', 'ડૉ. પી. એમ. પટેલ', 'પશુચિકિત્સા અધિકારી', '૮૪,૫૦૦', '૪૨,૨૫૦', '૮,૪૫૦', '૧,૩૫,૨૦૦'],
  ['૩', 'શ્રી એસ. એન. દેસાઈ', 'હેડ ક્લાર્ક', '૩૮,૬૦૦', '૧૯,૩૦૦', '૩,૮૬૦', '૬૧,૭૬૦'],
  ['૪', 'શ્રીમતી કે. બી. ચૌધરી', 'જુનિયર ક્લાર્ક', '૨૭,૨૦૦', '૧૩,૬૦૦', '૨,૭૨૦', '૪૩,૫૨૦'],
  ['કુલ રકમ', '', 'કુલ સરવાળો', '૨,૫૫,૯૦૦', '૧,૨૭,૯૫૦', '૨૫,૫૯૦', '૪,૦૯,૪૪૦'],
];

const gujaratiSpatialRows = GUJARATI_RAW_ROWS.map((rowArr, rIdx) => {
  const isHeader = rIdx === 0;
  const isTotal = rIdx === GUJARATI_RAW_ROWS.length - 1;
  const y0 = 130 + rIdx * 30;
  const y1 = y0 + 28;

  const cells = rowArr.map((text, cIdx) => {
    const col = GUJARATI_COLUMNS[cIdx];
    const isNumCol = cIdx >= 3;

    return {
      id: `cell-guj-r${rIdx}-c${cIdx}`,
      pageNumber: 1,
      rowIndex: rIdx,
      columnIndex: cIdx,
      rowSpan: 1,
      columnSpan: 1,
      bbox: [col.x0, y0, col.x1, y1] as [number, number, number, number],
      elements: [
        {
          id: `el-guj-r${rIdx}-c${cIdx}`,
          page: 1,
          text,
          rawText: text,
          x: col.x0 + 4,
          y: y0 + 4,
          width: col.width - 8,
          height: 20,
          bbox: [col.x0 + 4, y0 + 4, col.x1 - 4, y1 - 4] as [number, number, number, number],
          source: 'paddle-ocr' as const,
          confidence: 97,
        },
      ],
      text,
      data: {
        rawText: text,
        normalizedValue: text,
        type: isNumCol && !isHeader ? ('currency' as const) : ('text' as const),
        currencySymbol: isNumCol ? '₹' : undefined,
        confidence: 97,
      },
      isHeader,
      isSubHeader: false,
      isTotal,
      isMerged: false,
      align: isNumCol ? ('right' as const) : ('left' as const),
    };
  });

  return {
    rowIndex: rIdx,
    cells,
    bbox: [50, y0, 1000, y1] as [number, number, number, number],
    isHeader,
    isTotal,
    baselineY: y0 + 15,
    height: 28,
  };
});

const sampleGujaratiTable: SpatialTable = {
  id: 'tbl-gujarati-order-1',
  pageNumber: 1,
  bbox: [50, 130, 1000, 320],
  columns: GUJARATI_COLUMNS,
  rows: gujaratiSpatialRows,
  cells: gujaratiSpatialRows.map((r) => r.cells),
  hasBorders: true,
  confidence: 97,
  columnCount: 7,
  rowCount: gujaratiSpatialRows.length,
};

const sampleGujaratiPage: SpatialPage = {
  pageNumber: 1,
  width: 1050,
  height: 750,
  dpi: 300,
  isScanned: true,
  elements: gujaratiSpatialRows.flatMap((r) => r.cells.flatMap((c) => c.elements)),
  tables: [sampleGujaratiTable],
  paragraphs: [
    {
      id: 'para-guj-1',
      text: 'ગુજરાત સરકાર - પશુપાલન નિયામકની કચેરી, ગાંધીનગર',
      elements: [],
      bbox: [50, 40, 1000, 70],
      isHeading: true,
      headingLevel: 1,
      confidence: 98,
    },
    {
      id: 'para-guj-2',
      text: 'વિષય: સઘન પશુ સુધારણા યોજના (ICDP) સુરત - પગાર બિલ મંજૂરી હુકમ',
      elements: [],
      bbox: [50, 75, 1000, 100],
      isHeading: false,
      confidence: 97,
    },
  ],
  rawText: `ગુજરાત સરકાર - પશુપાલન નિયામકની કચેરી, ગાંધીનગર\nવિષય: સઘન પશુ સુધારણા યોજના (ICDP) સુરત - પગાર બિલ મંજૂરી હુકમ`,
  confidence: 97,
  renderingDurationMs: 80,
  ocrDurationMs: 420,
};

export const SAMPLE_GUJARATI_ORDER_DOC: SpatialDocument = {
  fileName: 'ICDP_Surat_Gujarati_Order_July_2026.pdf',
  fileSizeBytes: 215000,
  pageCount: 1,
  pages: [sampleGujaratiPage],
  consolidatedTables: [sampleGujaratiTable],
  allText: sampleGujaratiPage.rawText,
  overallConfidence: 97,
  extractionDurationMs: 500,
  engineUsed: 'PaddleOCR (PP-OCRv4 Local)',
  isNativeText: false,
};

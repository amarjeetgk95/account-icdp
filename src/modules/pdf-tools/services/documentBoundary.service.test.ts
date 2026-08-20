import { describe, it, expect } from 'vitest';
import { documentBoundaryService } from './documentBoundary.service';
import type { SpatialPage } from '../types/spatial.types';

describe('DocumentBoundaryService', () => {
  const createMockPage = (
    pageNumber: number,
    headingText: string,
    bodyText: string
  ): SpatialPage => ({
    pageNumber,
    width: 800,
    height: 1100,
    dpi: 200,
    isScanned: false,
    elements: [],
    tables: [
      {
        id: `table-p${pageNumber}-1`,
        pageNumber,
        bbox: [50, 200, 750, 500],
        columns: [
          { columnIndex: 0, x0: 50, x1: 100, width: 50, headerText: 'Sr No', predominantType: 'number', align: 'left' },
          { columnIndex: 1, x0: 100, x1: 500, width: 400, headerText: 'Bidder Name', predominantType: 'text', align: 'left' },
          { columnIndex: 2, x0: 500, x1: 750, width: 250, headerText: 'Status', predominantType: 'text', align: 'left' },
        ],
        rows: [
          {
            rowIndex: 0,
            isHeader: true,
            isTotal: false,
            baselineY: 220,
            height: 25,
            bbox: [50, 200, 750, 225],
            cells: [
              {
                id: `c-p${pageNumber}-0-0`,
                pageNumber,
                rowIndex: 0,
                columnIndex: 0,
                rowSpan: 1,
                columnSpan: 1,
                bbox: [50, 200, 100, 225],
                elements: [],
                text: 'Sr No',
                data: { rawText: 'Sr No', normalizedValue: 'Sr No', type: 'header', confidence: 100 },
                isHeader: true,
                isSubHeader: false,
                isTotal: false,
                isMerged: false,
                align: 'left',
              },
              {
                id: `c-p${pageNumber}-0-1`,
                pageNumber,
                rowIndex: 0,
                columnIndex: 1,
                rowSpan: 1,
                columnSpan: 1,
                bbox: [100, 200, 500, 225],
                elements: [],
                text: 'Bidder Name',
                data: { rawText: 'Bidder Name', normalizedValue: 'Bidder Name', type: 'header', confidence: 100 },
                isHeader: true,
                isSubHeader: false,
                isTotal: false,
                isMerged: false,
                align: 'left',
              },
              {
                id: `c-p${pageNumber}-0-2`,
                pageNumber,
                rowIndex: 0,
                columnIndex: 2,
                rowSpan: 1,
                columnSpan: 1,
                bbox: [500, 200, 750, 225],
                elements: [],
                text: 'Status',
                data: { rawText: 'Status', normalizedValue: 'Status', type: 'header', confidence: 100 },
                isHeader: true,
                isSubHeader: false,
                isTotal: false,
                isMerged: false,
                align: 'left',
              },
            ],
          },
        ],
        cells: [],
        hasBorders: true,
        confidence: 98,
        columnCount: 3,
        rowCount: 1,
      },
    ],
    paragraphs: [
      {
        id: `para-p${pageNumber}-1`,
        text: headingText,
        elements: [],
        bbox: [50, 50, 750, 80],
        isHeading: true,
        headingLevel: 1,
        confidence: 99,
        blockType: 'heading',
        align: 'center',
      },
      {
        id: `para-p${pageNumber}-2`,
        text: bodyText,
        elements: [],
        bbox: [50, 90, 750, 150],
        isHeading: false,
        confidence: 95,
        blockType: 'paragraph',
        align: 'left',
      },
    ],
    rawText: `${headingText}\n${bodyText}`,
    confidence: 97,
    renderingDurationMs: 10,
    ocrDurationMs: 0,
  });

  it('detects a single document section for a single page document', () => {
    const pages = [
      createMockPage(1, 'ટેકનિકલ ઈવેલ્યુએશન BID NO: GEM/2026/B/1234', 'તારીખ: 15/05/2026 - લાયક: 13, અમાન્ય: 297, રજૂઆત: 137, માન્ય રાખેલ: 7, કુલ લાયક: 20'),
    ];

    const sections = documentBoundaryService.detectSections(pages, 'technical_eval.pdf');
    expect(sections).toHaveLength(1);
    expect(sections[0].docType).toBe('technical_evaluation');
    expect(sections[0].startPageNumber).toBe(1);
    expect(sections[0].endPageNumber).toBe(1);
    expect(sections[0].pageCount).toBe(1);
    expect(sections[0].summaryMetrics?.qualifiedCount).toBe(13);
    expect(sections[0].summaryMetrics?.rejectedCount).toBe(297);
    expect(sections[0].summaryMetrics?.representationCount).toBe(137);
    expect(sections[0].summaryMetrics?.acceptedRepresentationCount).toBe(7);
    expect(sections[0].summaryMetrics?.finalCount).toBe(20);
  });

  it('detects separate document boundaries for multi-round evaluation page-sets (13 vs 16 qualified)', () => {
    const pages = [
      // Page 1-2: Round 1 (13 qualified + 7 representation = 20)
      createMockPage(1, 'ટેકનિકલ ઈવેલ્યુએશન - પ્રથમ તબક્કો (BID NO: GEM/2026/B/1001)', 'તારીખ: 10/04/2026. કુલ લાયક ઠરેલ બિડર: 13, અમાન્ય: 297, રજૂઆત: 137, માન્ય રાખેલ રજૂઆત: 7, આખરી લાયક: 20'),
      createMockPage(2, 'ટેકનિકલ ઈવેલ્યુએશન પત્રક (ચાલુ)', 'બિડર વિગતો અને ગુણાંક સારાંશ.'),
      // Page 3-4: Round 2 (16 qualified + 4 representation = 20)
      createMockPage(3, 'સુધારેલ ટેકનિકલ ઈવેલ્યુએશન - દ્વિતીય તબક્કો (BID NO: GEM/2026/B/1001)', 'તારીખ: 25/04/2026. સુધારેલ લાયક બિડર: 16, અમાન્ય: 296, રજૂઆત: 210, માન્ય રાખેલ રજૂઆત: 4, આખરી લાયક: 20'),
      createMockPage(4, 'આખરી ૨૦ લાયક બિડર યાદી', 'સહી અને મંજૂરી આદેશ.'),
    ];

    const sections = documentBoundaryService.detectSections(pages, 'evaluation_rounds.pdf');

    // Must preserve 2 separate sections without merging
    expect(sections).toHaveLength(2);

    // Section 1 Verification (Round 1: 13 qualified)
    expect(sections[0].startPageNumber).toBe(1);
    expect(sections[0].endPageNumber).toBe(2);
    expect(sections[0].pageCount).toBe(2);
    expect(sections[0].summaryMetrics?.qualifiedCount).toBe(13);
    expect(sections[0].summaryMetrics?.rejectedCount).toBe(297);
    expect(sections[0].summaryMetrics?.representationCount).toBe(137);
    expect(sections[0].summaryMetrics?.acceptedRepresentationCount).toBe(7);
    expect(sections[0].summaryMetrics?.finalCount).toBe(20);

    // Section 2 Verification (Round 2: 16 qualified)
    expect(sections[1].startPageNumber).toBe(3);
    expect(sections[1].endPageNumber).toBe(4);
    expect(sections[1].pageCount).toBe(2);
    expect(sections[1].summaryMetrics?.qualifiedCount).toBe(16);
    expect(sections[1].summaryMetrics?.rejectedCount).toBe(296);
    expect(sections[1].summaryMetrics?.representationCount).toBe(210);
    expect(sections[1].summaryMetrics?.acceptedRepresentationCount).toBe(4);
    expect(sections[1].summaryMetrics?.finalCount).toBe(20);

    // Provenance Check: Pages 1 and 2 carry Section 1 ID, Pages 3 and 4 carry Section 2 ID
    expect(pages[0].sectionId).toBe(sections[0].id);
    expect(pages[1].sectionId).toBe(sections[0].id);
    expect(pages[2].sectionId).toBe(sections[1].id);
    expect(pages[3].sectionId).toBe(sections[1].id);

    // Tables and cells carry exact provenance
    expect(pages[0].tables[0].sectionId).toBe(sections[0].id);
    expect(pages[2].tables[0].sectionId).toBe(sections[1].id);
    expect(pages[0].tables[0].rows[0].cells[0].sectionId).toBe(sections[0].id);
    expect(pages[2].tables[0].rows[0].cells[0].sectionId).toBe(sections[1].id);
  });

  it('preserves section identity across different document types (Rojkam, Order, Annexure)', () => {
    const pages = [
      createMockPage(1, 'બિડ રોજકામ - GEM/2026/B/888', 'રોજકામ નોંધ.'),
      createMockPage(2, 'ટેકનિકલ ઈવેલ્યુએશન', 'મૂલ્યાંકન સારાંશ.'),
      createMockPage(3, 'મંજૂરી હુકમ જા.નં: ૧૨૩/૨૦૨૬', 'કચેરી આદેશ.'),
    ];

    const sections = documentBoundaryService.detectSections(pages, 'tender_complete.pdf');
    expect(sections).toHaveLength(3);
    expect(sections[0].docType).toBe('rojkam');
    expect(sections[1].docType).toBe('technical_evaluation');
    expect(sections[2].docType).toBe('order');
  });
});

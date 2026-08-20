/**
 * Document Boundary & Section Detection Service
 *
 * Implements architectural principles:
 * 1. Document Boundary Detection: Identify logical document boundaries/page-sets within a multi-page PDF.
 * 2. Page-Level Provenance: Every paragraph, table, row, and cell retains original page and section identity.
 * 7. Duplicate and Version Protection: Preserve multiple evaluation rounds/versions independently without merging.
 * 8. No Semantic Reconciliation: Extract and preserve numbers (e.g. 13+7=20 vs 16+4=20) faithfully.
 */

import type {
  DocumentSection,
  DocumentSectionType,
  SpatialPage,
  SpatialParagraph,
  SpatialTable,
} from '../types/spatial.types';

export class DocumentBoundaryService {
  /**
   * Identifies logical section boundaries and groups pages into distinct DocumentSections.
   * Annotates all pages, tables, rows, cells, and paragraphs with section provenance.
   */
  detectSections(pages: SpatialPage[], documentFileName = 'document.pdf'): DocumentSection[] {
    if (!pages || pages.length === 0) return [];

    const sections: DocumentSection[] = [];
    let currentSectionPages: SpatialPage[] = [];
    let currentSectionTitle = '';
    let currentDocType: DocumentSectionType = 'general';
    let currentBidNo: string | undefined;
    let currentDate: string | undefined;
    let currentOrderNo: string | undefined;

    const finalizeCurrentSection = () => {
      if (currentSectionPages.length === 0) return;

      const startPageNumber = currentSectionPages[0].pageNumber;
      const endPageNumber = currentSectionPages[currentSectionPages.length - 1].pageNumber;
      const sectionIndex = sections.length + 1;
      const sectionId = `sec-${sectionIndex}-${startPageNumber}-${endPageNumber}`;

      const fallbackTitle =
        currentSectionTitle ||
        (sections.length === 0
          ? documentFileName.replace(/\.[^/.]+$/, '')
          : `Section ${sectionIndex} (Pages ${startPageNumber}–${endPageNumber})`);

      const allTables: SpatialTable[] = currentSectionPages.flatMap((p) => p.tables);
      const allParagraphs: SpatialParagraph[] = currentSectionPages.flatMap((p) => p.paragraphs);
      const allBlocks = currentSectionPages.flatMap((p) => p.blocks || []);

      const sectionConfidence = Math.round(
        currentSectionPages.reduce((sum, p) => sum + p.confidence, 0) / currentSectionPages.length
      );

      // Extract metrics if present (purely for non-destructive metadata reporting)
      const combinedSectionText = currentSectionPages.map((p) => p.rawText).join('\n');
      const summaryMetrics = this.extractSummaryMetrics(combinedSectionText);

      // Apply provenance annotations to all entities in this section
      for (const page of currentSectionPages) {
        page.sectionId = sectionId;
        page.sectionTitle = fallbackTitle;

        for (const table of page.tables) {
          table.sectionId = sectionId;
          table.sectionTitle = fallbackTitle;

          for (const row of table.rows) {
            row.sectionId = sectionId;
            for (const cell of row.cells) {
              cell.sectionId = sectionId;
              cell.sectionTitle = fallbackTitle;
            }
          }
        }

        for (const para of page.paragraphs) {
          para.sectionId = sectionId;
          para.sectionTitle = fallbackTitle;
          para.pageNumber = page.pageNumber;
        }

        if (page.blocks) {
          for (const block of page.blocks) {
            block.sectionId = sectionId;
            block.pageNumber = page.pageNumber;
          }
        }
      }

      sections.push({
        id: sectionId,
        title: fallbackTitle,
        docType: currentDocType,
        startPageNumber,
        endPageNumber,
        pageCount: currentSectionPages.length,
        bidNumber: currentBidNo,
        date: currentDate,
        referenceOrderNo: currentOrderNo,
        pages: [...currentSectionPages],
        tables: allTables,
        paragraphs: allParagraphs,
        blocks: allBlocks,
        confidence: sectionConfidence,
        summaryMetrics,
      });

      currentSectionPages = [];
    };

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      const boundaryInfo = this.inspectPageForBoundary(page, i === 0);

      if (i > 0 && boundaryInfo.isNewSection) {
        finalizeCurrentSection();

        currentSectionTitle = boundaryInfo.title;
        currentDocType = boundaryInfo.docType;
        currentBidNo = boundaryInfo.bidNumber || currentBidNo;
        currentDate = boundaryInfo.date || currentDate;
        currentOrderNo = boundaryInfo.orderNo || currentOrderNo;
      } else if (i === 0) {
        currentSectionTitle = boundaryInfo.title;
        currentDocType = boundaryInfo.docType;
        currentBidNo = boundaryInfo.bidNumber;
        currentDate = boundaryInfo.date;
        currentOrderNo = boundaryInfo.orderNo;
      }

      currentSectionPages.push(page);
    }

    finalizeCurrentSection();
    return sections;
  }

  /**
   * Inspects a single page to determine if it starts a new document boundary.
   */
  private inspectPageForBoundary(
    page: SpatialPage,
    isFirstPage: boolean
  ): {
    isNewSection: boolean;
    title: string;
    docType: DocumentSectionType;
    bidNumber?: string;
    date?: string;
    orderNo?: string;
  } {
    const headings = page.paragraphs.filter((p) => p.isHeading || p.blockType === 'heading');
    const firstFewParagraphs = page.paragraphs.slice(0, 4);
    const topText = firstFewParagraphs.map((p) => p.text).join('\n');

    // Detect BID number
    const bidMatch = topText.match(
      /(?:BID\s*(?:NO|NUMBER|ID)?|બિડ\s*નંબર|ટેન્ડર\s*નંબર|GEM\/[0-9A-Z\/\-]+)[\s:\-]*([A-Za-z0-9\/\-_]+)/i
    );
    const bidNumber = bidMatch ? bidMatch[1].trim() : undefined;

    // Detect Date
    const dateMatch = topText.match(
      /(?:તારીખ|Date|Dt)[\s:\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i
    );
    const date = dateMatch ? dateMatch[1].trim() : undefined;

    // Detect Order/Reference number
    const orderMatch = topText.match(
      /(?:જા\.નં|ક્રમાંક|આદેશ\s*ક્રમાંક|Order\s*No|Ref\s*No)[\s:\-]*([^\n,]+)/i
    );
    const orderNo = orderMatch ? orderMatch[1].trim() : undefined;

    // Check if this page is explicitly marked as a continuation of previous page
    const isContinuation = /(?:\(ચાલુ\)|\(ચાલુ\s*પાન\)|\(Continued\)|\(Contd\.?\))/i.test(topText);

    // Section classification patterns
    const isTechnicalEval =
      /(?:ટેકનિકલ\s*ઈવેલ્યુએશન|ટેકનીકલ\s*મૂલ્યાંકન|TECHNICAL\s*EVALUATION|TECHNICAL\s*BID\s*EVALUATION|BID\s*EVALUATION)/i.test(
        topText
      );
    const isFinancialEval =
      /(?:ફાઈનાન્સિયલ\s*ઈવેલ્યુએશન|નાણાકીય\s*મૂલ્યાંકન|FINANCIAL\s*EVALUATION|PRICE\s*BID)/i.test(
        topText
      );
    const isRojkam = /(?:બિડ\s*રોજકામ|રોજકામ|ROJKAM|BID\s*ROJKAM|PROCEEDING)/i.test(topText);
    const isOrder = /(?:મંજૂરી\s*હુકમ|કચેરી\s*આદેશ|હુકમ|ORDER|SANCTION\s*ORDER|OFFICE\s*ORDER)/i.test(
      topText
    );
    const isCorrigendum = /(?:સુધારા\s*હુકમ|શુદ્ધિપત્રક|CORRIGENDUM|ADDENDUM)/i.test(topText);
    const isAnnexure = /(?:પરિશિષ્ટ|એનેક્ષર|ANNEXURE|APPENDIX)(?:\s*[-–:]|\s+[A-Za-z0-9]+)/i.test(
      topText
    );

    let docType: DocumentSectionType = 'general';
    let detectedTitle = '';

    if (isTechnicalEval) {
      docType = 'technical_evaluation';
      detectedTitle = 'Technical Evaluation (ટેકનિકલ ઈવેલ્યુએશન)';
    } else if (isFinancialEval) {
      docType = 'financial_evaluation';
      detectedTitle = 'Financial Evaluation (નાણાકીય મૂલ્યાંકન)';
    } else if (isRojkam) {
      docType = 'rojkam';
      detectedTitle = 'Bid Rojkam (બિડ રોજકામ)';
    } else if (isOrder) {
      docType = 'order';
      detectedTitle = 'Sanction Order (મંજૂરી હુકમ)';
    } else if (isCorrigendum) {
      docType = 'corrigendum';
      detectedTitle = 'Corrigendum (શુદ્ધિપત્રક)';
    } else if (isAnnexure) {
      docType = 'annexure';
      detectedTitle = 'Annexure / Statement (પરિશિષ્ટ / પત્રક)';
    }

    if (headings.length > 0) {
      const topHeadingText = headings[0].text.trim();
      if (topHeadingText.length > 3 && topHeadingText.length < 80) {
        detectedTitle = topHeadingText;
      }
    }

    // A page is considered a NEW section if it is the first page, or contains a distinct new document title / heading (and not marked continuation)
    const hasDistinctTitle =
      !isContinuation &&
      Boolean(isTechnicalEval || isFinancialEval || isRojkam || isOrder || isCorrigendum || isAnnexure);

    // Also check if page starts with a major government banner or header reset
    const hasGovtBanner =
      !isContinuation &&
      /(ગુજરાત\s*સરકાર|GOVERNMENT\s*OF\s*GUJARAT|પશુપાલન\s*નિયામક|કચેરી\s*નિયામક)/i.test(
        topText
      ) &&
      headings.length > 0;

    const isNewSection = isFirstPage || hasDistinctTitle || hasGovtBanner;

    return {
      isNewSection,
      title: detectedTitle || `Page ${page.pageNumber}`,
      docType,
      bidNumber,
      date,
      orderNo,
    };
  }

  /**
   * Non-destructively extracts summary metrics from text (e.g. 13 qualified, 297 rejected, etc.)
   * Does NOT alter or reconcile numbers across versions.
   */
  private extractSummaryMetrics(text: string): DocumentSection['summaryMetrics'] {
    if (!text) return undefined;

    let qualifiedCount: number | undefined;
    let rejectedCount: number | undefined;
    let representationCount: number | undefined;
    let acceptedRepresentationCount: number | undefined;
    let finalCount: number | undefined;

    // 1. Initial qualified count (e.g. લાયક: 13, લાયક ઠરેલ બિડર: 13, સુધારેલ લાયક બિડર: 16)
    const initialQualMatch = text.match(
      /(?:પ્રથમ\s*તબક્કે\s*લાયક|શરૂઆતમાં\s*લાયક|સુધારેલ\s*લાયક|લાયક\s*(?:ઠરેલ|થયેલ)?|initially\s*qualified|qualified|eligible)(?:\s*(?:બિડર|પાર્ટી|એજન્સી|ઉમેદવાર))?[\s:\-]*([0-9]+)/i
    );
    if (initialQualMatch) {
      qualifiedCount = parseInt(initialQualMatch[1], 10);
    }

    // 2. Rejected count (e.g. અમાન્ય: 297, અમાન્ય બિડર: 296, ગેરલાયક બિડર: 297)
    const rejMatch = text.match(
      /(?:ગેરલાયક|અમાન્ય|rejected|disqualified)(?:\s*(?:બિડર|પાર્ટી|એજન્સી))?[\s:\-]*([0-9]+)/i
    );
    if (rejMatch) rejectedCount = parseInt(rejMatch[1], 10);

    // 3. Representation count (e.g. રજૂઆત: 137, વાંધા અરજી: 137)
    const repMatch = text.match(/(?:રજૂઆત|વાંધા\s*અરજી|representation)[\s:\-]*([0-9]+)/i);
    if (repMatch) representationCount = parseInt(repMatch[1], 10);

    // 4. Accepted representations (e.g. માન્ય રાખેલ: 7, માન્ય રાખેલ રજૂઆત: 7)
    const accMatch = text.match(
      /(?:માન્ય\s*રાખેલ(?:\s*રજૂઆત)?|accepted\s*representation|accepted)[\s:\-]*([0-9]+)/i
    );
    if (accMatch) acceptedRepresentationCount = parseInt(accMatch[1], 10);

    // 5. Final total qualified (e.g. આખરી લાયક: 20, કુલ લાયક: 20)
    const finalMatch =
      text.match(
        /(?:આખરી\s*(?:કુલ\s*)?લાયક|આખરી\s*[૦-૯0-9]+\s*લાયક|final\s*qualified)[\s:\-]*([0-9]+)/i
      ) || text.match(/(?:કુલ\s*લાયક)[\s:\-]*([0-9]+)/i);
    if (finalMatch) finalCount = parseInt(finalMatch[1], 10);

    if (
      qualifiedCount !== undefined ||
      rejectedCount !== undefined ||
      representationCount !== undefined ||
      acceptedRepresentationCount !== undefined ||
      finalCount !== undefined
    ) {
      return {
        qualifiedCount,
        rejectedCount,
        representationCount,
        acceptedRepresentationCount,
        finalCount,
      };
    }

    return undefined;
  }
}

export const documentBoundaryService = new DocumentBoundaryService();

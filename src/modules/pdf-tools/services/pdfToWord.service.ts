import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ExtractedDocument, WordExportOptions } from '../types';

export class PdfToWordService {
  private defaultOptions: WordExportOptions = {
    fontSizePt: 11,
    fontFamily: 'Segoe UI',
    includeTables: true,
    includeParagraphs: true,
    accentColorHex: '1E40AF', // Deep Blue
    pageBreakBetweenPages: true,
  };

  /**
   * Export ExtractedDocument to Microsoft Word (.docx) file and trigger browser download
   */
  async exportAndDownload(
    doc: ExtractedDocument,
    customOptions?: WordExportOptions,
    customFileName?: string
  ): Promise<void> {
    const blob = await this.exportToWord(doc, customOptions, customFileName);
    const fileName =
      customFileName ||
      `${doc.fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_\-\u0A80-\u0AFF]/g, '_')}_extracted.docx`;
    saveAs(blob, fileName);
  }

  /**
   * Export ExtractedDocument to Microsoft Word (.docx) file
   */
  async exportToWord(
    doc: ExtractedDocument,
    customOptions?: WordExportOptions,
    _customFileName?: string
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...customOptions };
    const children: (Paragraph | Table)[] = [];

    // 1. Document Title / Header
    const titleText = opts.documentTitle || doc.fileName.replace(/\.[^/.]+$/, '');
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: titleText,
            bold: true,
            size: 32, // 16pt
            font: opts.fontFamily,
            color: opts.accentColorHex,
          }),
        ],
      })
    );

    // Document Metadata Subtitle
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: `Extracted with ${doc.engineUsed} • Pages: ${doc.pageCount} • Confidence: ${doc.overallConfidence}%`,
            italics: true,
            size: 18, // 9pt
            font: opts.fontFamily,
            color: '64748B',
          }),
        ],
      })
    );

    // 2. Iterate each page
    for (let pageIdx = 0; pageIdx < doc.pages.length; pageIdx++) {
      const page = doc.pages[pageIdx];

      if (pageIdx > 0 && opts.pageBreakBetweenPages) {
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }

      // Page Banner Heading (if multi-page)
      if (doc.pages.length > 1) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: `Page ${page.pageNumber}`,
                bold: true,
                size: 24, // 12pt
                font: opts.fontFamily,
                color: '334155',
              }),
            ],
          })
        );
      }

      // Render Tables if present
      if (opts.includeTables && page.tables && page.tables.length > 0) {
        for (const table of page.tables) {
          const docxTable = this.buildDocxTable(table, opts);
          children.push(docxTable);
          // Space after table
          children.push(new Paragraph({ spacing: { after: 200 } }));
        }
      }

      // Render Paragraphs / Free Text
      if (opts.includeParagraphs) {
        // If no tables were rendered or if paragraphs provide additional narrative
        const nonTableLines = page.paragraphs && page.paragraphs.length > 0
          ? page.paragraphs
          : [];

        for (const p of nonTableLines) {
          if (!p.text.trim()) continue;

          // If there are tables and this line is already in a table, avoid duplicating it
          const isInsideTable = page.tables.some((t) =>
            t.rows.some((r) => r.cells.some((c) => c.text && p.text.includes(c.text)))
          );

          if (page.tables.length > 0 && isInsideTable && !p.isHeading) {
            continue;
          }

          if (p.isHeading) {
            const hLevel = (p as { headingLevel?: number }).headingLevel;
            children.push(
              new Paragraph({
                heading: hLevel === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
                spacing: { before: 180, after: 80 },
                children: [
                  new TextRun({
                    text: p.text,
                    bold: true,
                    size: hLevel === 1 ? 26 : 22,
                    font: opts.fontFamily,
                    color: opts.accentColorHex,
                  }),
                ],
              })
            );
          } else {
            children.push(
              new Paragraph({
                spacing: { before: 40, after: 80, line: 260 },
                children: [
                  new TextRun({
                    text: p.text,
                    size: (opts.fontSizePt || 11) * 2,
                    font: opts.fontFamily,
                    color: '1E293B',
                  }),
                ],
              })
            );
          }
        }
      }
    }

    // 3. Construct Document
    const wordDoc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000,
              },
            },
          },
          children,
        },
      ],
    });

    return await Packer.toBlob(wordDoc);
  }

  /**
   * Build native styled Table in DOCX
   */
  private buildDocxTable(table: any, opts: WordExportOptions): Table {
    const tableRows: TableRow[] = [];

    const cellBorder = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: 'E2E8F0',
    };

    const headerBorder = {
      style: BorderStyle.SINGLE,
      size: 2,
      color: 'CBD5E1',
    };

    for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
      const row = table.rows[rIdx];
      const isHeader = row.isHeader || rIdx === 0;
      const isTotal = row.isTotal;

      const cells: TableCell[] = row.cells.map((cell: any) => {
        const align = cell.isNumeric ? AlignmentType.RIGHT : AlignmentType.LEFT;
        const isBold = isHeader || isTotal;

        let fill = 'FFFFFF';
        let fontColor = '1E293B';

        if (isHeader) {
          fill = opts.accentColorHex?.replace('#', '') || '1E40AF';
          fontColor = 'FFFFFF';
        } else if (isTotal) {
          fill = 'D1FAE5'; // Emerald 100
          fontColor = '065F46';
        } else if (rIdx % 2 === 1) {
          fill = 'F8FAFC'; // Zebra striping
        }

        return new TableCell({
          shading: { fill },
          borders: {
            top: isHeader ? headerBorder : cellBorder,
            bottom: isHeader ? headerBorder : cellBorder,
            left: cellBorder,
            right: cellBorder,
          },
          margins: {
            top: 120,
            bottom: 120,
            left: 140,
            right: 140,
          },
          children: [
            new Paragraph({
              alignment: align,
              children: [
                new TextRun({
                  text: cell.text || '-',
                  bold: isBold,
                  size: isHeader ? 20 : 18,
                  font: opts.fontFamily,
                  color: fontColor,
                }),
              ],
            }),
          ],
        });
      });

      tableRows.push(
        new TableRow({
          children: cells,
          tableHeader: isHeader,
        })
      );
    }

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: tableRows,
    });
  }
}

export const pdfToWordService = new PdfToWordService();

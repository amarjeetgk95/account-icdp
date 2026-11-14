import type { RawTextItem, PdfTextItem } from './types';

/**
 * Extract raw text and item coordinates using unpdf
 */
export async function extractTextAndItems(
  arrayBuffer: ArrayBuffer
): Promise<{ rawText: string; pageCount: number; items: RawTextItem[] }> {
  const data = new Uint8Array(arrayBuffer);
  const { extractText, getDocumentProxy } = await import('unpdf');

  try {
    const pdfDoc = await getDocumentProxy(data);
    const pageCount = pdfDoc.numPages;
    const items: RawTextItem[] = [];
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageItems: RawTextItem[] = [];

      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const pdfItem = item as PdfTextItem;
          const transform = pdfItem.transform;
          const x = transform ? transform[4] : 0;
          const y = transform ? transform[5] : 0;
          const w = pdfItem.width || 0;
          const h = pdfItem.height || 0;

          const rawItem: RawTextItem = {
            str: item.str,
            x,
            y,
            w,
            h,
            page: pageNum,
          };
          pageItems.push(rawItem);
          items.push(rawItem);
        }
      }

      // Group page items into lines based on Y coordinate tolerance
      const lines = clusterItemsIntoLines(pageItems);
      pageTexts.push(lines.join('\n'));
    }

    const rawText = pageTexts.join('\n\n');
    return { rawText, pageCount, items };
  } catch {
    // Fallback to high-level extractText from unpdf
    const extracted = await extractText(data, { mergePages: false });
    const pageTexts = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    return {
      rawText: pageTexts.join('\n\n'),
      pageCount: extracted.totalPages || 1,
      items: [],
    };
  }
}

/**
 * Cluster text items with similar Y coordinates into formatted text lines
 */
export function clusterItemsIntoLines(items: RawTextItem[]): string[] {
  if (items.length === 0) return [];

  // Sort top to bottom (descending Y in PDF coordinates), then left to right (ascending X)
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const lineBuckets: Array<{ y: number; items: RawTextItem[] }> = [];

  for (const item of sorted) {
    const bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= 4);
    if (bucket) {
      bucket.items.push(item);
    } else {
      lineBuckets.push({ y: item.y, items: [item] });
    }
  }

  // Sort items in each line by X ascending
  return lineBuckets.map((bucket) => {
    bucket.items.sort((a, b) => a.x - b.x);
    return bucket.items.map((i) => i.str.trim()).filter(Boolean).join(' ');
  });
}

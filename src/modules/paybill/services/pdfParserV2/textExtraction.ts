import type { V2TextItem } from './types';

/**
 * Extract raw text and item coordinates using unpdf
 */
export function clusterItemsIntoLines(items: V2TextItem[]): string[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));
  const buckets: Array<{ y: number; items: V2TextItem[] }> = [];
  for (const item of sorted) {
    const b = buckets.find((x) => Math.abs(x.y - item.y) <= 4);
    if (b) b.items.push(item);
    else buckets.push({ y: item.y, items: [item] });
  }
  return buckets.map((b) => {
    b.items.sort((a, b2) => a.x - b2.x);
    return b.items.map((i) => i.str.trim()).filter(Boolean).join(' ');
  });
}

export async function extractTextAndItems(
  arrayBuffer: ArrayBuffer
): Promise<{ rawText: string; pageCount: number; items: V2TextItem[] }> {
  const data = new Uint8Array(arrayBuffer);
  const { extractText, getDocumentProxy } = await import('unpdf');
  try {
    const pdfDoc = await getDocumentProxy(data);
    const items: V2TextItem[] = [];
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageItems: V2TextItem[] = [];
      for (const raw of content.items as Array<Record<string, unknown>>) {
        const str = raw['str'] as string;
        if (typeof str !== 'string' || !str.trim()) continue;
        const t = (raw['transform'] as number[] | undefined) || [0, 0, 0, 0, 0, 0];
        pageItems.push({
          str,
          x: t[4] || 0,
          y: t[5] || 0,
          w: (raw['width'] as number) || 0,
          h: (raw['height'] as number) || 0,
          page: pageNum,
        });
      }
      items.push(...pageItems);
      pageTexts.push(clusterItemsIntoLines(pageItems).join('\n'));
    }
    return { rawText: pageTexts.join('\n\n'), pageCount: pdfDoc.numPages, items };
  } catch {
    const extracted = await extractText(data, { mergePages: false });
    const texts = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    return { rawText: texts.join('\n\n'), pageCount: extracted.totalPages || 1, items: [] };
  }
}

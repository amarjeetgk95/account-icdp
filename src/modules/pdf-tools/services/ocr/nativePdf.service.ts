import type { ExtractedElement, OcrPageResult } from '../../types/spatial.types';
import { gujaratiUnicodeRecoveryService } from '../gujaratiUnicodeRecovery.service';
import { layoutReconstructionService } from '../layoutReconstruction.service';

export class NativePdfEngine {
  readonly id = 'native-pdf';
  readonly name = 'PDF.js Native Text Engine';
  readonly version = '1.0.0';

  /**
   * Extract native digital vector text and bounding boxes from a PDF.js page proxy
   */
  async extractPage(pageProxy: any, pageNumber: number, renderScale = 2.0): Promise<OcrPageResult> {
    const startTime = performance.now();
    const viewport = pageProxy.getViewport({ scale: renderScale });
    const textContent = await pageProxy.getTextContent();

    const rawElements: ExtractedElement[] = [];
    const items = textContent.items || [];
    let readingOrder = 1;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!('str' in item)) continue;

      const rawStr = item.str || '';
      const text = rawStr.trim();
      if (!text) continue;

      // Transform matrix: [scaleX, skewY, skewX, scaleY, transX, transY]
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const pdfX = transform[4] || 0;
      const pdfY = transform[5] || 0;
      const fontSize = Math.abs(transform[3]) || Math.abs(transform[0]) || 12;
      const width = (item.width ? item.width : Math.max(text.length * 7, 15)) * renderScale;
      const height = (item.height ? item.height : fontSize) * renderScale;

      // Calculate screen coordinates (origin at top-left)
      let screenX = pdfX * renderScale;
      let screenY = viewport.height - (pdfY * renderScale) - height;

      if (typeof viewport.convertToViewportPoint === 'function') {
        try {
          const [vx, vy] = viewport.convertToViewportPoint(pdfX, pdfY);
          screenX = vx;
          screenY = vy - height;
        } catch {
          // fallback
        }
      }

      const x0 = Math.max(0, Math.round(screenX));
      const y0 = Math.max(0, Math.round(screenY));
      const x1 = Math.round(screenX + width);
      const y1 = Math.round(screenY + height);

      rawElements.push({
        id: `native-p${pageNumber}-${readingOrder}`,
        page: pageNumber,
        text,
        rawText: rawStr,
        x: x0,
        y: y0,
        width: Math.max(1, x1 - x0),
        height: Math.max(1, y1 - y0),
        bbox: [x0, y0, x1, y1],
        source: 'pdf-text',
        confidence: 100,
        fontFamily: item.fontName,
        fontSize: fontSize * renderScale,
        readingOrder: readingOrder++,
      });
    }

    // Apply Gujarati font/CMap & Indic orthography recovery and glyph/word reconstruction
    const { elements: recoveredElements, recoveredCount } =
      gujaratiUnicodeRecoveryService.recoverElements(rawElements);

    const stitchedWords = layoutReconstructionService.reconstructGlyphsAndWords(recoveredElements);

    const durationMs = Math.round(performance.now() - startTime);
    const rawText = stitchedWords.map((e) => e.text).join(' ');

    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      elements: stitchedWords.length > 0 ? stitchedWords : recoveredElements,
      rawText,
      confidence: recoveredCount > 0 ? 95 : 100,
      engine: 'PDF.js Vector + Gujarati CMap Recovery',
      durationMs,
    };
  }
}

export const nativePdfEngine = new NativePdfEngine();

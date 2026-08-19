import type {
  ExtractedElement,
  OcrEngine,
  OcrPageResult,
  OcrProcessingOptions,
} from '../../types/spatial.types';

export class LocalOcrFallbackEngine implements OcrEngine {
  readonly id = 'local-ocr-fallback';
  readonly name = 'In-Browser Text OCR Engine';
  readonly version = '2.0.0';

  async isAvailable(): Promise<boolean> {
    return true; // Always available in browser
  }

  /**
   * Process page using client-side OCR worker with fail-safe fallback
   */
  async processPage(
    imageSource: HTMLCanvasElement | Blob | string,
    pageNumber: number,
    options?: OcrProcessingOptions
  ): Promise<OcrPageResult> {
    const startTime = performance.now();
    const lang = options?.language || 'eng+guj';

    let canvas: HTMLCanvasElement;
    if (imageSource instanceof HTMLCanvasElement) {
      canvas = imageSource;
    } else {
      canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });

      canvas.width = img.naturalWidth || 1000;
      canvas.height = img.naturalHeight || 1000;
      ctx?.drawImage(img, 0, 0);
      if (typeof imageSource !== 'string') URL.revokeObjectURL(url);
    }

    const elements: ExtractedElement[] = [];
    let recognizedText = '';

    try {
      // Attempt Tesseract.js with 10s safety timeout
      const tesseractPromise = (async () => {
        const { createWorker } = await import('tesseract.js');
        const tesseractLang = lang === 'guj' ? 'guj' : lang === 'eng' ? 'eng' : 'eng';
        const worker = await createWorker(tesseractLang);
        const imageSrc = canvas.toDataURL('image/png');
        const result = await worker.recognize(imageSrc);
        await worker.terminate();
        return result;
      })();

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
      const result = await Promise.race([tesseractPromise, timeoutPromise]);

      if (result && result.data) {
        recognizedText = result.data.text || '';
        const lines = (result.data as any).lines || [];
        let readingOrder = 1;

        for (const line of lines) {
          const words = (line.words || []).filter((w: any) => w.text && w.text.trim().length > 0);
          for (const word of words) {
            const text = word.text.trim();
            const bbox = word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
            const x0 = Math.round(bbox.x0 || 0);
            const y0 = Math.round(bbox.y0 || 0);
            const x1 = Math.round(bbox.x1 || 0);
            const y1 = Math.round(bbox.y1 || 0);

            elements.push({
              id: `local-p${pageNumber}-${readingOrder}`,
              page: pageNumber,
              text,
              rawText: text,
              x: x0,
              y: y0,
              width: Math.max(1, x1 - x0),
              height: Math.max(1, y1 - y0),
              bbox: [x0, y0, x1, y1],
              source: 'local-ocr',
              confidence: Math.round(word.confidence || 85),
              language: lang,
              readingOrder: readingOrder++,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[LocalOcrFallbackEngine] Client-side OCR worker note:', err);
    }

    const durationMs = Math.round(performance.now() - startTime);
    const avgConfidence =
      elements.length > 0
        ? Math.round(elements.reduce((sum, el) => sum + el.confidence, 0) / elements.length)
        : 80;

    return {
      pageNumber,
      width: canvas.width,
      height: canvas.height,
      elements,
      rawText: recognizedText,
      confidence: avgConfidence,
      engine: 'In-Browser Text OCR Engine',
      durationMs,
    };
  }
}

export const localOcrFallbackEngine = new LocalOcrFallbackEngine();

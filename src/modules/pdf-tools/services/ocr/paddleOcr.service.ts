import type {
  ExtractedElement,
  OcrEngine,
  OcrPageResult,
  OcrProcessingOptions,
} from '../../types/spatial.types';

export class PaddleOcrEngine implements OcrEngine {
  readonly id = 'paddle-ocr';
  readonly name = 'PaddleOCR (PP-OCRv4 Local)';
  readonly version = '4.0.0';

  private defaultServerUrl = 'http://localhost:5005';

  getServerUrl(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('icdp_paddle_ocr_url') || this.defaultServerUrl;
    }
    return this.defaultServerUrl;
  }

  setServerUrl(url: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('icdp_paddle_ocr_url', url);
    }
  }

  /**
   * Healthcheck to verify if the local PaddleOCR service is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.getServerUrl()}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data.status === 'ok' || Boolean(data.engine);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Process a single page image using PaddleOCR server
   */
  async processPage(
    imageSource: HTMLCanvasElement | Blob | string,
    pageNumber: number,
    options?: OcrProcessingOptions
  ): Promise<OcrPageResult> {
    const startTime = performance.now();
    const serverUrl = options?.serverUrl || this.getServerUrl();

    let base64Image = '';
    let width = 1000;
    let height = 1000;

    if (typeof imageSource === 'string') {
      base64Image = imageSource;
    } else if (imageSource instanceof HTMLCanvasElement) {
      width = imageSource.width;
      height = imageSource.height;
      base64Image = imageSource.toDataURL('image/png');
    } else if (imageSource instanceof Blob) {
      base64Image = await this.blobToBase64(imageSource);
    }

    const payload = {
      image: base64Image,
      page: pageNumber,
      language: options?.language || 'eng+guj',
      dpi: options?.dpi || 300,
    };

    const res = await fetch(`${serverUrl}/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `Local PaddleOCR server returned HTTP ${res.status}: ${res.statusText}`
      );
    }

    const result = await res.json();
    const durationMs = Math.round(performance.now() - startTime);

    const elements: ExtractedElement[] = [];

    // Parse boxes from PaddleOCR response format:
    // [{ text: "કુલ રકમ", confidence: 0.98, box: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]] }]
    if (result.results && Array.isArray(result.results)) {
      for (let i = 0; i < result.results.length; i++) {
        const item = result.results[i];
        const text = (item.text || '').trim();
        if (!text) continue;

        let x0 = 0;
        let y0 = 0;
        let x1 = 0;
        let y1 = 0;

        if (Array.isArray(item.box) && item.box.length >= 4) {
          const xs = item.box.map((pt: number[]) => pt[0]);
          const ys = item.box.map((pt: number[]) => pt[1]);
          x0 = Math.min(...xs);
          y0 = Math.min(...ys);
          x1 = Math.max(...xs);
          y1 = Math.max(...ys);
        } else if (Array.isArray(item.bbox) && item.bbox.length === 4) {
          x0 = item.bbox[0];
          y0 = item.bbox[1];
          x1 = item.bbox[2];
          y1 = item.bbox[3];
        }

        const rawConf = typeof item.confidence === 'number' ? item.confidence : 0.9;
        const confidence = rawConf <= 1.0 ? Math.round(rawConf * 100) : Math.round(rawConf);

        elements.push({
          id: `paddle-p${pageNumber}-${i + 1}`,
          page: pageNumber,
          text,
          rawText: text,
          x: x0,
          y: y0,
          width: Math.max(1, x1 - x0),
          height: Math.max(1, y1 - y0),
          bbox: [x0, y0, x1, y1],
          source: 'paddle-ocr',
          confidence,
          language: options?.language || 'eng+guj',
          readingOrder: i + 1,
        });
      }
    }

    const avgConfidence =
      elements.length > 0
        ? Math.round(elements.reduce((sum, el) => sum + el.confidence, 0) / elements.length)
        : 85;

    const rawText = elements.map((e) => e.text).join(' ');

    return {
      pageNumber,
      width: result.width || width,
      height: result.height || height,
      elements,
      rawText,
      confidence: avgConfidence,
      engine: 'PaddleOCR (PP-OCRv4 Local)',
      durationMs,
    };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const paddleOcrEngine = new PaddleOcrEngine();

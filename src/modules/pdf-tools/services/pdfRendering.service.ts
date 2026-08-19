import type { BoundingBox } from '../types/spatial.types';

export class PdfRenderingService {
  /**
   * Render a PDF.js page proxy to an HTMLCanvasElement at the specified scale / DPI
   */
  async renderPageToCanvas(
    pageProxy: any,
    scale = 3.125 // 3.125 * 72 DPI ≈ 225 DPI; 4.166 ≈ 300 DPI
  ): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
    const viewport = pageProxy.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not obtain 2D canvas context');
    }

    if (typeof pageProxy.render === 'function') {
      await pageProxy.render({ canvasContext: ctx, viewport }).promise;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return {
      canvas,
      width: viewport.width,
      height: viewport.height,
    };
  }

  /**
   * Crop a bounding box sub-region [x0, y0, x1, y1] from a source canvas.
   * Useful for user-selected region re-OCR.
   */
  cropCanvasRegion(
    sourceCanvas: HTMLCanvasElement,
    bbox: BoundingBox,
    paddingPx = 4
  ): HTMLCanvasElement {
    const [x0, y0, x1, y1] = bbox;
    const cropX = Math.max(0, Math.floor(Math.min(x0, x1) - paddingPx));
    const cropY = Math.max(0, Math.floor(Math.min(y0, y1) - paddingPx));
    const cropW = Math.min(
      sourceCanvas.width - cropX,
      Math.ceil(Math.abs(x1 - x0) + paddingPx * 2)
    );
    const cropH = Math.min(
      sourceCanvas.height - cropY,
      Math.ceil(Math.abs(y1 - y0) + paddingPx * 2)
    );

    if (cropW <= 0 || cropH <= 0) {
      throw new Error('Invalid crop bounding box dimensions');
    }

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;

    const ctx = croppedCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get cropped canvas context');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropW, cropH);

    ctx.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    return croppedCanvas;
  }

  /**
   * Convert canvas to PNG Blob
   */
  canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      }, 'image/png');
    });
  }

  /**
   * Release canvas memory by resetting dimensions
   */
  disposeCanvas(canvas?: HTMLCanvasElement | null): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 1;
    canvas.height = 1;
  }
}

export const pdfRenderingService = new PdfRenderingService();

import type { ImagePreprocessingConfig } from '../types/spatial.types';

export class ImagePreprocessingService {
  readonly defaultConfig: ImagePreprocessingConfig = {
    dpi: 300,
    enableGrayscale: true,
    enableContrastEnhancement: true,
    enableAdaptiveThresholding: false, // Default false to avoid eating delicate Gujarati matras
    enableNoiseRemoval: true,
    enableSharpening: true,
    enableDeskew: true,
  };

  /**
   * Calculates the PDF.js viewport render scale for the target DPI.
   * Standard PDF resolution is 72 DPI.
   */
  getDpiScale(targetDpi = 300): number {
    return Math.max(1.5, Math.min(5.0, targetDpi / 72));
  }

  /**
   * Applies the configured preprocessing filters to an HTML5 Canvas.
   */
  preprocessCanvas(
    canvas: HTMLCanvasElement,
    customConfig?: Partial<ImagePreprocessingConfig>
  ): HTMLCanvasElement {
    const config = { ...this.defaultConfig, ...customConfig };
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const width = canvas.width;
    const height = canvas.height;
    let imgData = ctx.getImageData(0, 0, width, height);

    // 1. Grayscale & Contrast Enhancement
    if (config.enableGrayscale || config.enableContrastEnhancement) {
      imgData = this.applyGrayscaleAndContrast(imgData, config.enableContrastEnhancement);
    }

    // 2. Noise Removal (gentle 3x3 median/box filter)
    if (config.enableNoiseRemoval) {
      imgData = this.applyNoiseRemoval(imgData, width, height);
    }

    // 3. Sharpening filter to enhance character edges
    if (config.enableSharpening) {
      imgData = this.applySharpening(imgData, width, height);
    }

    // 4. Adaptive Binarization (Sauvola / Local Window)
    if (config.enableAdaptiveThresholding) {
      imgData = this.applyAdaptiveThreshold(imgData, width, height);
    }

    ctx.putImageData(imgData, 0, 0);

    // 5. Deskew / Orientation Correction if enabled
    if (config.enableDeskew) {
      this.applyDeskew(canvas, ctx);
    }

    return canvas;
  }

  /**
   * Converts to grayscale and enhances contrast using histogram stretching
   */
  private applyGrayscaleAndContrast(
    imgData: ImageData,
    contrastEnhance: boolean
  ): ImageData {
    const data = imgData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Accurate Rec. 709 luminance weights
      let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (contrastEnhance) {
        // Sigmoid / S-curve contrast boost
        const norm = gray / 255;
        const enhanced = 1 / (1 + Math.exp(-6 * (norm - 0.5)));
        gray = Math.max(0, Math.min(255, Math.round(enhanced * 255)));
      }

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    return imgData;
  }

  /**
   * 3x3 Median / Low-Pass Noise filter
   */
  private applyNoiseRemoval(imgData: ImageData, width: number, height: number): ImageData {
    const src = imgData.data;
    const output = new Uint8ClampedArray(src);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // Sample 3x3 neighborhood luminance
        const neighbors: number[] = [
          src[((y - 1) * width + (x - 1)) * 4],
          src[((y - 1) * width + x) * 4],
          src[((y - 1) * width + (x + 1)) * 4],
          src[(y * width + (x - 1)) * 4],
          src[idx],
          src[(y * width + (x + 1)) * 4],
          src[((y + 1) * width + (x - 1)) * 4],
          src[((y + 1) * width + x) * 4],
          src[((y + 1) * width + (x + 1)) * 4],
        ];

        neighbors.sort((a, b) => a - b);
        const median = neighbors[4]; // 5th element is median

        output[idx] = median;
        output[idx + 1] = median;
        output[idx + 2] = median;
      }
    }

    imgData.data.set(output);
    return imgData;
  }

  /**
   * 3x3 Sharpening Convolution Filter
   * Kernel:
   * [  0, -1,  0 ]
   * [ -1,  5, -1 ]
   * [  0, -1,  0 ]
   */
  private applySharpening(imgData: ImageData, width: number, height: number): ImageData {
    const src = imgData.data;
    const output = new Uint8ClampedArray(src);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        const center = src[idx];
        const top = src[((y - 1) * width + x) * 4];
        const bottom = src[((y + 1) * width + x) * 4];
        const left = src[(y * width + (x - 1)) * 4];
        const right = src[(y * width + (x + 1)) * 4];

        const sharp = 5 * center - top - bottom - left - right;
        const clamped = Math.max(0, Math.min(255, sharp));

        output[idx] = clamped;
        output[idx + 1] = clamped;
        output[idx + 2] = clamped;
      }
    }

    imgData.data.set(output);
    return imgData;
  }

  /**
   * Adaptive local-window thresholding (Sauvola formulation)
   */
  private applyAdaptiveThreshold(imgData: ImageData, width: number, height: number): ImageData {
    const src = imgData.data;
    const output = new Uint8ClampedArray(src);
    const windowSize = 15;
    const halfWin = Math.floor(windowSize / 2);
    const k = 0.2; // Sauvola sensitivity parameter
    const R = 128; // Dynamic range of standard deviation

    // Integral images for fast local mean and variance
    const integral = new Float64Array(width * height);
    const integralSq = new Float64Array(width * height);

    for (let y = 0; y < height; y++) {
      let sum = 0;
      let sumSq = 0;
      for (let x = 0; x < width; x++) {
        const val = src[(y * width + x) * 4];
        sum += val;
        sumSq += val * val;

        const idx = y * width + x;
        const prevRow = y > 0 ? integral[(y - 1) * width + x] : 0;
        const prevRowSq = y > 0 ? integralSq[(y - 1) * width + x] : 0;

        integral[idx] = prevRow + sum;
        integralSq[idx] = prevRowSq + sumSq;
      }
    }

    const getArea = (arr: Float64Array, x1: number, y1: number, x2: number, y2: number) => {
      const a = x1 > 0 && y1 > 0 ? arr[(y1 - 1) * width + (x1 - 1)] : 0;
      const b = y1 > 0 ? arr[(y1 - 1) * width + x2] : 0;
      const c = x1 > 0 ? arr[y2 * width + (x1 - 1)] : 0;
      const d = arr[y2 * width + x2];
      return d - b - c + a;
    };

    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - halfWin);
      const y2 = Math.min(height - 1, y + halfWin);

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - halfWin);
        const x2 = Math.min(width - 1, x + halfWin);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);

        const sum = getArea(integral, x1, y1, x2, y2);
        const sumSq = getArea(integralSq, x1, y1, x2, y2);

        const mean = sum / count;
        const variance = Math.max(0, sumSq / count - mean * mean);
        const stdDev = Math.sqrt(variance);

        const threshold = mean * (1 + k * (stdDev / R - 1));
        const idx = (y * width + x) * 4;
        const val = src[idx] > threshold ? 255 : 0;

        output[idx] = val;
        output[idx + 1] = val;
        output[idx + 2] = val;
      }
    }

    imgData.data.set(output);
    return imgData;
  }

  /**
   * Deskew estimation via projection profile variance
   */
  private applyDeskew(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const width = canvas.width;
    const height = canvas.height;
    const sampleWidth = Math.min(width, 1000);
    const sampleHeight = Math.min(height, 1000);

    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    let bestAngle = 0;
    let maxVariance = 0;

    // Check small angles between -5 deg and +5 deg with 0.5 deg step
    for (let angleDeg = -4; angleDeg <= 4; angleDeg += 0.5) {
      if (angleDeg === 0) continue;
      const rad = (angleDeg * Math.PI) / 180;
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);

      const profile = new Float64Array(sampleHeight);

      for (let y = 0; y < sampleHeight; y += 4) {
        for (let x = 0; x < sampleWidth; x += 4) {
          const val = data[(y * sampleWidth + x) * 4];
          if (val < 128) {
            // Dark text pixel
            const rotY = Math.round(-x * sin + y * cos);
            if (rotY >= 0 && rotY < sampleHeight) {
              profile[rotY]++;
            }
          }
        }
      }

      // Calculate variance of the horizontal projection
      let sum = 0;
      let sumSq = 0;
      for (let i = 0; i < sampleHeight; i++) {
        sum += profile[i];
        sumSq += profile[i] * profile[i];
      }
      const mean = sum / sampleHeight;
      const variance = sumSq / sampleHeight - mean * mean;

      if (variance > maxVariance) {
        maxVariance = variance;
        bestAngle = angleDeg;
      }
    }

    // If a significant skew is detected (> 0.5 deg), rotate canvas
    if (Math.abs(bestAngle) >= 0.5) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((-bestAngle * Math.PI) / 180);
        ctx.drawImage(tempCanvas, -width / 2, -height / 2);
        ctx.restore();
      }
    }
  }
}

export const imagePreprocessingService = new ImagePreprocessingService();

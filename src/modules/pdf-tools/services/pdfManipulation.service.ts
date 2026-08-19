import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { getDocumentProxy } from 'unpdf';

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number; // 0 to 1
  rotationAngle?: number; // degrees, default 45
  colorHex?: string; // e.g. '#64748b'
  position?: 'diagonal' | 'header' | 'footer' | 'center';
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  thumbnailUrl?: string;
}

export type FileInputType = File | Blob | ArrayBuffer | Uint8Array;

async function readFileAsArrayBuffer(file: FileInputType): Promise<ArrayBuffer> {
  if (file instanceof ArrayBuffer) return file;
  if (file instanceof Uint8Array) {
    const copy = new Uint8Array(file.byteLength);
    copy.set(file);
    return copy.buffer as ArrayBuffer;
  }
  if (typeof (file as any).arrayBuffer === 'function') {
    return await (file as any).arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as ArrayBuffer'));
    reader.readAsArrayBuffer(file as Blob);
  });
}

export class PdfManipulationService {
  /**
   * Merge multiple PDF files into a single PDF document using pdf-lib
   */
  async mergePdfs(files: FileInputType[]): Promise<{ data: Uint8Array; pageCount: number }> {
    if (!files || files.length === 0) {
      throw new Error('At least one PDF file is required to merge');
    }

    const mergedDoc = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const donorDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const donorPages = await mergedDoc.copyPages(donorDoc, donorDoc.getPageIndices());
      for (const page of donorPages) {
        mergedDoc.addPage(page);
      }
    }

    const data = await mergedDoc.save();
    return {
      data,
      pageCount: mergedDoc.getPageCount(),
    };
  }

  /**
   * Extract specified 0-indexed page indices from a PDF into a single new PDF
   */
  async splitPdf(file: FileInputType, pageIndices: number[]): Promise<{ data: Uint8Array; pageCount: number }> {
    if (!pageIndices || pageIndices.length === 0) {
      throw new Error('Please select at least one page to extract');
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const targetDoc = await PDFDocument.create();

    const validIndices = pageIndices.filter((idx) => idx >= 0 && idx < sourceDoc.getPageCount());
    if (validIndices.length === 0) {
      throw new Error('No valid pages found in the selected range');
    }

    const copiedPages = await targetDoc.copyPages(sourceDoc, validIndices);
    for (const page of copiedPages) {
      targetDoc.addPage(page);
    }

    const data = await targetDoc.save();
    return {
      data,
      pageCount: targetDoc.getPageCount(),
    };
  }

  /**
   * Split every page of a PDF into individual single-page PDF files and package as ZIP
   */
  async splitAllPagesToZip(
    file: FileInputType,
    baseName = 'document',
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();
    const zip = new JSZip();
    const cleanBaseName = baseName.replace(/\.pdf$/i, '');

    for (let i = 0; i < totalPages; i++) {
      onProgress?.(i + 1, totalPages);
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(sourceDoc, [i]);
      singleDoc.addPage(copiedPage);
      const pageData = await singleDoc.save();

      const pageNumStr = String(i + 1).padStart(String(totalPages).length, '0');
      zip.file(`${cleanBaseName}_page_${pageNumStr}.pdf`, pageData);
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Rotate and/or reorder/delete pages in a PDF
   */
  async organizePdf(
    file: FileInputType,
    pagesConfig: { pageIndex: number; rotation: number }[]
  ): Promise<{ data: Uint8Array; pageCount: number }> {
    if (!pagesConfig || pagesConfig.length === 0) {
      throw new Error('Document must have at least one remaining page');
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const targetDoc = await PDFDocument.create();

    for (const config of pagesConfig) {
      if (config.pageIndex < 0 || config.pageIndex >= sourceDoc.getPageCount()) continue;

      const [copiedPage] = await targetDoc.copyPages(sourceDoc, [config.pageIndex]);
      const currentRot = copiedPage.getRotation().angle;
      const finalRot = (currentRot + config.rotation) % 360;
      copiedPage.setRotation(degrees(finalRot));
      targetDoc.addPage(copiedPage);
    }

    const data = await targetDoc.save();
    return {
      data,
      pageCount: targetDoc.getPageCount(),
    };
  }

  /**
   * Apply customizable text watermark / stamp across PDF pages
   */
  async watermarkPdf(
    file: FileInputType,
    options: WatermarkOptions
  ): Promise<{ data: Uint8Array; pageCount: number }> {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const {
      text,
      fontSize = 42,
      opacity = 0.25,
      rotationAngle = 45,
      colorHex = '#64748b',
      position = 'diagonal',
    } = options;

    const { r, g, b } = this.hexToRgbNormalized(colorHex);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (position === 'diagonal' || position === 'center') {
        const x = (width - textWidth) / 2;
        const y = (height - textHeight) / 2;

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(position === 'diagonal' ? rotationAngle : 0),
        });
      } else if (position === 'header') {
        const x = (width - textWidth) / 2;
        const y = height - 40;

        page.drawText(text, {
          x,
          y,
          size: Math.min(fontSize, 14),
          font,
          color: rgb(r, g, b),
          opacity,
        });
      } else if (position === 'footer') {
        const x = (width - textWidth) / 2;
        const y = 30;

        page.drawText(text, {
          x,
          y,
          size: Math.min(fontSize, 14),
          font,
          color: rgb(r, g, b),
          opacity,
        });
      }
    }

    const data = await pdfDoc.save();
    return {
      data,
      pageCount: pdfDoc.getPageCount(),
    };
  }

  /**
   * Convert multiple images into a multi-page PDF document
   */
  async imagesToPdf(
    images: { file: File; orientation?: 'portrait' | 'landscape' | 'auto'; fit?: boolean }[]
  ): Promise<{ data: Uint8Array; pageCount: number }> {
    if (!images || images.length === 0) {
      throw new Error('At least one image is required');
    }

    const pdfDoc = await PDFDocument.create();

    // Standard A4 dimensions in points (72 points/inch)
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (const imgItem of images) {
      const buffer = await readFileAsArrayBuffer(imgItem.file);
      const uint8 = new Uint8Array(buffer);
      const isPng = imgItem.file.type === 'image/png' || /\.png$/i.test(imgItem.file.name);

      let embeddedImage;
      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(uint8);
        } else {
          embeddedImage = await pdfDoc.embedJpg(uint8);
        }
      } catch {
        try {
          embeddedImage = await pdfDoc.embedPng(uint8);
        } catch {
          const canvas = await this.fileToCanvas(imgItem.file);
          const pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
          const pngBuffer = await readFileAsArrayBuffer(pngBlob);
          embeddedImage = await pdfDoc.embedPng(pngBuffer);
        }
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      const orientation =
        imgItem.orientation === 'auto' || !imgItem.orientation
          ? imgWidth > imgHeight
            ? 'landscape'
            : 'portrait'
          : imgItem.orientation;

      const pageWidth = orientation === 'landscape' ? A4_HEIGHT : A4_WIDTH;
      const pageHeight = orientation === 'landscape' ? A4_WIDTH : A4_HEIGHT;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const margin = 20;
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2;

      const scale = Math.min(availW / imgWidth, availH / imgHeight, 1);
      const finalW = imgWidth * scale;
      const finalH = imgHeight * scale;

      const x = margin + (availW - finalW) / 2;
      const y = margin + (availH - finalH) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: finalW,
        height: finalH,
      });
    }

    const data = await pdfDoc.save();
    return {
      data,
      pageCount: pdfDoc.getPageCount(),
    };
  }

  /**
   * Render PDF pages to high-resolution image data URLs / Blobs
   */
  async pdfToImages(
    file: FileInputType,
    dpi = 200,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ pageNumber: number; dataUrl: string; blob: Blob; width: number; height: number }[]> {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfDoc = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const totalPages = pdfDoc.numPages;
    const scale = dpi / 72; // 72 DPI base
    const results: { pageNumber: number; dataUrl: string; blob: Blob; width: number; height: number }[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx && typeof (page as any).render === 'function') {
        await (page as any).render({ canvasContext: ctx, viewport } as any).promise;
      }

      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      const dataUrl = canvas.toDataURL('image/png');

      results.push({
        pageNumber: pageNum,
        dataUrl,
        blob,
        width: canvas.width,
        height: canvas.height,
      });
    }

    return results;
  }

  /**
   * Package rendered page images into a single ZIP archive
   */
  async packageImagesToZip(
    images: { pageNumber: number; blob: Blob }[],
    baseName = 'document_pages'
  ): Promise<Blob> {
    const zip = new JSZip();
    const total = images.length;

    for (const img of images) {
      const pageNumStr = String(img.pageNumber).padStart(String(total).length, '0');
      zip.file(`${baseName}_page_${pageNumStr}.png`, img.blob);
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Compress PDF by optimizing and re-encoding raster layers for strict portal size limits
   */
  async compressPdf(
    file: FileInputType,
    qualityPreset: 'extreme' | 'recommended' | 'light' = 'recommended',
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    compressedData: Uint8Array;
    originalSizeBytes: number;
    newSizeBytes: number;
    savingsPercent: number;
  }> {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const originalSizeBytes = arrayBuffer.byteLength;

    const settings = {
      extreme: { dpi: 100, jpegQuality: 0.55 },
      recommended: { dpi: 150, jpegQuality: 0.75 },
      light: { dpi: 200, jpegQuality: 0.88 },
    }[qualityPreset];

    const pdfDoc = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const totalPages = pdfDoc.numPages;

    const newPdfDoc = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);
      const page = await pdfDoc.getPage(pageNum);
      const scale = settings.dpi / 72;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx && typeof (page as any).render === 'function') {
        await (page as any).render({ canvasContext: ctx, viewport } as any).promise;
      }

      const jpegBlob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), 'image/jpeg', settings.jpegQuality)
      );
      const jpegBuffer = await readFileAsArrayBuffer(jpegBlob);
      const embeddedJpg = await newPdfDoc.embedJpg(new Uint8Array(jpegBuffer));

      const newPage = newPdfDoc.addPage([viewport.width / scale, viewport.height / scale]);
      newPage.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: newPage.getWidth(),
        height: newPage.getHeight(),
      });
    }

    const compressedData = await newPdfDoc.save();
    const newSizeBytes = compressedData.byteLength;
    const savingsPercent = Math.max(
      0,
      Math.round(((originalSizeBytes - newSizeBytes) / originalSizeBytes) * 100)
    );

    return {
      compressedData,
      originalSizeBytes,
      newSizeBytes,
      savingsPercent,
    };
  }

  /**
   * Helper: Parse page ranges string like "1-3, 5, 8-10" into 0-indexed page indices
   */
  parsePageRangeString(rangeStr: string, totalPages: number): number[] {
    const indices = new Set<number>();
    const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPages, Math.max(start, end));
          for (let i = min; i <= max; i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          indices.add(pageNum - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  /**
   * Helper: Render file thumbnail to canvas
   */
  private async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not load image to canvas'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return canvas;
  }

  /**
   * Universal Composer: Assemble a new PDF document from arbitrary pages across multiple PDFs and Images
   */
  async composeDocument(
    pages: {
      id: string;
      sourceFile: File;
      sourceType: 'pdf' | 'image';
      pageNumberInSource: number;
      rotation: number;
    }[],
    options?: {
      watermark?: WatermarkOptions;
    }
  ): Promise<{ data: Uint8Array; pageCount: number }> {
    if (!pages || pages.length === 0) {
      throw new Error('At least one page is required to generate a PDF');
    }

    const targetDoc = await PDFDocument.create();
    const docCache = new Map<string, PDFDocument>();

    // Standard A4 dimensions in points
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (const pageItem of pages) {
      if (pageItem.sourceType === 'pdf') {
        const cacheKey = `${pageItem.sourceFile.name}_${pageItem.sourceFile.size}_${pageItem.sourceFile.lastModified}`;
        let donorDoc = docCache.get(cacheKey);
        if (!donorDoc) {
          const arrayBuffer = await readFileAsArrayBuffer(pageItem.sourceFile);
          donorDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          docCache.set(cacheKey, donorDoc);
        }

        const sourceIndex = pageItem.pageNumberInSource - 1;
        if (sourceIndex >= 0 && sourceIndex < donorDoc.getPageCount()) {
          const [copiedPage] = await targetDoc.copyPages(donorDoc, [sourceIndex]);
          const currentRot = copiedPage.getRotation().angle;
          const finalRot = (currentRot + pageItem.rotation) % 360;
          copiedPage.setRotation(degrees(finalRot));
          targetDoc.addPage(copiedPage);
        }
      } else if (pageItem.sourceType === 'image') {
        const buffer = await readFileAsArrayBuffer(pageItem.sourceFile);
        const uint8 = new Uint8Array(buffer);
        const isPng = pageItem.sourceFile.type === 'image/png' || /\.png$/i.test(pageItem.sourceFile.name);

        let embeddedImage;
        try {
          if (isPng) {
            embeddedImage = await targetDoc.embedPng(uint8);
          } else {
            embeddedImage = await targetDoc.embedJpg(uint8);
          }
        } catch {
          // Fallback: transcode via canvas to JPEG
          const canvas = await this.fileToCanvas(pageItem.sourceFile);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const base64 = dataUrl.split(',')[1];
          const binStr = atob(base64);
          const len = binStr.length;
          const bytes = new Uint8Array(len);
          for (let k = 0; k < len; k++) bytes[k] = binStr.charCodeAt(k);
          embeddedImage = await targetDoc.embedJpg(bytes);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;
        const isLandscape = imgWidth > imgHeight;
        const pageW = isLandscape ? A4_HEIGHT : A4_WIDTH;
        const pageH = isLandscape ? A4_WIDTH : A4_HEIGHT;

        const page = targetDoc.addPage([pageW, pageH]);
        const margin = 20;
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2;

        const scale = Math.min(availW / imgWidth, availH / imgHeight, 1);
        const finalW = imgWidth * scale;
        const finalH = imgHeight * scale;

        const x = margin + (availW - finalW) / 2;
        const y = margin + (availH - finalH) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: finalW,
          height: finalH,
        });

        if (pageItem.rotation !== 0) {
          page.setRotation(degrees(pageItem.rotation % 360));
        }
      }
    }

    if (options?.watermark && options.watermark.text.trim()) {
      const { text, fontSize = 42, opacity = 0.25, rotationAngle = 45, colorHex = '#64748b', position = 'diagonal' } = options.watermark;
      const font = await targetDoc.embedFont(StandardFonts.HelveticaBold);
      const { r, g, b } = this.hexToRgbNormalized(colorHex);

      const totalTargetPages = targetDoc.getPageCount();
      for (let i = 0; i < totalTargetPages; i++) {
        const page = targetDoc.getPage(i);
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        if (position === 'diagonal') {
          const rad = (rotationAngle * Math.PI) / 180;
          const centerX = width / 2;
          const centerY = height / 2;
          const x = centerX - (textWidth / 2) * Math.cos(rad) + (textHeight / 2) * Math.sin(rad);
          const y = centerY - (textWidth / 2) * Math.sin(rad) - (textHeight / 2) * Math.cos(rad);

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(r, g, b),
            rotate: degrees(rotationAngle),
            opacity,
          });
        } else if (position === 'header') {
          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: height - 40,
            size: Math.min(fontSize, 14),
            font,
            color: rgb(r, g, b),
            opacity,
          });
        } else if (position === 'footer') {
          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: 30,
            size: Math.min(fontSize, 14),
            font,
            color: rgb(r, g, b),
            opacity,
          });
        }
      }
    }

    const data = await targetDoc.save();
    return {
      data,
      pageCount: targetDoc.getPageCount(),
    };
  }

  /**
   * Helper: Convert hex color to normalized RGB (0 to 1)
   */
  private hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return { r: 0.4, g: 0.45, b: 0.55 };
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255,
    };
  }
}

export const pdfManipulationService = new PdfManipulationService();

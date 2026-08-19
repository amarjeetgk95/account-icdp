import { getDocumentProxy } from 'unpdf';
import { nativePdfEngine } from './ocr/nativePdf.service';
import { ocrRegistryService } from './ocr/ocrRegistry.service';
import { imagePreprocessingService } from './imagePreprocessing.service';
import { spatialGridService } from './spatialGrid.service';
import type {
  ExtractedElement,
  ExtractionOptions,
  OcrProgressState,
  SpatialDocument,
  SpatialPage,
  SpatialTable,
} from '../types';

export class HybridPdfExtractorService {
  private defaultOptions: ExtractionOptions = {
    mode: 'hybrid',
    language: 'eng+guj',
    renderScale: 2.0, // Clean, fast rendering
    contrastEnhancement: true,
    binarization: false,
    tableOptions: {
      minColumns: 2,
      lineThresholdPx: 8,
      columnGapThresholdPx: 20,
      enableNumericParsing: true,
      detectCurrencySymbols: true,
      detectHeaderRows: true,
      detectTotalRows: true,
      detectMergedHeaders: true,
    },
  };

  /**
   * Main entry point to extract PDF or Image into a SpatialDocument
   */
  async extractDocument(
    fileOrBuffer: File | ArrayBuffer,
    fileName = 'document.pdf',
    customOptions?: Partial<ExtractionOptions>,
    onProgress?: (progress: OcrProgressState) => void
  ): Promise<SpatialDocument> {
    const startTime = performance.now();
    const options: ExtractionOptions = { ...this.defaultOptions, ...customOptions };

    let arrayBuffer: ArrayBuffer;
    let fileSizeBytes = 0;

    if (fileOrBuffer instanceof File) {
      fileSizeBytes = fileOrBuffer.size;
      fileName = fileOrBuffer.name || fileName;
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      fileSizeBytes = fileOrBuffer.byteLength;
      arrayBuffer = fileOrBuffer;
    }

    const uint8Data = new Uint8Array(arrayBuffer.slice(0));

    // 1. Check if file is directly an image (PNG, JPG, TIFF, WebP)
    const isImageFile = /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(fileName);
    if (isImageFile) {
      return this.extractFromImage(
        uint8Data,
        fileName,
        fileSizeBytes,
        options,
        startTime,
        onProgress
      );
    }

    // 2. Load PDF Document via unpdf / PDF.js proxy
    onProgress?.({
      stage: 'rendering',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 10,
      currentMessage: 'Opening PDF document...',
    });

    const pdfDataCopy = new Uint8Array(uint8Data.slice().buffer);
    const pdfDoc = await getDocumentProxy(pdfDataCopy);
    const totalPages = pdfDoc.numPages;
    const pages: SpatialPage[] = [];

    const activeOcrEngine = await ocrRegistryService.getActiveEngine();
    let isOverallNative = true;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({
        stage: 'rendering',
        currentPage: pageNum,
        totalPages,
        progressPercent: Math.round(((pageNum - 1) / totalPages) * 100),
        currentMessage: `Processing page ${pageNum} of ${totalPages}...`,
      });

      const page = await pdfDoc.getPage(pageNum);
      const renderScale = options.renderScale || 2.0;
      const viewport = page.getViewport({ scale: renderScale });

      // Render visual canvas for the page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = Math.floor(viewport.width);
      pageCanvas.height = Math.floor(viewport.height);
      const ctx = pageCanvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        try {
          if (typeof (page as any).render === 'function') {
            await (page as any).render({ canvasContext: ctx, viewport } as any).promise;
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          }
        } catch {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        }
      }

      // Step 1: Extract Vector Digital Text + Gujarati Recovery
      let extractedElements: ExtractedElement[] = [];
      let pageRawText = '';
      let pageConfidence = 100;
      let isScanned = false;
      let ocrDurationMs = 0;

      try {
        const nativeResult = await nativePdfEngine.extractPage(page, pageNum, renderScale);
        if (nativeResult.elements.length > 0) {
          extractedElements = nativeResult.elements;
          pageRawText = nativeResult.rawText;
          pageConfidence = nativeResult.confidence;
        }
      } catch (err) {
        console.warn(`[HybridPdfExtractor] Native vector extraction note on page ${pageNum}:`, err);
      }

      // Step 2: If page contains zero vector text or user forced OCR, invoke OCR engine
      if (extractedElements.length === 0 || options.mode === 'ocr_only') {
        isScanned = true;
        isOverallNative = false;

        onProgress?.({
          stage: 'ocr',
          currentPage: pageNum,
          totalPages,
          progressPercent: Math.round(((pageNum - 0.5) / totalPages) * 100),
          currentMessage: `Running OCR on page ${pageNum}...`,
        });

        try {
          const ocrStartTime = performance.now();
          const ocrResult = await activeOcrEngine.processPage(pageCanvas, pageNum, {
            language: options.language,
            dpi: 200,
          });
          ocrDurationMs = Math.round(performance.now() - ocrStartTime);

          if (ocrResult.elements.length > 0) {
            extractedElements = ocrResult.elements;
            pageRawText = ocrResult.rawText;
            pageConfidence = ocrResult.confidence;
          }
        } catch (ocrErr) {
          console.warn(`[HybridPdfExtractor] OCR processing note on page ${pageNum}:`, ocrErr);
        }
      }

      // Step 3: Spatial 2D Grid Reconstruction
      onProgress?.({
        stage: 'detecting_tables',
        currentPage: pageNum,
        totalPages,
        progressPercent: Math.round((pageNum / totalPages) * 100),
        currentMessage: `Building 2D spreadsheet layout (Page ${pageNum})...`,
      });

      const { tables, paragraphs } = spatialGridService.reconstructSpatialDocument(
        extractedElements,
        pageNum,
        viewport.width,
        viewport.height,
        {
          minColumns: options.tableOptions?.minColumns,
          yTolerancePx: options.tableOptions?.lineThresholdPx,
          columnGapThresholdPx: options.tableOptions?.columnGapThresholdPx,
          enableMergedHeaderDetection: options.tableOptions?.detectMergedHeaders,
        }
      );

      pages.push({
        pageNumber: pageNum,
        width: viewport.width,
        height: viewport.height,
        dpi: 200,
        isScanned,
        elements: extractedElements,
        tables,
        paragraphs,
        rawText: pageRawText,
        confidence: pageConfidence,
        renderingDurationMs: 0,
        ocrDurationMs,
        canvasElement: pageCanvas,
      });
    }

    const consolidatedTables: SpatialTable[] = pages.flatMap((p) => p.tables);
    const allText = pages.map((p) => p.rawText).join('\n\n--- Page Break ---\n\n');
    const overallConfidence =
      pages.length > 0
        ? Math.round(pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length)
        : 95;

    const durationMs = Math.round(performance.now() - startTime);

    onProgress?.({
      stage: 'completed',
      currentPage: totalPages,
      totalPages,
      progressPercent: 100,
      currentMessage: `Document ready in ${(durationMs / 1000).toFixed(1)}s`,
    });

    return {
      fileName,
      fileSizeBytes,
      pageCount: totalPages,
      pages,
      consolidatedTables,
      allText,
      overallConfidence,
      extractionDurationMs: durationMs,
      engineUsed: isOverallNative ? 'PDF.js Vector + Gujarati CMap Recovery' : activeOcrEngine.name,
      isNativeText: isOverallNative,
      metadata: {
        title: fileName.replace(/\.[^/.]+$/, ''),
      },
    };
  }

  /**
   * Extract directly from an image file (PNG/JPG/TIFF)
   */
  private async extractFromImage(
    data: Uint8Array,
    fileName: string,
    fileSizeBytes: number,
    options: ExtractionOptions,
    startTime: number,
    onProgress?: (progress: OcrProgressState) => void
  ): Promise<SpatialDocument> {
    onProgress?.({
      stage: 'rendering',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 20,
      currentMessage: 'Loading image canvas...',
    });

    const blob = new Blob([data.slice().buffer]);
    const imgUrl = URL.createObjectURL(blob);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = imgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context for image');

    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(imgUrl);

    // Apply preprocessing
    imagePreprocessingService.preprocessCanvas(canvas, {
      enableContrastEnhancement: options.contrastEnhancement,
      enableAdaptiveThresholding: options.binarization,
    });

    const activeOcrEngine = await ocrRegistryService.getActiveEngine();

    onProgress?.({
      stage: 'ocr',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 60,
      currentMessage: `Running ${activeOcrEngine.name} on image (${options.language})...`,
    });

    const ocrStartTime = performance.now();
    let ocrResult;
    try {
      ocrResult = await activeOcrEngine.processPage(canvas, 1, {
        language: options.language,
        dpi: 200,
      });
    } catch {
      ocrResult = {
        pageNumber: 1,
        width: canvas.width,
        height: canvas.height,
        elements: [],
        rawText: '',
        confidence: 80,
        engine: activeOcrEngine.name,
        durationMs: 0,
      };
    }
    const ocrDurationMs = Math.round(performance.now() - ocrStartTime);

    // Reconstruct spatial table and invisible grid
    onProgress?.({
      stage: 'detecting_tables',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 90,
      currentMessage: 'Reconstructing spreadsheet layout...',
    });

    const { tables, paragraphs } = spatialGridService.reconstructSpatialDocument(
      ocrResult.elements,
      1,
      canvas.width,
      canvas.height,
      {
        minColumns: options.tableOptions?.minColumns,
        yTolerancePx: options.tableOptions?.lineThresholdPx,
        columnGapThresholdPx: options.tableOptions?.columnGapThresholdPx,
        enableMergedHeaderDetection: options.tableOptions?.detectMergedHeaders,
      }
    );

    const durationMs = Math.round(performance.now() - startTime);

    onProgress?.({
      stage: 'completed',
      currentPage: 1,
      totalPages: 1,
      progressPercent: 100,
      currentMessage: `Image extraction complete in ${(durationMs / 1000).toFixed(1)}s`,
    });

    const page: SpatialPage = {
      pageNumber: 1,
      width: canvas.width,
      height: canvas.height,
      dpi: 200,
      isScanned: true,
      elements: ocrResult.elements,
      tables,
      paragraphs,
      rawText: ocrResult.rawText,
      confidence: ocrResult.confidence,
      renderingDurationMs: 0,
      ocrDurationMs,
      canvasElement: canvas,
    };

    return {
      fileName,
      fileSizeBytes,
      pageCount: 1,
      pages: [page],
      consolidatedTables: tables,
      allText: ocrResult.rawText,
      overallConfidence: ocrResult.confidence,
      extractionDurationMs: durationMs,
      engineUsed: activeOcrEngine.name,
      isNativeText: false,
      metadata: {
        title: fileName.replace(/\.[^/.]+$/, ''),
      },
    };
  }
}

export const hybridPdfExtractorService = new HybridPdfExtractorService();

import { saveAs } from 'file-saver';
import type {
  ProjectDocumentData,
  SpatialDocument,
  SpatialPage,
} from '../types/spatial.types';

export class ProjectPersistenceService {
  /**
   * Serialize a SpatialDocument into a JSON string
   */
  serializeProject(doc: SpatialDocument): string {
    const projectData: ProjectDocumentData = {
      metadata: {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        fileName: doc.fileName,
        fileSizeBytes: doc.fileSizeBytes,
        pageCount: doc.pageCount,
        engineUsed: doc.engineUsed,
        overallConfidence: doc.overallConfidence,
      },
      pages: doc.pages.map((p) => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        dpi: p.dpi,
        isScanned: p.isScanned,
        confidence: p.confidence,
        rawText: p.rawText,
        elements: p.elements,
        tables: p.tables,
        paragraphs: p.paragraphs,
      })),
      consolidatedTables: doc.consolidatedTables,
    };

    return JSON.stringify(projectData, null, 2);
  }

  /**
   * Serialize a SpatialDocument into a structured project JSON blob and trigger file download
   */
  exportProject(doc: SpatialDocument, customFileName?: string): Blob {
    const jsonString = this.serializeProject(doc);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

    const downloadName =
      customFileName ||
      `${doc.fileName.replace(/\.[^/.]+$/, '')}_extraction_project.json`;

    if (
      typeof window !== 'undefined' &&
      typeof window.URL !== 'undefined' &&
      typeof window.URL.createObjectURL === 'function'
    ) {
      try {
        saveAs(blob, downloadName);
      } catch (err) {
        console.warn('[ProjectPersistence] Download skipped in test environment');
      }
    }

    return blob;
  }

  /**
   * Parse and validate a loaded project JSON into a restored SpatialDocument
   */
  async importProject(fileOrText: File | Blob | string): Promise<SpatialDocument> {
    let jsonString: string;
    if (typeof fileOrText === 'string') {
      jsonString = fileOrText;
    } else if (fileOrText instanceof Blob && typeof fileOrText.text === 'function') {
      jsonString = await fileOrText.text();
    } else if (fileOrText instanceof Blob) {
      jsonString = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(fileOrText);
      });
    } else {
      jsonString = String(fileOrText);
    }

    const data = JSON.parse(jsonString) as ProjectDocumentData;

    if (!data.metadata || !Array.isArray(data.pages)) {
      throw new Error('Invalid project file format: missing metadata or pages array');
    }

    const pages: SpatialPage[] = data.pages.map((p) => ({
      pageNumber: p.pageNumber,
      width: p.width,
      height: p.height,
      dpi: p.dpi || 300,
      isScanned: p.isScanned ?? false,
      elements: p.elements || [],
      tables: p.tables || [],
      paragraphs: p.paragraphs || [],
      rawText: p.rawText || '',
      confidence: p.confidence || 90,
      renderingDurationMs: 0,
      ocrDurationMs: 0,
    }));

    const consolidatedTables =
      data.consolidatedTables && data.consolidatedTables.length > 0
        ? data.consolidatedTables
        : pages.flatMap((p) => p.tables);

    const allText = pages.map((p) => p.rawText).join('\n\n--- Page Break ---\n\n');

    return {
      fileName: data.metadata.fileName || 'restored_project.pdf',
      fileSizeBytes: data.metadata.fileSizeBytes || 0,
      pageCount: data.metadata.pageCount || pages.length,
      pages,
      consolidatedTables,
      allText,
      overallConfidence: data.metadata.overallConfidence || 95,
      extractionDurationMs: 0,
      engineUsed: `${data.metadata.engineUsed || 'Saved Project'} (Restored)`,
      isNativeText: true,
      metadata: {
        title: data.metadata.fileName?.replace(/\.[^/.]+$/, ''),
        version: data.metadata.version,
      },
    };
  }
}

export const projectPersistenceService = new ProjectPersistenceService();

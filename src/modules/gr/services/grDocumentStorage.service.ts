import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/core/supabase/client';
import type { Database } from '@/shared/database.types';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_SIZE_MB,
  PDF_SIGNATURE,
} from '../constants';

/** Private bucket that stores every GR PDF exactly once. */
export const GR_DOCUMENTS_BUCKET = 'gr-documents';

/** Signed URLs are short-lived: generate one on demand, never persist them. */
export const GR_DOCUMENT_URL_TTL_SECONDS = 300;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface GRDocumentUploadResult {
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class DocumentUnavailableError extends Error {
  constructor(message = 'The PDF document is not available in storage.') {
    super(message);
    this.name = 'DocumentUnavailableError';
  }
}

type DBClient = SupabaseClient<Database>;

/**
 * Stores GR PDFs in Supabase Storage and serves them through short-lived
 * signed URLs. Object layout is `gr/{gr_repository.id}/{unique}-{file}.pdf`
 * so storage RLS can authorize access per GR.
 */
export class GRDocumentStorageService {
  constructor(private readonly client: DBClient = defaultSupabase) {}

  async validatePdfFile(file: File | Blob, originalFileName?: string): Promise<FileValidationResult> {
    const name = ((file instanceof File ? file.name : undefined) || originalFileName || 'document.pdf').trim();

    if (!name) {
      return { isValid: false, error: 'The uploaded file has no name.' };
    }

    const ext = `.${name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        isValid: false,
        error: `Invalid file format (${ext}). Only standard PDF files (.pdf) are permitted.`,
      };
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid MIME type (${file.type}). Expected application/pdf.`,
      };
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size exceeds the ${MAX_PDF_SIZE_MB}MB maximum limit (actual: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }

    if (file.size === 0) {
      return { isValid: false, error: 'The uploaded file is empty (0 bytes).' };
    }

    const header = await this.readSignature(file);
    if (header && !header.startsWith(PDF_SIGNATURE)) {
      return {
        isValid: false,
        error: 'Corrupted or invalid PDF signature. The file does not have a standard PDF header.',
      };
    }

    return { isValid: true };
  }

  sanitizeFileName(fileName: string): string {
    const base = fileName.split(/[/\\]/).pop() || 'document.pdf';
    const clean = base
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 150);
    return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
  }

  generateStoragePath(fileName: string, grId: string): string {
    const safeGrId = String(grId).replace(/[^a-zA-Z0-9_-]/g, '');
    const unique =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Date.now().toString(36);
    return `gr/${safeGrId}/${unique}-${this.sanitizeFileName(fileName)}`;
  }

  async uploadPdf(
    file: File | Blob,
    fileName: string,
    grId: string,
    onProgress?: (percent: number) => void
  ): Promise<GRDocumentUploadResult> {
    const validation = await this.validatePdfFile(file, fileName);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid PDF file.');
    }

    const storagePath = this.generateStoragePath(fileName, grId);
    const sanitizedName = this.sanitizeFileName(fileName);

    onProgress?.(25);

    const { error } = await this.client.storage.from(GR_DOCUMENTS_BUCKET).upload(storagePath, file, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw new Error(`Document storage upload failed: ${error.message} The GR was not saved.`);
    }

    onProgress?.(100);

    return {
      storagePath,
      fileName: sanitizedName,
      fileSize: file.size,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Create a short-lived signed URL for a private GR PDF.
   * Generate it when the user opens/downloads the document — never store it.
   */
  async getDocumentUrl(
    storagePath: string,
    expiresInSeconds: number = GR_DOCUMENT_URL_TTL_SECONDS
  ): Promise<string> {
    if (!storagePath) {
      throw new DocumentUnavailableError('Missing document storage path.');
    }

    const { data, error } = await this.client.storage
      .from(GR_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new DocumentUnavailableError(
        error?.message || 'The PDF document is not available in storage.'
      );
    }

    return data.signedUrl;
  }

  /** Open a GR PDF in a new tab. Opens the tab eagerly so popup blockers do not fire. */
  async openDocument(storagePath: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new DocumentUnavailableError('Cannot open documents outside the browser.');
    }

    const popup = window.open('', '_blank');
    try {
      const url = await this.getDocumentUrl(storagePath);
      if (popup) {
        popup.opener = null;
        popup.location.replace(url);
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      popup?.close();
      throw err;
    }
  }

  async deletePdf(storagePath: string): Promise<void> {
    if (!storagePath) return;

    const { error } = await this.client.storage.from(GR_DOCUMENTS_BUCKET).remove([storagePath]);
    if (error) {
      console.warn(`[GRStorage] Could not remove stored document "${storagePath}":`, error.message);
    }
  }

  private async readSignature(file: File | Blob): Promise<string> {
    try {
      const slice = file.slice(0, PDF_SIGNATURE.length);
      if (typeof slice.arrayBuffer === 'function') {
        const buffer = await slice.arrayBuffer();
        return String.fromCharCode(...new Uint8Array(buffer));
      }
      if (typeof slice.text === 'function') {
        return await slice.text();
      }
      if (typeof FileReader !== 'undefined') {
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(slice);
        });
        return String.fromCharCode(...new Uint8Array(buffer));
      }
    } catch {
      // Signature could not be read; other checks still apply
    }
    return '';
  }
}

export const grDocumentStorage = new GRDocumentStorageService();

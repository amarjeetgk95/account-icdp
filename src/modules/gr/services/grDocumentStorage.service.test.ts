import { describe, it, expect, beforeEach, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => storageMocks),
    },
  },
}));

import {
  GRDocumentStorageService,
  GR_DOCUMENTS_BUCKET,
  DocumentUnavailableError,
} from './grDocumentStorage.service';
import { supabase } from '@/core/supabase/client';

function createMockPdfBlob(content = '%PDF-1.4 mock content'): Blob {
  return new Blob([content], { type: 'application/pdf' });
}

describe('GRDocumentStorageService', () => {
  let service: GRDocumentStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GRDocumentStorageService();
  });

  describe('validatePdfFile', () => {
    it('validates a valid PDF file with %PDF- header', async () => {
      const blob = createMockPdfBlob('%PDF-1.7 standard resolution content');
      const result = await service.validatePdfFile(blob, 'GR_2026_001.pdf');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts uppercase .PDF extensions', async () => {
      const result = await service.validatePdfFile(createMockPdfBlob(), 'RESOLUTION.PDF');
      expect(result.isValid).toBe(true);
    });

    it('rejects files without .pdf extension', async () => {
      const result = await service.validatePdfFile(createMockPdfBlob(), 'report.docx');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Only standard PDF files');
    });

    it('rejects non-PDF MIME types', async () => {
      const blob = new Blob(['%PDF-1.4'], { type: 'image/png' });
      const result = await service.validatePdfFile(blob, 'image.pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid MIME type');
    });

    it('rejects corrupted files without %PDF- magic bytes', async () => {
      const blob = new Blob(['NOT A PDF FILE CONTENT'], { type: 'application/pdf' });
      const result = await service.validatePdfFile(blob, 'corrupt.pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Corrupted or invalid PDF signature');
    });

    it('rejects empty files (0 bytes)', async () => {
      const blob = new Blob([], { type: 'application/pdf' });
      const result = await service.validatePdfFile(blob, 'empty.pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('0 bytes');
    });
  });

  describe('sanitizeFileName', () => {
    it('removes directory traversal and unsafe characters', () => {
      expect(service.sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
      expect(service.sanitizeFileName('C:\\Users\\admin\\document.pdf')).toBe('document.pdf');
      expect(service.sanitizeFileName('GR 2026 #1 (Final).pdf')).toBe('GR_2026_1_Final_.pdf');
    });

    it('ensures .pdf extension is appended', () => {
      expect(service.sanitizeFileName('resolution_order')).toBe('resolution_order.pdf');
    });
  });

  describe('generateStoragePath', () => {
    it('scopes the object under the GR id and sanitizes the file name', () => {
      const path = service.generateStoragePath('GR 2026 #1.pdf', 'gr-123');
      expect(path).toMatch(/^gr\/gr-123\/[a-z0-9-]+-GR_2026_1\.pdf$/);
    });

    it('strips unsafe characters from the GR id', () => {
      const path = service.generateStoragePath('order.pdf', '../gr/123');
      expect(path.startsWith('gr/gr123/')).toBe(true);
    });
  });

  describe('uploadPdf', () => {
    it('uploads to the private gr-documents bucket', async () => {
      storageMocks.upload.mockResolvedValue({ error: null });
      const blob = createMockPdfBlob();

      const result = await service.uploadPdf(blob, 'Recruitment_Rules.pdf', 'gr-1');

      expect(vi.mocked(supabase.storage.from)).toHaveBeenCalledWith(GR_DOCUMENTS_BUCKET);
      expect(storageMocks.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^gr\/gr-1\/[a-z0-9-]+-Recruitment_Rules\.pdf$/),
        blob,
        expect.objectContaining({ contentType: 'application/pdf', upsert: false })
      );
      expect(result.storagePath).toMatch(/^gr\/gr-1\//);
      expect(result.fileName).toBe('Recruitment_Rules.pdf');
      expect(result.fileSize).toBe(blob.size);
    });

    it('throws a descriptive error when storage rejects the upload', async () => {
      storageMocks.upload.mockResolvedValue({ error: { message: 'quota exceeded' } });

      await expect(
        service.uploadPdf(createMockPdfBlob(), 'fail.pdf', 'gr-1')
      ).rejects.toThrow(/upload failed.*quota exceeded/i);
    });

    it('rejects invalid files before touching storage', async () => {
      await expect(
        service.uploadPdf(new Blob(['not a pdf'], { type: 'text/plain' }), 'bad.txt', 'gr-1')
      ).rejects.toThrow(/Invalid file format/i);
      expect(storageMocks.upload).not.toHaveBeenCalled();
    });
  });

  describe('getDocumentUrl', () => {
    it('returns a short-lived signed URL', async () => {
      storageMocks.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/gr-documents/gr/1/a.pdf?token=x' },
        error: null,
      });

      const url = await service.getDocumentUrl('gr/1/a.pdf');

      expect(storageMocks.createSignedUrl).toHaveBeenCalledWith('gr/1/a.pdf', 300);
      expect(url).toContain('token=');
    });

    it('fails clearly when the object is unavailable', async () => {
      storageMocks.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Object not found' },
      });

      await expect(service.getDocumentUrl('gr/1/missing.pdf')).rejects.toBeInstanceOf(
        DocumentUnavailableError
      );
    });

    it('rejects missing storage paths', async () => {
      await expect(service.getDocumentUrl('')).rejects.toThrow(/Missing document/i);
      expect(storageMocks.createSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('deletePdf', () => {
    it('removes the object from the bucket', async () => {
      storageMocks.remove.mockResolvedValue({ error: null });

      await service.deletePdf('gr/1/a.pdf');

      expect(storageMocks.remove).toHaveBeenCalledWith(['gr/1/a.pdf']);
    });

    it('does nothing for empty paths', async () => {
      await service.deletePdf('');
      expect(storageMocks.remove).not.toHaveBeenCalled();
    });

    it('does not throw when remote deletion fails', async () => {
      storageMocks.remove.mockResolvedValue({ error: { message: 'not found' } });
      await expect(service.deletePdf('gr/1/a.pdf')).resolves.not.toThrow();
    });
  });
});

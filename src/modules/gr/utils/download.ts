import { grDocumentStorage } from '../services/grDocumentStorage.service';
import type { GRRecord } from '../types';

export function buildDownloadFileName(gr: GRRecord): string {
  const raw = gr.file_name?.trim() || `${gr.gr_number || 'document'}.pdf`;
  const safe = raw.replace(/[/\\:*?"<>|]/g, '_');
  return /\.pdf$/i.test(safe) ? safe : `${safe}.pdf`;
}

export async function downloadGRDocument(gr: GRRecord): Promise<void> {
  const url = await grDocumentStorage.getDocumentUrl(gr.storage_path);
  const fileName = buildDownloadFileName(gr);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerAnchorDownload(objectUrl, fileName);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (fetchErr) {
    console.warn('[GRDownload] Blob download failed, falling back to direct link:', fetchErr);
    triggerAnchorDownload(url, fileName);
  }
}

function triggerAnchorDownload(href: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

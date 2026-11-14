// ============================================================================
// SHARED DOWNLOAD HELPERS — anchor-click downloads for blobs / text / data URIs
// Canonical home for the "create object URL, click a temporary <a>, clean up"
// pattern that used to be copy-pasted across ~10 modules.
// ============================================================================

/**
 * Trigger a download for an arbitrary href (blob: object URL or data: URI)
 * via a temporary anchor element.
 */
export function triggerDownload(href: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Download a Blob. The object URL is revoked after a short delay so the
 * browser has a chance to start the download first.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/** Download a text payload (UTF-8). */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  downloadBlob(new Blob([content], { type: mimeType }), fileName);
}

/**
 * Download CSV text. Pass `withBom` to prepend a UTF-8 BOM (Excel needs it
 * to open Gujarati/Hindi text in the right encoding). The BOM is written as
 * an escape, never a literal invisible character.
 */
export function downloadCsvContent(fileName: string, csvContent: string, withBom = false): void {
  downloadTextFile(fileName, (withBom ? '\uFEFF' : '') + csvContent, 'text/csv;charset=utf-8;');
}

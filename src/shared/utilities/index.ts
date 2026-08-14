export function formatCurrency(amount: unknown): string {
  const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(date: unknown): string {
  if (!date) return '-';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : (date as Date);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: unknown): string {
  if (!date) return '-';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : (date as Date);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN');
}

export function formatNumber(value: unknown): string {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : Number(value) || 0;
  return new Intl.NumberFormat('en-IN').format(n);
}

export function parseDateLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3]);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function num(value: unknown): number {
  const n = Number(value);
  return isFinite(n) ? n : 0;
}

export function money(value: unknown): number {
  return Math.round(num(value) * 100) / 100;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const cell = (value: string | number) => {
    const v = String(value == null ? '' : value);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  const lines = [headers.map(cell).join(',')].concat(
    rows.map((r) => r.map(cell).join(','))
  );
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

export * from './excelExport';
export * from './rpc';


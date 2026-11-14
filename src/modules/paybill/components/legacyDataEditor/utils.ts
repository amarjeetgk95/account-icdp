import type { EstablishmentEmployee } from '@/modules/establishment/types';

export function findEstablishmentEmployee(
  employees: EstablishmentEmployee[],
  hrpn: string,
  _fy?: number
): EstablishmentEmployee | null {
  const clean = hrpn.trim().toLowerCase();
  if (!clean) return null;
  const match = employees.find(
    (e) => (e.hrpnNo || '').trim().toLowerCase() === clean
  );
  return match ?? null;
}

export const formatInr = (n: number | undefined, allowZeroDash = false) => {
  if (allowZeroDash && (!n || n === 0)) return '—';
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
};

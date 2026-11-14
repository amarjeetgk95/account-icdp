import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toEnglishDigits, isComposingEvent } from '@/shared/utilities/digits';
import { useEstablishmentEmployees } from '../hooks/useEstablishment';
import { Search } from 'lucide-react';

export interface EmployeeHrpnHit {
  id: string;
  hrpn: string;
  name: string;
  nameGu: string;
  mobile?: string;
  designation?: string;
}

interface HrpnLookupInputProps {
  value: string;
  onChange: (next: string) => void;
  onPick?: (hit: EmployeeHrpnHit) => void;
  placeholder?: string;
  disabled?: boolean;
  tone?: 'default' | 'charge';
  id?: string;
}

export const HrpnLookupInput: React.FC<HrpnLookupInputProps> = ({
  value,
  onChange,
  onPick,
  placeholder = 'Enter HRPN to search...',
  disabled,
  tone = 'default',
  id,
}) => {
  const employeesQuery = useEstablishmentEmployees();
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside or Escape
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hits = useMemo(() => {
    const q = toEnglishDigits(value || '').trim().toLowerCase();
    if (!q || q === '-') return [];

    return employees
      .filter((e) => {
        const hrpn = (e.hrpnNo || '').toLowerCase();
        const name = (e.name || '').toLowerCase();
        const nameGu = (e.nameGu || '').toLowerCase();
        const desig = (e.designationGu || e.designation || '').toLowerCase();
        return hrpn.includes(q) || name.includes(q) || nameGu.includes(q) || desig.includes(q);
      })
      .slice(0, 8)
      .map((e) => ({
        id: e.id,
        hrpn: e.hrpnNo || '-',
        name: e.name,
        nameGu: e.nameGu || e.name,
        mobile: e.mobileNo || '',
        designation: e.designationGu || e.designation || '',
      }));
  }, [value, employees]);

  const handleChange = (next: string, composing = false) => {
    if (composing) {
      onChange(next);
      return;
    }
    const normalized = toEnglishDigits(next);
    onChange(normalized);
    setOpen(normalized.trim().length > 1);
  };

  const pickHit = (hit: EmployeeHrpnHit) => {
    onChange(hit.hrpn);
    onPick?.(hit);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value, isComposingEvent(e))}
          onCompositionEnd={(e) => handleChange(e.currentTarget.value, false)}
          onFocus={() => {
            if (value.trim().length > 1 && hits.length > 0) setOpen(true);
          }}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 transition focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${
            tone === 'charge'
              ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
          }`}
        />
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
          <Search className="h-4 w-4" />
        </div>
      </div>

      {open && hits.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {hits.map((hit) => (
            <li
              key={hit.id}
              onMouseDown={() => pickHit(hit)}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition hover:bg-slate-50"
            >
              <div>
                <span className="font-semibold text-slate-900">{hit.nameGu}</span>
                {hit.nameGu !== hit.name && (
                  <span className="ml-1 text-slate-500">({hit.name})</span>
                )}
                {hit.designation && (
                  <span className="block text-[11px] text-slate-500">{hit.designation}</span>
                )}
              </div>
              <div className="text-right">
                <span className="font-mono font-medium text-blue-700">{hit.hrpn}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

import React from 'react';
import { todayDDMMYYYY } from '@/shared/utilities/date';

let cachedDay: string | null = null;
const sharedToday = (): string => {
  const now = todayDDMMYYYY();
  if (now !== cachedDay) cachedDay = now;
  return cachedDay;
};

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  note?: React.ReactNode;
  date?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, note, date }) => {
  const today = sharedToday();
  return (
    <div className="hidden print-only text-center p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && <h3 className="text-sm font-semibold mt-0.5">{subtitle}</h3>}
      {note && <div className="mt-1 text-xs text-slate-700">{note}</div>}
      <p className="text-xs text-slate-600 mt-1">Date: {date ?? today}</p>
    </div>
  );
};

export const PrintFooter: React.FC<{ date?: string; footerNote?: string }> = ({ date, footerNote }) => {
  const today = sharedToday();
  const note = (footerNote || '').trim();
  return (
    <div className="hidden print-only mt-8 pt-4 text-center">
      {note && <p className="mb-2 text-xs font-medium text-slate-700">{note}</p>}
      <div className="border-t border-dashed border-slate-300 mx-auto w-1/2" />
      <p className="mt-1 text-[10px] text-slate-500">
        Generated {today}
        {date && date !== today ? ` • Report date ${date}` : ''}
      </p>
    </div>
  );
};

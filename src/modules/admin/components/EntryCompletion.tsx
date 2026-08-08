import { MONTHS } from '@/shared/constants';
import type { OfficeCompletion } from '../types';

interface EntryCompletionProps {
  data: OfficeCompletion[];
  isLoading: boolean;
}

const MONTH_SHORT: Record<string, string> = {
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
};

export function EntryCompletion({ data, isLoading }: EntryCompletionProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="empty-state"><p>No offices yet.</p></div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Office</th>
            <th className="text-center">FY</th>
            {MONTHS.map((m) => (
              <th key={m} className="text-center" title={m}>
                {MONTH_SHORT[m] || m.slice(0, 3)}
              </th>
            ))}
            <th className="text-center">Completion</th>
          </tr>
        </thead>
        <tbody>
          {data.map((office) => {
            const filled = new Set(office.months || []);
            const pct = Math.round((filled.size / MONTHS.length) * 100);
            const complete = filled.size >= MONTHS.length;
            return (
              <tr key={office.office_id}>
                <td className="font-bold">{office.office_name}</td>
                <td className="text-center text-slate-500">
                  {office.fy}-{String(office.fy + 1).slice(-2)}
                </td>
                {MONTHS.map((m) => (
                  <td key={m} className="text-center px-1">
                    <span
                      title={`${office.office_name} — ${m}${filled.has(m) ? '' : ' (missing)'}`}
                      className={
                        'inline-block w-3.5 h-3.5 rounded-full ' +
                        (filled.has(m) ? 'bg-green-500' : 'bg-slate-200')
                      }
                    />
                  </td>
                ))}
                <td className="text-center">
                  <span
                    className={
                      'font-bold ' +
                      (complete ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600')
                    }
                  >
                    {pct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

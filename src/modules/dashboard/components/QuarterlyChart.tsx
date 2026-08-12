import { formatCurrency, num } from '@/shared/utilities';
import { TrendingUp } from 'lucide-react';

interface QuarterlyChartProps {
  salary: Record<string, number>;
  tds: Record<string, number>;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const W = 340;
const H = 170;
const PLOT_L = 42;
const PLOT_R = 334;
const PLOT_T = 30;
const PLOT_B = 138;
const LABEL_Y = 156;

function compact(value: number): string {
  if (value >= 10000000) return `${trim(value / 10000000)}Cr`;
  if (value >= 100000) return `${trim(value / 100000)}L`;
  if (value >= 1000) return `${trim(value / 1000)}K`;
  return String(Math.round(value));
}

function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '');
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / magnitude;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * magnitude;
}

export function QuarterlyChart({ salary, tds }: QuarterlyChartProps) {
  const values = QUARTERS.flatMap((q) => [num(salary?.[q]), num(tds?.[q])]);
  const maxValue = niceMax(Math.max(...values, 1));

  const y = (v: number) => PLOT_B - (v / maxValue) * (PLOT_B - PLOT_T);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => maxValue * f);

  const summary = QUARTERS.map((q) => {
    const s = num(salary?.[q]);
    const t = num(tds?.[q]);
    return `${q} ${formatCurrency(s)} salary, ${formatCurrency(t)} TDS`;
  }).join(', ');

  const groupW = (PLOT_R - PLOT_L) / QUARTERS.length;
  const barW = 16;
  const gap = 4;

  return (
    <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-teal-600 dark:text-teal-400" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
            Quarterly Salary vs TDS
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[9px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="text-slate-500 dark:text-slate-400">Gross</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
            <span className="text-slate-500 dark:text-slate-400">TDS</span>
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full h-full"
          role="img"
          aria-label={`Quarterly salary vs TDS bar chart: ${summary}`}
        >
          {grid.map((g) => (
            <g key={g}>
              <line
                x1={PLOT_L}
                x2={PLOT_R}
                y1={y(g)}
                y2={y(g)}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="1"
                strokeDasharray={g === 0 ? undefined : '3 3'}
              />
              <text
                x={PLOT_L - 6}
                y={y(g) + 3}
                textAnchor="end"
                fontSize="8.5"
                fontWeight="600"
                className="fill-slate-400 dark:fill-slate-500"
              >
                {compact(g)}
              </text>
            </g>
          ))}

          {QUARTERS.map((q, i) => {
            const salaryVal = num(salary?.[q]);
            const tdsVal = num(tds?.[q]);
            const groupX = PLOT_L + i * groupW + (groupW - (barW * 2 + gap)) / 2;
            const salaryX = groupX;
            const tdsX = groupX + barW + gap;
            const salaryY = y(salaryVal);
            const tdsY = y(tdsVal);

            return (
              <g key={q}>
                <rect
                  x={salaryX}
                  y={salaryY}
                  width={barW}
                  height={PLOT_B - salaryY}
                  rx={2.5}
                  className="fill-indigo-600 dark:fill-indigo-500 hover:opacity-80 transition-opacity"
                >
                  <title>{`${q} Gross: ${formatCurrency(salaryVal)}`}</title>
                </rect>
                <rect
                  x={tdsX}
                  y={tdsY}
                  width={barW}
                  height={PLOT_B - tdsY}
                  rx={2.5}
                  className="fill-rose-500 dark:fill-rose-400 hover:opacity-80 transition-opacity"
                >
                  <title>{`${q} TDS: ${formatCurrency(tdsVal)}`}</title>
                </rect>

                {salaryVal > 0 && (
                  <text
                    x={salaryX + barW / 2}
                    y={salaryY - 5}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="700"
                    className="fill-indigo-600 dark:fill-indigo-400"
                  >
                    {compact(salaryVal)}
                  </text>
                )}
                {tdsVal > 0 && (
                  <text
                    x={tdsX + barW / 2}
                    y={tdsY - 5}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="700"
                    className="fill-rose-500 dark:fill-rose-400"
                  >
                    {compact(tdsVal)}
                  </text>
                )}

                <text
                  x={groupX + barW + gap / 2}
                  y={LABEL_Y}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  className="fill-slate-500 dark:fill-slate-400 uppercase"
                >
                  {q}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <span className="sr-only">{summary}</span>
    </div>
  );
}

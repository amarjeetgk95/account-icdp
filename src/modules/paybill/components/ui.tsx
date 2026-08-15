import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared UI kit for the PayBill module — consistent "modern professional"
 * panels, buttons and chips across the import flow, matrix, ledger and settings.
 */

interface PbPanelProps {
  icon?: LucideIcon;
  iconClass?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}

export function PbPanel({
  icon: Icon,
  iconClass = '',
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = '',
  padded = true,
}: PbPanelProps) {
  return (
    <section
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {(Icon || title || actions) && (
        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  iconClass || 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                }`}
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>
            )}
            <div className="min-w-0">
              {title !== undefined && (
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {title}
                </h3>
              )}
              {subtitle !== undefined && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
        </header>
      )}
      <div className={`${padded ? 'p-4 ' : ''}${bodyClassName}`}>{children}</div>
    </section>
  );
}

type PbButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'amber';

const PB_BUTTON_VARIANTS: Record<PbButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm',
  secondary:
    'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
  ghost:
    'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  amber: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
};

interface PbButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PbButtonVariant;
  icon?: LucideIcon;
  size?: 'xs' | 'sm' | 'md';
}

export function PbButton({
  variant = 'secondary',
  icon: Icon,
  size = 'sm',
  className = '',
  children,
  disabled,
  ...rest
}: PbButtonProps) {
  const sizes = {
    xs: 'px-2.5 py-1 text-[0.7rem] gap-1.5 rounded-lg',
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-xs gap-1.5 rounded-xl',
  };
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${sizes[size]} ${PB_BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 15} />}
      {children}
    </button>
  );
}

export type PbChipTone = 'blue' | 'emerald' | 'amber' | 'orange' | 'rose' | 'slate' | 'indigo' | 'red';

const PB_CHIP_TONES: Record<PbChipTone, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  orange:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  slate:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  indigo:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
};

interface PbChipProps {
  tone?: PbChipTone;
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
}

export function PbChip({ tone = 'slate', icon: Icon, title, children }: PbChipProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold border whitespace-nowrap ${PB_CHIP_TONES[tone]}`}
    >
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}
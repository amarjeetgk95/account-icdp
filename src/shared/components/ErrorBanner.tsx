import { CircleAlert } from 'lucide-react';
import { getErrorMessage } from '@/shared/utilities';

interface ErrorBannerProps {
  title?: string;
  error?: unknown;
  message?: string;
  className?: string;
}

export function ErrorBanner({ title, error, message, className = '' }: ErrorBannerProps) {
  const text = message ?? (error !== undefined ? getErrorMessage(error) : '');
  if (!text) return null;

  return (
    <div className={`alert alert-danger rounded-xl flex items-center gap-2 ${className}`}>
      <CircleAlert size={16} className="shrink-0 mt-0.5" />
      <span className="text-xs">
        {title && <strong className="mr-1">{title}</strong>}
        {text}
      </span>
    </div>
  );
}

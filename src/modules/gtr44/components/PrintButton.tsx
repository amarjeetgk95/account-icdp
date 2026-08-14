import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface PrintButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'default',
  label = 'Print / Export PDF',
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      onClick={handlePrint}
      variant={variant}
      size={size}
      className={`print-button font-bold flex items-center gap-2 shadow-sm transition-all ${className}`}
      title="Print GTR-44 document or save as PDF (Ctrl + P)"
    >
      <Printer className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
};

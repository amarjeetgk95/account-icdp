import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export type GTR44Status = 'draft' | 'submitted' | 'passed' | 'objected' | 'ac_adjusted';

interface GTR44StatusBadgeProps {
  status: GTR44Status;
  className?: string;
}

const statusConfig: Record<GTR44Status, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Clock className="w-4 h-4 mr-1" />
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <RefreshCw className="w-4 h-4 mr-1 animate-spin-slow" />
  },
  passed: {
    label: 'Passed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="w-4 h-4 mr-1" />
  },
  objected: {
    label: 'Objected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-4 h-4 mr-1" />
  },
  ac_adjusted: {
    label: 'AC Adjusted',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <AlertCircle className="w-4 h-4 mr-1" />
  }
};

export const GTR44StatusBadge: React.FC<GTR44StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <div 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border transition-colors ${config.color} ${className}`} 
      title={`Status: ${config.label}`}
    >
      {config.icon}
      {config.label}
    </div>
  );
};

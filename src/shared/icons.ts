import { createElement } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  FileBarChart,
  Settings,
  Shield,
  Clock,
  Receipt,
  FileSpreadsheet,
  Upload,
  Layers,
  FilePlus,
  BarChart3,
  UserCheck,
  Calculator,
  Sliders,
  FileText,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

export const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  payroll: Wallet,
  parties: Users,
  reports: FileBarChart,
  settings: Settings,
  admin: Shield,
  adminaudit: Clock,
  gtr44: Receipt,
  paybill: FileSpreadsheet,
  'it-employee': FileSpreadsheet,
};

export const SECTION_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  users: Users,
  reports: FileBarChart,
  audit: Clock,
  upload: Upload,
  layers: Layers,
  'file-plus': FilePlus,
  receipt: Receipt,
  settings: Settings,
  sliders: Sliders,
  calculator: Calculator,
  'file-spreadsheet': FileSpreadsheet,
  'bar-chart': BarChart3,
  user: UserCheck,
  'file-text': FileText,
  'credit-card': CreditCard,
};

export const FALLBACK_ICON: LucideIcon = LayoutDashboard;

export function getModuleIcon(id: string): LucideIcon {
  return MODULE_ICONS[id] || FALLBACK_ICON;
}

export function getSectionIcon(id: string): LucideIcon {
  return SECTION_ICONS[id] || FALLBACK_ICON;
}

interface ModuleIconProps {
  id: string;
  className?: string;
  size?: number;
}

export function ModuleIcon({ id, className, size }: ModuleIconProps) {
  return createElement(getModuleIcon(id), { className, size });
}

interface SectionIconProps {
  id: string;
  className?: string;
  size?: number;
}

export function SectionIcon({ id, className, size }: SectionIconProps) {
  return createElement(getSectionIcon(id), { className, size });
}

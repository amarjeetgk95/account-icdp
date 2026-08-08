import { createElement } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  FileBarChart,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  payroll: Wallet,
  parties: Users,
  reports: FileBarChart,
  settings: Settings,
  admin: Shield,
};

export const SECTION_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  users: Users,
  reports: FileBarChart,
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

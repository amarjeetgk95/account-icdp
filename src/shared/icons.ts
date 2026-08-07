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

export const FALLBACK_ICON: LucideIcon = LayoutDashboard;

export function getModuleIcon(id: string): LucideIcon {
  return MODULE_ICONS[id] || FALLBACK_ICON;
}

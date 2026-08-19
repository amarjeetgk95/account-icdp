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
  Sparkles,
  ScanText,
  Merge,
  Split,
  RotateCw,
  Minimize2,
  Stamp,
  Images,
  Image as ImageIcon,
  Languages,
  Cpu,
  type LucideIcon,
} from 'lucide-react';

const MODULE_ICONS: Record<string, LucideIcon> = {
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
  'pdf-tools': ScanText,
  tools: ScanText,
};

const SECTION_ICONS: Record<string, LucideIcon> = {
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
  'scan-text': ScanText,
  sparkles: Sparkles,
  merge: Merge,
  split: Split,
  'rotate-cw': RotateCw,
  'minimize-2': Minimize2,
  stamp: Stamp,
  images: Images,
  image: ImageIcon,
  languages: Languages,
  cpu: Cpu,
};

const FALLBACK_ICON: LucideIcon = LayoutDashboard;

function getModuleIcon(id: string): LucideIcon {
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

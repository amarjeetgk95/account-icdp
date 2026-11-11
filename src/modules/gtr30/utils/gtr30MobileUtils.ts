import type { GTR30Employee } from '../types';

/**
 * Mobile responsiveness utilities for GTR-30 module
 * Provides responsive layouts and touch-friendly interfaces
 */

export interface MobileLayoutConfig {
  // Card-based layout thresholds
  cardBreakpoint: number;
  // Touch-friendly element sizes
  touchTargetSize: number;
  // Scroll behavior
  smoothScroll: boolean;
  // Orientation handling
  handleOrientation: boolean;
}

export const DEFAULT_MOBILE_CONFIG: MobileLayoutConfig = {
  cardBreakpoint: 768,
  touchTargetSize: 44,
  smoothScroll: true,
  handleOrientation: true,
};

/**
 * Mobile layout classes for responsive styling
 */
export const mobileLayoutClasses = {
  // Container classes
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  // Grid classes
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  gridCards: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  // Table classes (mobile card view)
  table: 'overflow-x-auto',
  tableMobile: 'hidden md:table',
  // Card classes
  card: 'bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4',
  cardInteractive: 'bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 active:bg-blue-50 dark:active:bg-blue-950/40 transition-colors',
  // Button classes
  button: 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 transition-transform',
  buttonBlock: 'w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 transition-transform',
  // Input classes
  input: 'block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:scale-[0.99] transition-transform',
  // Select classes
  select: 'block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:scale-[0.99] transition-transform',
  // Badge classes
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  badgeMobile: 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
};

/**
 * Mobile touch gesture utilities
 */
export interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  endTime: number;
}

/**
 * Detect if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;
}

/**
 * Detect if device has touch capability
 */
export function hasTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get touch target padding for mobile
 */
export function getTouchTargetPadding(): { paddingX: number; paddingY: number } {
  return {
    paddingX: 16,
    paddingY: 12,
  };
}

/**
 * Mobile employee list layout
 */
export function getEmployeeListLayout(employees: GTR30Employee[]): {
  cards: {
    id: string;
    name: string;
    designation: string;
    pay: number;
    gross: number;
    net: number;
  }[];
  columns: string;
} {
  const layout = isMobile() ? 'columns-1' : 'columns-1 sm:columns-2 lg:columns-3';

  const cards = employees.map((emp) => ({
    id: emp.id,
    name: emp.name || 'Unknown',
    designation: emp.designation || '',
    pay: emp.payOfEstablishment || emp.payOfOfficer || 0,
    gross: emp.payOfEstablishment + emp.payOfOfficer + (emp.da || 0) + (emp.hra || 0) + (emp.transportAllowance || 0) + (emp.medicalAllowance || 0),
    net: (emp.payOfEstablishment + emp.payOfOfficer + (emp.da || 0) + (emp.hra || 0) + (emp.transportAllowance || 0) + (emp.medicalAllowance || 0)) -
      ((emp.rentOfBuilding || 0) + (emp.professionalTax || 0) + (emp.npsPension || 0) + (emp.societyDeduction || 0)),
  }));

  return { cards, columns: layout };
}

/**
 * Mobile employee card component structure
 */
export interface MobileEmployeeCardProps {
  employee: GTR30Employee;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Mobile employee card data structure
 */
export function getMobileEmployeeCardData(employee: GTR30Employee) {
  const grossPay = employee.payOfEstablishment + employee.payOfOfficer + (employee.da || 0) + (employee.hra || 0) +
    (employee.transportAllowance || 0) + (employee.medicalAllowance || 0);
  const deductions = (employee.rentOfBuilding || 0) + (employee.professionalTax || 0) + (employee.npsPension || 0) +
    (employee.societyDeduction || 0);
  const netPay = grossPay - deductions;

  return {
    id: employee.id,
    name: employee.name || 'Unknown',
    designation: employee.designation || '',
    designationGujarati: employee.designationGujarati || '',
    cadreClass: employee.cadreClass || '',
    pay: employee.payOfEstablishment || employee.payOfOfficer || 0,
    grossPay,
    deductions,
    netPay,
    hrpnNo: employee.hrpnNo || '',
    payScale: employee.payScale || '',
    insuranceGroup: employee.insuranceGroup || '',
    quarterAddress: employee.quarterAddress || '',
  };
}

/**
 * Mobile form section header
 */
export function getMobileFormSectionHeader(title: string, badge?: string) {
  return {
    title,
    badge,
    className: 'mt-6 mb-3 px-2',
    titleClassName: 'text-sm font-bold uppercase text-slate-800 dark:text-slate-200',
    badgeClassName: 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };
}

/**
 * Mobile table header
 */
export function getMobileTableHeader(headers: { label: string; field: string; align?: 'left' | 'center' | 'right' }[]) {
  return {
    headers,
    className: 'bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700',
  };
}

/**
 * Mobile table row
 */
export function getMobileTableRow(cells: { content: string | number; align?: 'left' | 'center' | 'right' }[]) {
  return {
    cells,
    className: 'border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50',
  };
}

/**
 * Mobile bottom navigation
 */
export function getMobileBottomNavigation(currentTab: string) {
  const tabs = [
    { id: 'employees', label: 'Staff', icon: 'users', href: '#' },
    { id: 'office', label: 'Office', icon: 'building', href: '#' },
    { id: 'establishment', label: 'Posts', icon: 'layout-grid', href: '#' },
    { id: 'preview', label: 'Preview', icon: 'eye', href: '#' },
  ];

  return {
    tabs,
    currentTab,
  };
}

/**
 * MobileFab component configuration
 */
export interface MobileFabConfig {
  icon: string;
  label: string;
  onClick: () => void;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color?: 'blue' | 'green' | 'red' | 'amber';
}

/**
 * Mobile swipe detection
 */
export function detectSwipe(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold: number = 50
): 'left' | 'right' | 'up' | 'down' | null {
  const diffX = endX - startX;
  const diffY = endY - startY;

  if (Math.abs(diffX) < threshold && Math.abs(diffY) < threshold) {
    return null;
  }

  if (Math.abs(diffX) > Math.abs(diffY)) {
    return diffX > 0 ? 'right' : 'left';
  } else {
    return diffY > 0 ? 'down' : 'up';
  }
}

/**
 * Mobile scroll to top
 */
export function scrollToTop(): void {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Mobile scroll to element
 */
export function scrollToElement(elementId: string): void {
  if (typeof document !== 'undefined') {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/**
 * Mobile viewport height fix
 */
export function getViewportHeight(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight || document.documentElement.clientHeight;
}

/**
 * Mobile safe area styles
 */
export const mobileSafeAreaStyles = {
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingTop: 'env(safe-area-inset-top)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
};

/**
 * Mobile animation classes
 */
export const mobileAnimations = {
  fadeIn: 'animate-in fade-in duration-200',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
  scaleIn: 'animate-in scale-in duration-200',
  shake: 'animate-in shake duration-300',
};

/**
 * Mobile density settings
 */
export type MobileDensity = 'comfortable' | 'compact' | 'touch';

export function getDensityClasses(density: MobileDensity) {
  switch (density) {
    case 'compact':
      return {
        paddingX: 'px-2',
        paddingY: 'py-1.5',
        fontSize: 'text-xs',
        gap: 'gap-1',
      };
    case 'touch':
      return {
        paddingX: 'px-4',
        paddingY: 'py-3',
        fontSize: 'text-sm',
        gap: 'gap-2',
      };
    case 'comfortable':
    default:
      return {
        paddingX: 'px-3',
        paddingY: 'py-2',
        fontSize: 'text-sm',
        gap: 'gap-1.5',
      };
  }
}

/**
 * Mobile form field classes
 */
export function getMobileFormFieldClasses(isError: boolean = false) {
  return {
    wrapper: 'space-y-1.5',
    label: 'text-xs font-semibold text-slate-700 dark:text-slate-300',
    input: `
      block w-full px-3 py-2.5 text-sm rounded-lg border ${isError ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}
      bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      placeholder-slate-400 dark:placeholder-slate-600 transition-all
    `,
    error: 'text-xs text-red-600 dark:text-red-400 mt-0.5',
    help: 'text-xs text-slate-500 dark:text-slate-400 mt-0.5',
  };
}

/**
 * Mobile modal classes
 */
export const mobileModalClasses = {
  overlay: 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200',
  container: 'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-bottom-10 duration-300',
  header: 'p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between',
  body: 'p-4 max-h-[70vh] overflow-y-auto',
  footer: 'p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2',
  closeBtn: 'p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
};

/**
 * Mobile tab bar classes
 */
export const mobileTabBarClasses = {
  container: 'fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-1 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
  nav: 'flex justify-around items-center',
  tab: 'flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-colors',
  tabActive: 'text-blue-600 dark:text-blue-400',
  tabInactive: 'text-slate-500 dark:text-slate-400',
  icon: 'w-6 h-6 mb-1',
  label: 'text-[10px] font-medium',
};

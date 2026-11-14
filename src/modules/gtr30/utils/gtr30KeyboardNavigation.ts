import type { GTR30FormData } from '../types';

/**
 * Keyboard navigation utilities for GTR-30 module
 * Provides keyboard shortcuts for efficient data entry and navigation
 */

export interface KeyboardNavigationOptions {
  // Focus management
  onTab?: (element: HTMLElement) => void;
  onShiftTab?: (element: HTMLElement) => void;
  // Navigation between employees
  onNextEmployee?: (currentIdx: number) => void;
  onPrevEmployee?: (currentIdx: number) => void;
  // Bulk operations
  onBulkCalculate?: () => void;
  onBulkSave?: () => void;
  onBulkExport?: () => void;
  // Form navigation
  onNextSection?: () => void;
  onPrevSection?: () => void;
  // Search
  onSearchFocus?: () => void;
}

export interface KeyboardContext {
  currentTab: string;
  currentEmployeeIndex: number;
  isSearchFocused: boolean;
  isFormDirty: boolean;
  hasMultipleEmployees: boolean;
}

/**
 * Default keyboard shortcuts configuration
 */
export const DEFAULT_KEYBOARD_SHORTCUTS = {
  // Global shortcuts (work anywhere in the app)
  global: {
    save: ['ctrl+s', 'meta+s'],
    print: ['ctrl+p', 'meta+p'],
    search: ['ctrl+f', 'meta+f', '/'],
    toggleTheme: ['ctrl+shift+t', 'meta+shift+t'],
  },
  // Bill form shortcuts
  form: {
    nextEmployee: ['ctrl+down', 'ctrl+n'],
    prevEmployee: ['ctrl+up', 'ctrl+p'],
    nextSection: ['ctrl+right', 'ctrl+shift+tab'],
    prevSection: ['ctrl+left', 'ctrl+tab'],
    autoCalculate: ['ctrl+enter', 'ctrl+shift+c'],
    bulkCalculate: ['ctrl+b', 'ctrl+shift+b'],
    save: ['ctrl+s', 'meta+s'],
    saveAndClose: ['ctrl+enter', 'ctrl+shift+enter'],
    cancel: ['escape'],
    duplicate: ['ctrl+d'],
    delete: ['delete', 'ctrl+backspace'],
  },
  // Employee management shortcuts
  employeeList: {
    selectAll: ['ctrl+a', 'meta+a'],
    deselectAll: ['ctrl+shift+a', 'meta+shift+a'],
    bulkDelete: ['ctrl+delete', 'ctrl+shift+delete'],
    export: ['ctrl+e', 'meta+e'],
    import: ['ctrl+i', 'meta+i'],
    filter: ['ctrl+shift+f', 'meta+shift+f'],
  },
  // Navigation shortcuts
  navigation: {
    gotoDashboard: ['alt+d'],
    gotoList: ['alt+l'],
    gotoCreate: ['alt+c'],
    gotoSettings: ['alt+s'],
    gotoEmployees: ['alt+e'],
  },
};

/**
 * Parse keyboard shortcut string into key parts
 */
export function parseShortcut(shortcut: string): {
  keys: string[];
  hasCtrl: boolean;
  hasAlt: boolean;
  hasMeta: boolean;
  hasShift: boolean;
  mainKey: string;
} {
  const keys = shortcut.toLowerCase().split('+');
  return {
    keys,
    hasCtrl: keys.includes('ctrl'),
    hasAlt: keys.includes('alt'),
    hasMeta: keys.includes('meta'),
    hasShift: keys.includes('shift'),
    mainKey: keys[keys.length - 1],
  };
}

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchShortcut(event: KeyboardEvent, shortcut: string | string[]): boolean {
  if (Array.isArray(shortcut)) {
    return shortcut.some((s) => matchShortcut(event, s));
  }

  const parsed = parseShortcut(shortcut);

  // Check all required keys are pressed
  const requiredKeys = parsed.keys.filter(
    (k) => k !== 'ctrl' && k !== 'alt' && k !== 'meta' && k !== 'shift'
  );
  if (requiredKeys.length === 0) return false;

  // Check modifier keys
  if (parsed.hasCtrl && !event.ctrlKey) return false;
  if (parsed.hasAlt && !event.altKey) return false;
  if (parsed.hasMeta && !event.metaKey) return false;
  if (parsed.hasShift && !event.shiftKey) return false;

  const mainKey = parsed.mainKey.toLowerCase();
  const eventKey = event.key.toLowerCase();
  return eventKey === mainKey;
}

/**
 * Get current keyboard context
 */
export function getKeyboardContext(data: GTR30FormData, currentTab: string): KeyboardContext {
  return {
    currentTab,
    currentEmployeeIndex: 0, // This would be tracked in state
    isSearchFocused: false, // This would be tracked in state
    isFormDirty: false, // This would be tracked in state
    hasMultipleEmployees: data.employees.length > 1,
  };
}

/**
 * Create keyboard event handler for bill form
 */
export function createBillFormKeyboardHandler(
  options: KeyboardNavigationOptions
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    // Check for global shortcuts
    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.global.save)) {
      event.preventDefault();
      options.onBulkSave?.();
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.global.print)) {
      event.preventDefault();
      window.print();
      return;
    }

    // Form-specific shortcuts (only when not in search input)
    const targetTag = (event.target as HTMLElement | null)?.tagName;
    if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
      if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.form.nextEmployee)) {
        event.preventDefault();
        options.onNextEmployee?.(0); // Would use current index
        return;
      }

      if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.form.prevEmployee)) {
        event.preventDefault();
        options.onPrevEmployee?.(0); // Would use current index
        return;
      }

      if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.form.nextSection)) {
        event.preventDefault();
        options.onNextSection?.();
        return;
      }

      if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.form.prevSection)) {
        event.preventDefault();
        options.onPrevSection?.();
        return;
      }

      if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.form.autoCalculate)) {
        event.preventDefault();
        options.onBulkCalculate?.();
        return;
      }
    }

    // Navigation shortcuts (always available)
    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.navigation.gotoDashboard)) {
      event.preventDefault();
      // Navigate to dashboard
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.navigation.gotoList)) {
      event.preventDefault();
      // Navigate to list
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.navigation.gotoCreate)) {
      event.preventDefault();
      // Navigate to create
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.navigation.gotoSettings)) {
      event.preventDefault();
      // Navigate to settings
      return;
    }
  };
}

/**
 * Create employee list keyboard handler
 */
export function createEmployeeListKeyboardHandler(
  options: KeyboardNavigationOptions
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    const targetTag = (event.target as HTMLElement | null)?.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
      // Let input fields handle their own keyboard events
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.employeeList.selectAll)) {
      event.preventDefault();
      // Handle select all
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.employeeList.export)) {
      event.preventDefault();
      options.onBulkExport?.();
      return;
    }

    if (matchShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.global.search)) {
      event.preventDefault();
      options.onSearchFocus?.();
      return;
    }
  };
}

/**
 * Get keyboard shortcut hints for UI display
 */
export function getShortcutHints(): Array<{ shortcut: string; description: string }> {
  return [
    { shortcut: 'Ctrl+S / Cmd+S', description: 'Save Bill' },
    { shortcut: 'Ctrl+P / Cmd+P', description: 'Print PDF' },
    { shortcut: 'Ctrl+N / Ctrl+Down', description: 'Next Employee' },
    { shortcut: 'Ctrl+P / Ctrl+Up', description: 'Previous Employee' },
    { shortcut: 'Ctrl+B', description: 'Bulk Calculate' },
    { shortcut: 'Ctrl+Enter', description: 'Auto-Calculate' },
    { shortcut: 'Ctrl+F / /', description: 'Search' },
    { shortcut: 'Ctrl+E / Cmd+E', description: 'Export to CSV' },
    { shortcut: 'Ctrl+D', description: 'Duplicate Employee' },
    { shortcut: 'Esc', description: 'Cancel / Close Dialog' },
  ];
}

/**
 * Get accessible label for keyboard shortcuts
 */
export function getShortcutAriaLabel(shortcut: string): string {
  const parts = shortcut.split('+');
  const labels: Record<string, string> = {
    ctrl: 'Control',
    alt: 'Alt',
    meta: 'Command',
    shift: 'Shift',
  };
  return parts
    .map((part) => labels[part] || part)
    .join(' + ')
    .replace(/\bCtrl\b/g, 'Control')
    .replace(/\bMeta\b/g, 'Command');
}

/**
 * Hook for keyboard navigation state management
 */
export function useKeyboardNavigation(data: GTR30FormData, currentTab: string) {
  // This would be implemented as a React hook in the components
  // For now, just return the context
  return getKeyboardContext(data, currentTab);
}

/**
 * Focus management helper
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const elements = container.querySelectorAll(selectors.join(', ')) as NodeListOf<HTMLElement>;
  return Array.from(elements).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Get next focusable element
 */
export function getNextFocusableElement(
  currentElement: HTMLElement,
  container: HTMLElement
): HTMLElement | null {
  const focusable = getFocusableElements(container);
  const currentIndex = focusable.indexOf(currentElement);
  if (currentIndex === -1 || currentIndex === focusable.length - 1) {
    return focusable[0] || null;
  }
  return focusable[currentIndex + 1];
}

/**
 * Get previous focusable element
 */
export function getPrevFocusableElement(
  currentElement: HTMLElement,
  container: HTMLElement
): HTMLElement | null {
  const focusable = getFocusableElements(container);
  const currentIndex = focusable.indexOf(currentElement);
  if (currentIndex === -1 || currentIndex === 0) {
    return focusable[focusable.length - 1] || null;
  }
  return focusable[currentIndex - 1];
}

/**
 * Focus first form element
 */
export function focusFirstFormElement(container: HTMLElement): void {
  const first = getFocusableElements(container)[0];
  if (first) {
    first.focus();
  }
}

/**
 * Focus last form element
 */
export function focusLastFormElement(container: HTMLElement): void {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[elements.length - 1].focus();
  }
}

/**
 * Trap focus within container (for modals)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

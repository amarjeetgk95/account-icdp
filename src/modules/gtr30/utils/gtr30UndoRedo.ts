import type { GTR30Employee, GTR30FormData } from '../types';

/**
 * Undo/Redo functionality for GTR-30 module
 * Implements history management for form edits
 */

export interface HistoryState {
  form: GTR30FormData;
  timestamp: number;
  description?: string;
}

export interface HistoryStack {
  undo: HistoryState[];
  redo: HistoryState[];
  current: GTR30FormData;
}

export interface UndoRedoOptions {
  maxHistory?: number;
  includeTimestamps?: boolean;
  debounceDelay?: number;
}

export const DEFAULT_UNDO_REDO_OPTIONS: UndoRedoOptions = {
  maxHistory: 50,
  includeTimestamps: true,
  debounceDelay: 100,
};

/**
 * Create initial history stack
 */
export function createHistoryStack(initialForm: GTR30FormData): HistoryStack {
  return {
    undo: [],
    redo: [],
    current: JSON.parse(JSON.stringify(initialForm)) as GTR30FormData,
  };
}

/**
 * Clone form data safely
 */
export function cloneFormData(form: GTR30FormData): GTR30FormData {
  return JSON.parse(JSON.stringify(form)) as GTR30FormData;
}

/**
 * Create history state from form data
 */
export function createHistoryState(
  form: GTR30FormData,
  description?: string
): HistoryState {
  return {
    form: cloneFormData(form),
    timestamp: Date.now(),
    description,
  };
}

/**
 * Push state to undo stack
 */
export function pushToUndoStack(
  stack: HistoryStack,
  newForm: GTR30FormData,
  description?: string,
  options: UndoRedoOptions = DEFAULT_UNDO_REDO_OPTIONS
): HistoryStack {
  const maxHistory = options.maxHistory ?? DEFAULT_UNDO_REDO_OPTIONS.maxHistory ?? 50;
  const newState = createHistoryState(newForm, description);
  const newStack = {
    ...stack,
    undo: [...stack.undo, newState],
    current: cloneFormData(newForm),
  };

  // Trim history if it exceeds max
  if (newStack.undo.length > maxHistory) {
    newStack.undo = newStack.undo.slice(newStack.undo.length - maxHistory);
  }

  // Clear redo stack on new action
  newStack.redo = [];

  return newStack;
}

/**
 * Undo last action
 */
export function undo(stack: HistoryStack, options: UndoRedoOptions = DEFAULT_UNDO_REDO_OPTIONS): {
  stack: HistoryStack;
  previousForm: GTR30FormData;
} | null {
  if (stack.undo.length === 0) {
    return null;
  }

  const maxHistory = options.maxHistory ?? DEFAULT_UNDO_REDO_OPTIONS.maxHistory ?? 50;
  const current = stack.undo[stack.undo.length - 1];
  const newUndo = stack.undo.slice(0, -1);

  const newStack = {
    undo: newUndo,
    redo: [createHistoryState(stack.current), ...stack.redo],
    current: cloneFormData(current.form),
  };

  // Trim redo stack if it exceeds max
  if (newStack.redo.length > maxHistory) {
    newStack.redo = newStack.redo.slice(0, maxHistory);
  }

  return { stack: newStack, previousForm: current.form };
}

/**
 * Redo last action
 */
export function redo(stack: HistoryStack, _options: UndoRedoOptions = DEFAULT_UNDO_REDO_OPTIONS): {
  stack: HistoryStack;
  nextForm: GTR30FormData;
} | null {
  if (stack.redo.length === 0) {
    return null;
  }

  const next = stack.redo[0];
  const newRedo = stack.redo.slice(1);

  const newStack = {
    undo: [...stack.undo, createHistoryState(stack.current)],
    redo: newRedo,
    current: cloneFormData(next.form),
  };

  return { stack: newStack, nextForm: next.form };
}

/**
 * Check if undo is available
 */
export function canUndo(stack: HistoryStack): boolean {
  return stack.undo.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(stack: HistoryStack): boolean {
  return stack.redo.length > 0;
}

/**
 * Get undo description
 */
export function getUndoDescription(stack: HistoryStack): string | null {
  if (stack.undo.length === 0) return null;
  return stack.undo[stack.undo.length - 1].description || 'Undo last change';
}

/**
 * Get redo description
 */
export function getRedoDescription(stack: HistoryStack): string | null {
  if (stack.redo.length === 0) return null;
  return stack.redo[0].description || 'Redo last change';
}

/**
 * Reset history stack
 */
export function resetHistory(_stack: HistoryStack, newForm: GTR30FormData): HistoryStack {
  return {
    undo: [],
    redo: [],
    current: cloneFormData(newForm),
  };
}

/**
 * Get history metadata
 */
export function getHistoryMetadata(stack: HistoryStack) {
  return {
    canUndo: stack.undo.length > 0,
    canRedo: stack.redo.length > 0,
    undoCount: stack.undo.length,
    redoCount: stack.redo.length,
    historyLimit: stack.undo.length + stack.redo.length,
  };
}

/**
 * Create undo/redo actions for common operations
 */
export interface UndoRedoAction {
  type: string;
  label: string;
  apply: (form: GTR30FormData) => GTR30FormData;
}

export const createUndoRedoActions = () => ({
  addEmployee: (employeeIndex: number): UndoRedoAction => ({
    type: 'addEmployee',
    label: 'Add Employee',
    apply: (form: GTR30FormData) => {
      const newEmployees = [...form.employees];
      newEmployees.splice(employeeIndex, 1);
      // Renumber
      newEmployees.forEach((emp, idx) => {
        emp.srNo = idx + 1;
      });
      return { ...form, employees: newEmployees };
    },
  }),

  removeEmployee: (employee: GTR30Employee): UndoRedoAction => ({
    type: 'removeEmployee',
    label: 'Remove Employee',
    apply: (form: GTR30FormData) => {
      const newEmployees = [...form.employees];
      const idx = newEmployees.findIndex((e) => e.id === employee.id);
      if (idx !== -1) {
        newEmployees.splice(idx, 1);
        // Renumber
        newEmployees.forEach((emp, idx) => {
          emp.srNo = idx + 1;
        });
      }
      return { ...form, employees: newEmployees };
    },
  }),

  updateEmployee: (employeeId: string, updates: Partial<GTR30Employee>): UndoRedoAction => ({
    type: 'updateEmployee',
    label: 'Update Employee',
    apply: (form: GTR30FormData) => {
      const newEmployees = form.employees.map((emp) =>
        emp.id === employeeId ? { ...emp, ...updates } : emp
      );
      return { ...form, employees: newEmployees };
    },
  }),

  updateField: (field: keyof GTR30FormData, value: any): UndoRedoAction => ({
    type: 'updateField',
    label: `Update ${field}`,
    apply: (form: GTR30FormData) => ({ ...form, [field]: value }),
  }),

  bulkCalculateDA: (daRate: number): UndoRedoAction => ({
    type: 'bulkCalculateDA',
    label: `Bulk Calculate DA (${daRate}%)`,
    apply: (form: GTR30FormData) => {
      const newEmployees = form.employees.map((emp) => ({
        ...emp,
        da: Math.round((emp.payOfEstablishment || emp.payOfOfficer || 0) * (daRate / 100)),
      }));
      return { ...form, employees: newEmployees };
    },
  }),

  bulkCalculateNPS: (): UndoRedoAction => ({
    type: 'bulkCalculateNPS',
    label: 'Bulk Calculate NPS',
    apply: (form: GTR30FormData) => {
      const newEmployees = form.employees.map((emp) => ({
        ...emp,
        npsPension: Math.round(
          ((emp.payOfEstablishment || emp.payOfOfficer || 0) + (emp.da || 0)) * 0.1
        ),
      }));
      return { ...form, employees: newEmployees };
    },
  }),

  sortEmployees: (field: keyof GTR30Employee, direction: 'asc' | 'desc'): UndoRedoAction => ({
    type: 'sortEmployees',
    label: `Sort Employees by ${String(field)} (${direction})`,
    apply: (form: GTR30FormData) => {
      const sorted = [...form.employees].sort((a, b) => {
        let valA: any = a[field];
        let valB: any = b[field];
        if (typeof valA === 'string') {
          valA = (valA as string).toLowerCase();
          valB = (valB as string).toLowerCase();
        } else {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        }
        let cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
        return direction === 'asc' ? cmp : -cmp;
      });
      const renumbered = sorted.map((emp, idx) => ({ ...emp, srNo: idx + 1 }));
      return { ...form, employees: renumbered };
    },
  }),
});

/**
 * Hook for undo/redo state management (React-specific)
 */
export function useUndoRedo(initialForm: GTR30FormData) {
  // This would be implemented as a React hook
  // For now, just return the history stack
  return createHistoryStack(initialForm);
}

/**
 * Serialize history stack for storage
 */
export function serializeHistory(stack: HistoryStack): string {
  return JSON.stringify({
    undo: stack.undo,
    redo: stack.redo,
    current: stack.current,
  });
}

/**
 * Deserialize history stack from storage
 */
export function deserializeHistory(serialized: string): HistoryStack {
  try {
    const parsed = JSON.parse(serialized);
    return {
      undo: parsed.undo || [],
      redo: parsed.redo || [],
      current: parsed.current || ({} as GTR30FormData),
    };
  } catch {
    // Return empty stack on error
    return {
      undo: [],
      redo: [],
      current: {} as GTR30FormData,
    };
  }
}

/**
 * Export history stack as JSON
 */
export function exportHistory(stack: HistoryStack, filename: string = 'gtr30-history.json') {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(serializeHistory(stack));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}

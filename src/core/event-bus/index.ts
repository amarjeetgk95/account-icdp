type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

// Cross-module events
export const EVENTS = {
  OFFICE_CHANGED: 'office:changed',
  FINANCIAL_YEAR_CHANGED: 'financial-year:changed',
  EMPLOYEE_UPDATED: 'employee:updated',
  SALARY_UPDATED: 'salary:updated',
  PARTY_UPDATED: 'party:updated',
  TRANSACTION_UPDATED: 'transaction:updated',
  USER_ROLE_CHANGED: 'user-role:changed',
  MODULE_ENABLED: 'module:enabled',
} as const;

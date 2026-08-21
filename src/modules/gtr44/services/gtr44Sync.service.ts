import type { Gtr44SettingsPayload } from '../repositories/gtr44SettingsBackend.repository';
import { gtr44SettingsBackendRepository } from '../repositories/gtr44SettingsBackend.repository';
import { useGTR44SettingsStore } from '../store/gtr44SettingsStore';
import { isAllOfficesMode } from '@/shared/utilities/office';

const SYNC_DEBOUNCE_MS = 600;

export type Gtr44SyncPhase = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

let syncPhase: Gtr44SyncPhase = 'idle';
const listeners = new Set<() => void>();

function setSyncPhase(phase: Gtr44SyncPhase): void {
  syncPhase = phase;
  for (const l of listeners) l();
}

export function getGtr44SyncStatus(): Gtr44SyncPhase {
  return syncPhase;
}

export function subscribeGtr44Sync(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncePush(payload: Gtr44SettingsPayload): void {
  if (syncTimer) clearTimeout(syncTimer);
  setSyncPhase('pending');
  syncTimer = setTimeout(() => {
    syncTimer = null;
    setSyncPhase('syncing');
    void (async () => {
      try {
        const result = await gtr44SettingsBackendRepository.save(payload);
        if (result === null) {
          let allOffices = false;
          try { allOffices = isAllOfficesMode(); } catch { /* ignore */ }
          setSyncPhase(allOffices ? 'idle' : 'error');
        } else {
          setSyncPhase('synced');
        }
      } catch {
        setSyncPhase('error');
      }
    })();
  }, SYNC_DEBOUNCE_MS);
}

function buildPayloadFromStore(): Gtr44SettingsPayload {
  const state = useGTR44SettingsStore.getState();
  return {
    settings: { ...state.settings },
    budgetHeads: state.budgetHeads.map((h) => ({ ...h })),
    expenditureItems: state.expenditureItems.map((it) => ({ ...it })),
    edpCodes: state.edpCodes.map((c) => ({ ...c })),
    deductionTemplates: state.deductionTemplates.map((t) => ({ ...t })),
    numbering: { ...state.numbering },
    printSettings: { ...state.printSettings, signaturePlaceholders: { ...state.printSettings.signaturePlaceholders } },
  };
}

class Gtr44SyncService {
  getStatus(): Gtr44SyncPhase {
    return getGtr44SyncStatus();
  }

  subscribe(listener: () => void): () => void {
    return subscribeGtr44Sync(listener);
  }

  /** Push current store payload to backend with debounce */
  scheduleSync(): void {
    const payload = buildPayloadFromStore();
    debouncePush(payload);
  }

  /** Hydrate from backend if local is empty (initial load) */
  async hydrateFromBackend(): Promise<void> {
    // If we already have non-default data locally (persisted), don't overwrite.
    // Check via localStorage key existence? Instead check if store has default vs actual persisted count.
    // Simpler: try to load remote, if local persist key is empty we already know.
    // For GTR44, we treat "empty" as absence of remote? The spec says hydrate if local empty.
    // We'll check if paybill_settings has value and local store is at defaults => apply remote.
    try {
      const remote = await gtr44SettingsBackendRepository.load();
      if (!remote) return;
      // Heuristic: if local store looks like defaults (budgetHeads length 1 and default numbered sequences), apply remote
      const state = useGTR44SettingsStore.getState();
      const isLocalDefault =
        state.budgetHeads.length === 1 &&
        state.budgetHeads[0]?.headChargeableCode === '2403001020500' &&
        state.numbering.nextBillSeq === 1 &&
        state.numbering.nextVoucherSeq === 1 &&
        state.printSettings.cert1Text?.includes('could not, with due regard');
      // We hydrate when local appears default but remote has custom data.
      // Compare remote vs defaults: if remote differs, we should apply.
      const remoteIsDifferent =
        remote.budgetHeads.length !== 1 ||
        remote.numbering.nextBillSeq !== 1 ||
        remote.numbering.billPrefix !== 'GTR44' ||
        remote.printSettings.footerNote !== '' ||
        remote.expenditureItems.length !== state.expenditureItems.length;
      if (isLocalDefault && remoteIsDifferent) {
        useGTR44SettingsStore.setState({
          settings: remote.settings,
          budgetHeads: remote.budgetHeads,
          expenditureItems: remote.expenditureItems,
          edpCodes: remote.edpCodes,
          deductionTemplates: remote.deductionTemplates,
          numbering: remote.numbering,
          printSettings: remote.printSettings,
        });
        setSyncPhase('synced');
      } else if (!isLocalDefault) {
        // Already has local data, but we still mark synced if remote exists
        setSyncPhase('synced');
      }
    } catch (err) {
      console.warn('[GTR44Sync] hydrate failed', err);
      setSyncPhase('error');
    }
  }

  /** Immediate push without debounce (e.g., on save click) */
  async pushNow(): Promise<void> {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    setSyncPhase('syncing');
    try {
      const payload = buildPayloadFromStore();
      const result = await gtr44SettingsBackendRepository.save(payload);
      setSyncPhase(result ? 'synced' : 'error');
    } catch {
      setSyncPhase('error');
    }
  }

  reset(): void {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    setSyncPhase('idle');
    void gtr44SettingsBackendRepository.clear();
  }
}

export const gtr44SyncService = new Gtr44SyncService();

// Auto-subscribe to store changes for debounce sync (like GTR30)
let unsubscribeStore: (() => void) | null = null;
function ensureStoreSubscription(): void {
  if (unsubscribeStore) return;
  // Defer subscription till first scheduleSync or hydrate call to avoid circular init issues in tests (jsdom localStorage)
  try {
    unsubscribeStore = useGTR44SettingsStore.subscribe((state, prev) => {
      // Only trigger debounce when relevant slices changed
      const changed =
        state.settings !== prev.settings ||
        state.budgetHeads !== prev.budgetHeads ||
        state.expenditureItems !== prev.expenditureItems ||
        state.edpCodes !== prev.edpCodes ||
        state.deductionTemplates !== prev.deductionTemplates ||
        state.numbering !== prev.numbering ||
        state.printSettings !== prev.printSettings;
      if (changed) {
        const payload: Gtr44SettingsPayload = {
          settings: { ...state.settings },
          budgetHeads: state.budgetHeads.map((h) => ({ ...h })),
          expenditureItems: state.expenditureItems.map((it) => ({ ...it })),
          edpCodes: state.edpCodes.map((c) => ({ ...c })),
          deductionTemplates: state.deductionTemplates.map((t) => ({ ...t })),
          numbering: { ...state.numbering },
          printSettings: { ...state.printSettings, signaturePlaceholders: { ...state.printSettings.signaturePlaceholders } },
        };
        debouncePush(payload);
      }
    });
  } catch {
    // In test env without persisted store, subscribe may fail - ignore
  }
}

// Eagerly ensure subscription in browser
if (typeof window !== 'undefined') {
  ensureStoreSubscription();
  // Also hydrate on load if local empty (fire and forget)
  void gtr44SyncService.hydrateFromBackend();
}

export function ensureGtr44SyncSubscription(): void {
  ensureStoreSubscription();
}

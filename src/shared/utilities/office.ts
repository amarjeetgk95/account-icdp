import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { supabase } from '@/core/supabase/client';

interface OfficeResolveCacheEntry {
  officeId: string | null;
  timestamp: number;
}

// Per-user cache so a resolved office never leaks across accounts.
// Scoped by userId so switching users within the same browser session
// (sign out / sign in as a different office) cannot inherit stale data.
const officeIdCacheByUser = new Map<string, OfficeResolveCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function resolveOfficeIdForUser(userId: string): Promise<string | null> {
  const now = Date.now();
  const cached = officeIdCacheByUser.get(userId);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.officeId;
  }

  try {
    // Find the office this user is assigned to via profiles.office_id.
    // NOTE: no fallback to an arbitrary office — binding a user to the wrong
    // office silently empties their pay bill / employee data.
    const { data: profile } = await supabase
      .from('profiles')
      .select('office_id')
      .eq('id', userId)
      .maybeSingle();

    const officeId = profile?.office_id ?? null;
    officeIdCacheByUser.set(userId, { officeId, timestamp: now });
    return officeId;
  } catch (err) {
    console.warn('[resolveOfficeIdForUser] Failed to resolve office:', err);
  }
  return null;
}

export function getOfficeId(): string | null {
  // Admins are not scoped to a single office.
  const user = useAuthStore.getState().user;
  if (user?.role === 'admin') return null;

  // The UI-selected office (admin office selector, or the office initialised
  // from the user's profile at sign-in) takes precedence. It is only ever set
  // explicitly for a signed-in user, so it cannot leak across accounts.
  const uiOfficeId = useUIStore.getState().activeOfficeId || null;
  if (uiOfficeId && uiOfficeId !== ALL_OFFICES_ID) return uiOfficeId;
  return user?.officeId || null;
}

/**
 * Sentinel value stored in activeOfficeId when an admin selects
 * "All Offices". Never matches a real office row.
 */
export const ALL_OFFICES_ID = '__all__';

export function isAllOfficesMode(): boolean {
  // Admins always see merged data across all offices.
  const user = useAuthStore.getState().user;
  if (user?.role === 'admin') return true;
  return useUIStore.getState().activeOfficeId === ALL_OFFICES_ID;
}

export interface OfficeScope {
  all: boolean;
  officeId: string | null;
}

/**
 * Resolve how a repository query should be office-scoped.
 *
 * - When "All Offices" is active (admin), `all` is true and officeId is null:
 *   reads must skip the office filter to merge every office.
 * - An explicitly passed office id always wins (used by report pages that have
 *   their own office selector).
 */
export function getOfficeScope(explicitOfficeId?: string | null): OfficeScope {
  const user = useAuthStore.getState().user;
  const isAdmin = user?.role === 'admin';

  if (explicitOfficeId && explicitOfficeId !== ALL_OFFICES_ID) {
    return { all: false, officeId: explicitOfficeId };
  }
  // Admins see merged data across all offices; explicit submodule selectors still work above.
  if (isAdmin || isAllOfficesMode()) return { all: true, officeId: null };
  return { all: false, officeId: getOfficeId() };
}

/**
 * For write operations, which always need a concrete office. Throws a clear
 * error when "All Offices" is active instead of silently writing nowhere.
 */
export function requireOfficeId(): string {
  const user = useAuthStore.getState().user;
  if (user?.role === 'admin') {
    throw new Error('Admin users cannot perform office-specific data entry. Please use an office account.');
  }
  if (isAllOfficesMode()) {
    throw new Error('Select a specific office to make changes');
  }
  const officeId = getOfficeId();
  if (!officeId) throw new Error('No office selected');
  return officeId;
}

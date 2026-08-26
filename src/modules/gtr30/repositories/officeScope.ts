import { isAllOfficesMode, getOfficeId, resolveOfficeIdForUser } from '@/shared/utilities/office';
import { useAuthStore } from '@/core/auth/store';

/**
 * Strict office resolver for repositories.
 * Returns a specific officeId string, or null for "all offices" mode (admin).
 * Never guesses, never falls back to a hardcoded default.
 */
export async function resolveOfficeIdStrict(): Promise<string | null> {
  if (isAllOfficesMode()) return null;

  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;

  return resolveOfficeIdForUser(userId);
}
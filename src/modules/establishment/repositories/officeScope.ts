import { isAllOfficesMode, getOfficeId, resolveOfficeIdForUser } from '@/shared/utilities/office';
import { useAuthStore } from '@/core/auth/store';

/**
 * Strict office resolver for establishment repositories.
 * Returns a specific officeId string, or null for "all offices" mode (admin).
 */
export async function resolveEstablishmentOfficeId(): Promise<string | null> {
  if (isAllOfficesMode()) return null;

  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;

  return resolveOfficeIdForUser(userId);
}

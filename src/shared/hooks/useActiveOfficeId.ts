import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { ALL_OFFICES_ID } from '@/shared/utilities/office';

export function useActiveOfficeId(): string | null {
  const user = useAuthStore((s) => s.user);
  const uiOfficeId = useUIStore((s) => s.activeOfficeId);
  // Admins have no assigned office, but we still need query hooks to run.
  // This sentinel is internal only; it is never exposed as a global selector.
  if (user?.role === 'admin') return ALL_OFFICES_ID;
  return user?.officeId ?? uiOfficeId ?? null;
}

import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';

export function useActiveOfficeId(): string | null {
  const authOfficeId = useAuthStore((s) => s.user?.officeId ?? null);
  const uiOfficeId = useUIStore((s) => s.activeOfficeId);
  return authOfficeId ?? uiOfficeId;
}

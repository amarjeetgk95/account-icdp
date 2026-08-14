import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';

export function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}
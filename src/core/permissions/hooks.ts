import { useAuthStore } from '@/core/auth/store';
import type { UserRole } from '@/shared/types/module';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'office';
  office_id: string | null;
}

export function usePermissions() {
  const { user, isRoleLoaded } = useAuthStore();

  const role = user?.role ?? null;

  const profile: UserProfile | null = role
    ? {
        id: user?.id ?? '',
        email: user?.email ?? '',
        role: role,
        office_id: user?.officeId ?? null,
      }
    : null;

  return {
    profile,
    isLoading: !isRoleLoaded,
    isAdmin: role === 'admin',
    isOffice: role === 'office',
    officeId: user?.officeId ?? null,
    role: role as UserRole | null,
  };
}

export function useRequireRole(requiredRole: 'admin' | 'office') {
  const { profile, isLoading } = usePermissions();
  return {
    hasAccess: !isLoading && profile?.role === requiredRole,
    isLoading,
  };
}

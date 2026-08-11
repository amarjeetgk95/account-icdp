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

export function useRequireRole(requiredRole?: UserRole | UserRole[]) {
  const { profile, isLoading } = usePermissions();

  if (!requiredRole) {
    return {
      hasAccess: true,
      isLoading,
    };
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasAccess = !isLoading && !!profile?.role && roles.includes(profile.role);

  return {
    hasAccess,
    isLoading,
  };
}

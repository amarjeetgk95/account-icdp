import { useAuthStore } from '@/core/auth/store';

interface UserProfile {
  id: string;
  email: string;
}

// Single-office mode: authenticated user has full rights. No roles.
export function usePermissions() {
  const { user, isRoleLoaded } = useAuthStore();

  const profile: UserProfile | null = user
    ? {
        id: user.id,
        email: user.email,
      }
    : null;

  return {
    profile,
    isLoading: !isRoleLoaded,
  };
}

export function useRequireRole() {
  const { isLoading } = usePermissions();

  return {
    hasAccess: true,
    isLoading,
  };
}

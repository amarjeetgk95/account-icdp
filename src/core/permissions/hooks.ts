import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'office';
  office_id: string | null;
}

export function usePermissions() {
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, office_id')
        .eq('id', user.id)
        .single<{ id: string; role: 'admin' | 'office'; office_id: string | null }>();

      if (error) {
        console.error('Failed to fetch profile:', error);
        return null;
      }

      return {
        id: data.id,
        email: user.email,
        role: data.role,
        office_id: data.office_id,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    profile,
    isLoading,
    isAdmin: profile?.role === 'admin',
    isOffice: profile?.role === 'office',
    officeId: profile?.office_id,
  };
}

export function useRequireRole(requiredRole: 'admin' | 'office') {
  const { profile, isLoading } = usePermissions();
  return {
    hasAccess: !isLoading && profile?.role === requiredRole,
    isLoading,
  };
}

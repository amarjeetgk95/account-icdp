import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/core/auth/store';
import { logger } from '@/core/logging';

export function useLogin() {
  const { signIn } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await signIn(email, password);
    },
    onSuccess: () => {
      logger.info('User signed in successfully', 'auth');
    },
    onError: (error) => {
      logger.error('Login failed', 'auth', error);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await import('@/core/supabase/client').then(({ supabase }) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        })
      );
      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await import('@/core/supabase/client').then(({ supabase }) =>
        supabase.auth.updateUser({ password: newPassword })
      );
      if (error) throw error;
    },
  });
}

export function useSignOut() {
  const { signOut } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
  });
}

import { create } from 'zustand';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/core/logging';

interface User {
  id: string;
  email: string;
  role?: 'office';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isRoleLoaded: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Single-office mode: no profiles/roles table. Everyone is an office user.
async function markRoleLoaded(): Promise<void> {
  const current = useAuthStore.getState().user;
  if (current) {
    useAuthStore.setState({
      user: {
        ...current,
        role: 'office',
      },
      isRoleLoaded: true,
    });
  } else {
    useAuthStore.setState({ isRoleLoaded: true });
  }
}

let authListenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  isRoleLoaded: false,

  initialize: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error('Session retrieval error', 'auth', error);
      }

      if (session?.user) {
        set({
          user: { id: session.user.id, email: session.user.email || '' },
          isRoleLoaded: false,
        });
        await markRoleLoaded();
      } else {
        set({
          user: null,
          isRoleLoaded: true,
        });
      }
      set({ isLoading: false, isInitialized: true });

      if (!authListenerRegistered) {
        authListenerRegistered = true;
        supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'PASSWORD_RECOVERY') {
            if (window.location.pathname !== '/update-password') {
              window.location.pathname = '/update-password';
            }
            return;
          }

          if (newSession?.user) {
            const currentUser = get().user;

            if (currentUser?.id === newSession.user.id && currentUser?.role && get().isRoleLoaded) {
              return;
            }

            set({
              user: {
                id: newSession.user.id,
                email: newSession.user.email || '',
                role: currentUser?.role,
              },
              isRoleLoaded: false,
            });
            await markRoleLoaded();
          } else if (event === 'SIGNED_OUT' || !newSession) {
            set({
              user: null,
              isRoleLoaded: true,
            });
          }
        });
      }
    } catch (error) {
      logger.error('Auth initialization failed', 'auth', error);
      set({
        user: null,
        isLoading: false,
        isInitialized: true,
        isRoleLoaded: true,
      });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        throw error;
      }

      if (data?.user) {
        set({
          user: { id: data.user.id, email: data.user.email || '' },
          isRoleLoaded: false,
        });
        await markRoleLoaded();
        set({ isLoading: false, isInitialized: true });
      }
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Sign out failed', 'auth', error);
      }
    } finally {
      set({ user: null, isRoleLoaded: true, isLoading: false });
    }
  },
}));


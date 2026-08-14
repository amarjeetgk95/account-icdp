import { create } from 'zustand';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/core/logging';
import { useUIStore } from '@/core/stores/ui-store';

interface User {
  id: string;
  email: string;
  role?: 'admin' | 'office';
  officeId?: string | null;
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

async function loadProfileIntoStores(userId: string): Promise<void> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, office_id')
      .eq('id', userId)
      .single();

    if (error) {
      logger.warn('Could not load profile', 'auth', error);
      useAuthStore.setState({ isRoleLoaded: true });
      return;
    }

    if (profile) {
      const current = useAuthStore.getState().user;
      useAuthStore.setState({
        user: {
          id: current?.id || userId,
          email: current?.email || '',
          role: profile.role,
          officeId: profile.office_id,
        },
        isRoleLoaded: true,
      });
      useUIStore.getState().initializeOffice(profile.office_id);
    } else {
      useAuthStore.setState({ isRoleLoaded: true });
    }
  } catch (error) {
    logger.warn('Could not load profile', 'auth', error);
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
        await loadProfileIntoStores(session.user.id);
      } else {
        set({
          user: null,
          isRoleLoaded: true,
        });
        useUIStore.getState().initializeOffice(null);
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
                officeId: currentUser?.officeId,
              },
              isRoleLoaded: false,
            });
            await loadProfileIntoStores(newSession.user.id);
          } else if (event === 'SIGNED_OUT' || !newSession) {
            set({
              user: null,
              isRoleLoaded: true,
            });
            useUIStore.getState().initializeOffice(null);
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
      useUIStore.getState().initializeOffice(null);
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
        await loadProfileIntoStores(data.user.id);
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
      useUIStore.getState().initializeOffice(null);
    }
  },
}));


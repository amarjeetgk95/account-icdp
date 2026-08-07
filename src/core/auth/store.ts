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
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

async function loadProfileIntoStores(userId: string): Promise<void> {
  try {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role, office_id')
      .eq('id', userId)
      .single();

    if (profile) {
      const current = useAuthStore.getState().user;
      useAuthStore.setState({
        user: {
          id: current?.id || userId,
          email: current?.email || '',
          role: profile.role,
          officeId: profile.office_id,
        },
      });
      useUIStore.getState().initializeOffice(profile.office_id);
    }
  } catch (error) {
    logger.warn('Could not load profile', 'auth', error);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: { id: session.user.id, email: session.user.email || '' },
        });
        await loadProfileIntoStores(session.user.id);
      }
      set({ isLoading: false, isInitialized: true });

      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession?.user) {
          set({
            user: { id: newSession.user.id, email: newSession.user.email || '' },
          });
          loadProfileIntoStores(newSession.user.id);
        } else {
          set({ user: null });
        }
      });
    } catch (error) {
      logger.error('Auth initialization failed', 'auth', error);
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in failed', 'auth', error);
      throw error;
    }

    if (data?.user) {
      set({
        user: { id: data.user.id, email: data.user.email || '' },
      });
      await loadProfileIntoStores(data.user.id);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out failed', 'auth', error);
    }
    set({ user: null });
  },
}));

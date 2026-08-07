import { create } from 'zustand';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/core/logging';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ user: null, isLoading: false, isInitialized: true });
      }

      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession?.user) {
          set({
            user: { id: newSession.user.id, email: newSession.user.email || '' },
          });
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in failed', 'auth', error);
      throw error;
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

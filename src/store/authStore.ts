// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { Profile } from '../types/database';

export type UserProfile = Profile;

export interface AuthFeedback {
  code?: string;
  message: string;
}

interface AuthState {
  user: UserProfile | null;
  session: string | null;
  isLoading: boolean;
  isOnboarded: boolean;
  isGuest: boolean;
  notificationsEnabled: boolean;
  isHydrated: boolean;
  setUser: (user: UserProfile | null) => void;
  setSession: (session: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsOnboarded: (onboarded: boolean) => void;
  setIsGuest: (isGuest: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setIsHydrated: (isHydrated: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isOnboarded: false,
      isGuest: false,
      notificationsEnabled: true,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
      setIsGuest: (isGuest) => set({ isGuest }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setIsHydrated: (isHydrated) => set({ isHydrated }),
      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isOnboarded: false,
          isGuest: false,
        });
      },
    }),
    {
      name: 'gather-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setIsHydrated(true);
      },
      partialize: (state) => ({
        user: state.user,
        isOnboarded: state.isOnboarded,
        isGuest: state.isGuest,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);

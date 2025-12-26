import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialState {
  // Persisted - tracks if user has completed onboarding
  hasSeenOnboarding: boolean;

  // Runtime - controls overlay visibility
  showOnboarding: boolean;

  // Actions
  setHasSeenOnboarding: (seen: boolean) => void;
  triggerOnboarding: () => void;
  closeOnboarding: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      showOnboarding: false,

      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),

      triggerOnboarding: () => set({ showOnboarding: true }),

      closeOnboarding: () =>
        set({
          showOnboarding: false,
          hasSeenOnboarding: true,
        }),
    }),
    {
      name: 'ultimatestats-tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist hasSeenOnboarding, not showOnboarding (runtime state)
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    },
  ),
);

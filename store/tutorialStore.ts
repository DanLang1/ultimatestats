import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialState {
  // Persisted - tracks if user has completed onboarding
  hasSeenOnboarding: boolean;
  hasSeenStatsTutorial: boolean;

  // Runtime - controls overlay visibility
  showOnboarding: boolean;
  showStatsTutorial: boolean;

  // Actions
  setHasSeenOnboarding: (seen: boolean) => void;
  triggerOnboarding: () => void;
  closeOnboarding: () => void;
  triggerStatsTutorial: () => void;
  closeStatsTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasSeenStatsTutorial: false,
      showOnboarding: false,
      showStatsTutorial: false,

      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),

      triggerOnboarding: () => set({ showOnboarding: true }),

      closeOnboarding: () =>
        set({
          showOnboarding: false,
          hasSeenOnboarding: true,
        }),

      triggerStatsTutorial: () => set({ showStatsTutorial: true }),

      closeStatsTutorial: () =>
        set({
          showStatsTutorial: false,
          hasSeenStatsTutorial: true,
        }),
    }),
    {
      name: 'ultimatestats-tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist hasSeenOnboarding, not showOnboarding (runtime state)
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasSeenStatsTutorial: state.hasSeenStatsTutorial,
      }),
    },
  ),
);

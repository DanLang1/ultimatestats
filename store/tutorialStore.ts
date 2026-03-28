import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialState {
  // Persisted
  hasSeenOnboarding: boolean;
  hasSeenStatsTutorial: boolean;
  shouldShowStatsTutorialOnNextGameStart: boolean;
  hasSeenShowcaseHint: boolean;

  // Runtime
  hasHydrated: boolean;

  // Actions
  completeTutorial: () => void;
  queueStatsTutorialForNextGameStart: () => void;
  closeStatsTutorial: () => void;
  resetStatsTutorial: () => void;
  dismissShowcaseHint: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasSeenStatsTutorial: false,
      shouldShowStatsTutorialOnNextGameStart: false,
      hasSeenShowcaseHint: false,
      hasHydrated: false,

      completeTutorial: () => set({ hasSeenOnboarding: true }),

      queueStatsTutorialForNextGameStart: () =>
        set({
          shouldShowStatsTutorialOnNextGameStart: true,
        }),

      closeStatsTutorial: () =>
        set({
          hasSeenStatsTutorial: true,
          shouldShowStatsTutorialOnNextGameStart: false,
        }),

      resetStatsTutorial: () =>
        set({
          hasSeenStatsTutorial: false,
          shouldShowStatsTutorialOnNextGameStart: false,
        }),

      dismissShowcaseHint: () => set({ hasSeenShowcaseHint: true }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'ultimatestats-tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasSeenStatsTutorial: state.hasSeenStatsTutorial,
        shouldShowStatsTutorialOnNextGameStart: state.shouldShowStatsTutorialOnNextGameStart,
        hasSeenShowcaseHint: state.hasSeenShowcaseHint,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

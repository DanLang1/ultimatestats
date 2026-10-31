import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { reportHydrationError } from '@/lib/sentry';

interface TutorialState {
  // Persisted
  hasSeenOnboarding: boolean;
  hasSeenStatsTutorial: boolean;
  hasSeenAdvancedTutorial: boolean;
  hasSeenAdvancedVoiceHint: boolean;
  shouldShowStatsTutorialOnNextGameStart: boolean;

  // Runtime
  hasHydrated: boolean;

  completeTutorial: () => void;
  completeAdvancedOnboarding: () => void;
  queueStatsTutorialForNextGameStart: () => void;
  closeStatsTutorial: () => void;
  resetStatsTutorial: () => void;
  completeAdvancedTutorial: () => void;
  dismissAdvancedVoiceHint: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasSeenStatsTutorial: false,
      hasSeenAdvancedTutorial: false,
      hasSeenAdvancedVoiceHint: false,
      shouldShowStatsTutorialOnNextGameStart: false,
      hasHydrated: false,

      completeTutorial: () => set({ hasSeenOnboarding: true }),

      completeAdvancedOnboarding: () => {
        set({
          hasSeenOnboarding: true,
          hasSeenAdvancedTutorial: true,
        });
      },

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

      completeAdvancedTutorial: () => {
        set({ hasSeenAdvancedTutorial: true });
      },

      dismissAdvancedVoiceHint: () => set({ hasSeenAdvancedVoiceHint: true }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'ultimatestats-tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasSeenStatsTutorial: state.hasSeenStatsTutorial,
        hasSeenAdvancedTutorial: state.hasSeenAdvancedTutorial,
        hasSeenAdvancedVoiceHint: state.hasSeenAdvancedVoiceHint,
        shouldShowStatsTutorialOnNextGameStart: state.shouldShowStatsTutorialOnNextGameStart,
      }),
      onRehydrateStorage: (state) => (_rehydratedState, error) => {
        reportHydrationError('tutorial', error);
        state.setHasHydrated(true);
      },
    },
  ),
);

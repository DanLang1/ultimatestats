import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialState {
  // Persisted
  hasSeenOnboarding: boolean;
  hasSeenStatsTutorial: boolean;
  hasSeenAdvancedTutorial: boolean;
  hasSeenAdvancedVoiceHint: boolean;
  shouldShowStatsTutorialOnNextGameStart: boolean;
  hasSeenShowcaseHint: boolean;
  hasSeenLongPressSelectHint: boolean;

  // Runtime
  hasHydrated: boolean;

  // Actions
  completeTutorial: () => void;
  queueStatsTutorialForNextGameStart: () => void;
  closeStatsTutorial: () => void;
  resetStatsTutorial: () => void;
  completeAdvancedTutorial: () => void;
  dismissAdvancedVoiceHint: () => void;
  dismissShowcaseHint: () => void;
  dismissLongPressSelectHint: () => void;
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
      hasSeenShowcaseHint: false,
      hasSeenLongPressSelectHint: false,
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

      completeAdvancedTutorial: () => set({ hasSeenAdvancedTutorial: true }),

      dismissAdvancedVoiceHint: () => set({ hasSeenAdvancedVoiceHint: true }),

      dismissShowcaseHint: () => set({ hasSeenShowcaseHint: true }),

      dismissLongPressSelectHint: () => set({ hasSeenLongPressSelectHint: true }),

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
        hasSeenShowcaseHint: state.hasSeenShowcaseHint,
        hasSeenLongPressSelectHint: state.hasSeenLongPressSelectHint,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

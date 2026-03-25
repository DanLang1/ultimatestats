import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialState {
  // Persisted
  hasSeenOnboarding: boolean;
  hasSeenStatsTutorial: boolean;

  // Runtime
  showStatsTutorial: boolean;
  hasHydrated: boolean;

  // Actions
  completeTutorial: () => void;
  triggerStatsTutorial: () => void;
  closeStatsTutorial: () => void;
  resetStatsTutorial: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasSeenStatsTutorial: false,
      showStatsTutorial: false,
      hasHydrated: false,

      completeTutorial: () => set({ hasSeenOnboarding: true }),

      triggerStatsTutorial: () => set({ showStatsTutorial: true }),

      closeStatsTutorial: () =>
        set({
          showStatsTutorial: false,
          hasSeenStatsTutorial: true,
        }),

      resetStatsTutorial: () =>
        set({
          hasSeenStatsTutorial: false,
          showStatsTutorial: false,
        }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'ultimatestats-tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasSeenStatsTutorial: state.hasSeenStatsTutorial,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

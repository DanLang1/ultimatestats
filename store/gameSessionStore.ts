import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ActiveGameType = 'advanced' | 'basic';

interface GameSessionState {
  activeGameType: ActiveGameType | null;
  setActiveGameType: (type: ActiveGameType) => void;
  clearActiveGame: () => void;
}

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      activeGameType: null,
      setActiveGameType: (type) => set({ activeGameType: type }),
      clearActiveGame: () => set({ activeGameType: null }),
    }),
    {
      name: 'ultimatestats-game-session',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

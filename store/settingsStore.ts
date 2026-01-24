import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Default colors from theme
const DEFAULT_MMP_COLOR = '#60A5FA'; // Blue 400
const DEFAULT_FMP_COLOR = '#F472B6'; // Pink 400

interface SettingsState {
  // Matching type player name colors
  mmpColor: string;
  fmpColor: string;

  // Actions
  setMmpColor: (color: string) => void;
  setFmpColor: (color: string) => void;
  resetMatchingTypeColors: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mmpColor: DEFAULT_MMP_COLOR,
      fmpColor: DEFAULT_FMP_COLOR,

      setMmpColor: (color) => set({ mmpColor: color }),
      setFmpColor: (color) => set({ fmpColor: color }),
      resetMatchingTypeColors: () =>
        set({
          mmpColor: DEFAULT_MMP_COLOR,
          fmpColor: DEFAULT_FMP_COLOR,
        }),
    }),
    {
      name: 'ultimatestats-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Re-export defaults for use elsewhere (e.g., theme fallback)
export { DEFAULT_FMP_COLOR, DEFAULT_MMP_COLOR };

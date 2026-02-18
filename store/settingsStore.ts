import { GenderRatio } from '@/lib/genderRatioUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Default colors from theme
const DEFAULT_MMP_COLOR = '#60A5FA'; // Blue 400
const DEFAULT_FMP_COLOR = '#F472B6'; // Pink 400

export type OrientationMode = 'system' | 'portrait' | 'landscape';

interface SettingsState {
  // Matching type player name colors
  mmpColor: string;
  fmpColor: string;

  // Gender Ratio Settings
  genderRatioEnabled: boolean;
  firstPointRatio: GenderRatio | null;

  // Line Calling Settings
  lineCallingEnabled: boolean;
  numPlayers: number;

  // Sidebar Settings
  sidebarCollapsed: boolean;

  // Roster View
  rosterViewMode: 'chips' | 'cards';

  // App Orientation
  orientationMode: OrientationMode;

  // Actions
  setMmpColor: (color: string) => void;
  setFmpColor: (color: string) => void;
  resetMatchingTypeColors: () => void;
  setGenderRatioEnabled: (enabled: boolean) => void;
  setFirstPointRatio: (ratio: GenderRatio | null) => void;
  setLineCallingEnabled: (enabled: boolean) => void;
  setNumPlayers: (num: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRosterViewMode: (mode: 'chips' | 'cards') => void;
  setOrientationMode: (mode: OrientationMode) => void;
  statEntryOrder: 'goal_first' | 'assist_first';
  setStatEntryOrder: (order: 'goal_first' | 'assist_first') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mmpColor: DEFAULT_MMP_COLOR,
      fmpColor: DEFAULT_FMP_COLOR,
      genderRatioEnabled: false,
      firstPointRatio: null,
      lineCallingEnabled: false,
      numPlayers: 7,
      sidebarCollapsed: false,
      rosterViewMode: 'chips',
      orientationMode: 'system',

      setMmpColor: (color) => set({ mmpColor: color }),
      setFmpColor: (color) => set({ fmpColor: color }),
      resetMatchingTypeColors: () =>
        set({
          mmpColor: DEFAULT_MMP_COLOR,
          fmpColor: DEFAULT_FMP_COLOR,
        }),
      setGenderRatioEnabled: (enabled) => set({ genderRatioEnabled: enabled }),
      setFirstPointRatio: (ratio) => set({ firstPointRatio: ratio }),
      setLineCallingEnabled: (enabled) => set({ lineCallingEnabled: enabled }),
      setNumPlayers: (num) => set({ numPlayers: num }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setRosterViewMode: (mode) => set({ rosterViewMode: mode }),
      setOrientationMode: (mode) => set({ orientationMode: mode }),
      statEntryOrder: 'goal_first',
      setStatEntryOrder: (order) => set({ statEntryOrder: order }),
    }),
    {
      name: 'ultimatestats-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Re-export defaults for use elsewhere (e.g., theme fallback)
export { DEFAULT_FMP_COLOR, DEFAULT_MMP_COLOR };

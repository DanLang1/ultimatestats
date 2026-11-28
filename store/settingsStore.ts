import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_GAME_TO,
  DEFAULT_HARD_CAP_MINS,
  DEFAULT_LINE_SIZE,
  DEFAULT_OTHER_SIDE_TEAM_NAME,
  DEFAULT_TIMEOUTS_PER_HALF,
} from '@/lib/constants';
import { GenderRatio } from '@/lib/genderRatioUtils';
import { reportHydrationError } from '@/lib/sentry';
import { palette } from '@/theme/theme';

const DEFAULT_MMP_COLOR = '#60A5FA'; // Blue 400
const DEFAULT_FMP_COLOR = '#F472B6'; // Pink 400

export type OrientationMode = 'system' | 'portrait' | 'landscape';
export type LinePlayerSortOrder = 'alpha' | 'points' | 'number';

/** The pre-game settings a basic game copies into its live state when it starts. */
export interface BasicGameFormatSettings {
  /** The opponent's name; carries over from the last game in either mode. */
  otherSideTeamName: string;
  gameTo: number;
  timeoutsPerHalf: number;
  autoHalftimeEnabled: boolean;
  floaterEnabled: boolean;
  hardCapMins: number;
}

interface SettingsState extends BasicGameFormatSettings {
  // Matching type player name colors
  mmpColor: string;
  fmpColor: string;

  genderRatioEnabled: boolean;
  firstPointRatio: GenderRatio | null;

  lineCallingEnabled: boolean;
  numPlayers: number;

  rosterViewMode: 'chips' | 'cards';

  orientationMode: OrientationMode;

  team1Color: string;
  team2Color: string;

  softCapMins: number;
  advancedSoftCapAtMins: number;
  advancedHardCapEnabled: boolean;
  advancedSoftCapEnabled: boolean;

  setMmpColor: (color: string) => void;
  setFmpColor: (color: string) => void;
  resetMatchingTypeColors: () => void;
  setTeam1Color: (color: string) => void;
  setTeam2Color: (color: string) => void;
  setOtherSideTeamName: (name: string) => void;
  setGameTo: (gameTo: number) => void;
  setTimeoutsPerHalf: (count: number) => void;
  setAutoHalftimeEnabled: (enabled: boolean) => void;
  setFloaterEnabled: (enabled: boolean) => void;
  setGenderRatioEnabled: (enabled: boolean) => void;
  setFirstPointRatio: (ratio: GenderRatio | null) => void;
  setLineCallingEnabled: (enabled: boolean) => void;
  setNumPlayers: (num: number) => void;
  setRosterViewMode: (mode: 'chips' | 'cards') => void;
  setOrientationMode: (mode: OrientationMode) => void;
  setHardCapMins: (minutes: number) => void;
  setSoftCapMins: (minutes: number) => void;
  setAdvancedSoftCapAtMins: (minutes: number) => void;
  setAdvancedHardCapEnabled: (enabled: boolean) => void;
  setAdvancedSoftCapEnabled: (enabled: boolean) => void;
  statEntryOrder: 'goal_first' | 'assist_first';
  setStatEntryOrder: (order: 'goal_first' | 'assist_first') => void;
  linePlayerSortOrder: LinePlayerSortOrder;
  setLinePlayerSortOrder: (order: LinePlayerSortOrder) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mmpColor: DEFAULT_MMP_COLOR,
      fmpColor: DEFAULT_FMP_COLOR,
      team1Color: palette.surface,
      team2Color: palette.primary,
      otherSideTeamName: DEFAULT_OTHER_SIDE_TEAM_NAME,
      gameTo: DEFAULT_GAME_TO,
      timeoutsPerHalf: DEFAULT_TIMEOUTS_PER_HALF,
      autoHalftimeEnabled: true,
      floaterEnabled: true,
      genderRatioEnabled: false,
      firstPointRatio: null,
      lineCallingEnabled: false,
      numPlayers: DEFAULT_LINE_SIZE,
      rosterViewMode: 'chips',
      orientationMode: 'system',
      hardCapMins: DEFAULT_HARD_CAP_MINS,
      softCapMins: 20,
      advancedSoftCapAtMins: 70,
      advancedHardCapEnabled: true,
      advancedSoftCapEnabled: true,

      setMmpColor: (color) => set({ mmpColor: color }),
      setFmpColor: (color) => set({ fmpColor: color }),
      resetMatchingTypeColors: () =>
        set({
          mmpColor: DEFAULT_MMP_COLOR,
          fmpColor: DEFAULT_FMP_COLOR,
        }),
      setTeam1Color: (color) => set({ team1Color: color }),
      setTeam2Color: (color) => set({ team2Color: color }),
      setOtherSideTeamName: (name) => set({ otherSideTeamName: name }),
      setGameTo: (gameTo) => set({ gameTo }),
      setTimeoutsPerHalf: (count) => set({ timeoutsPerHalf: count }),
      setAutoHalftimeEnabled: (enabled) => set({ autoHalftimeEnabled: enabled }),
      setFloaterEnabled: (enabled) => set({ floaterEnabled: enabled }),
      setGenderRatioEnabled: (enabled) => set({ genderRatioEnabled: enabled }),
      setFirstPointRatio: (ratio) => set({ firstPointRatio: ratio }),
      setLineCallingEnabled: (enabled) => set({ lineCallingEnabled: enabled }),
      setNumPlayers: (num) => set({ numPlayers: num }),
      setRosterViewMode: (mode) => set({ rosterViewMode: mode }),
      setOrientationMode: (mode) => set({ orientationMode: mode }),
      setHardCapMins: (minutes) => set({ hardCapMins: minutes }),
      setSoftCapMins: (minutes) => set({ softCapMins: minutes }),
      setAdvancedSoftCapAtMins: (minutes) => set({ advancedSoftCapAtMins: minutes }),
      setAdvancedHardCapEnabled: (enabled) => set({ advancedHardCapEnabled: enabled }),
      setAdvancedSoftCapEnabled: (enabled) => set({ advancedSoftCapEnabled: enabled }),
      statEntryOrder: 'goal_first',
      setStatEntryOrder: (order) => set({ statEntryOrder: order }),
      linePlayerSortOrder: 'alpha',
      setLinePlayerSortOrder: (order) => set({ linePlayerSortOrder: order }),
    }),
    {
      name: 'ultimatestats-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (_state, error) => reportHydrationError('settings', error),
    },
  ),
);

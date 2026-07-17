import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useStartupMigrationStore } from '@/store/startupMigrationStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { useUIStore } from '@/store/uiStore';
import { resetAdvancedTrackingStorage } from '@/test/mocks/advancedTrackingStorage';

const initialGameState = useGameStore.getInitialState();
const initialGameSessionState = useGameSessionStore.getInitialState();
const initialAdvancedTrackingState = useAdvancedTrackingStore.getInitialState();
const initialSavedAdvancedGamesState = useSavedAdvancedGamesStore.getInitialState();
const initialTutorialState = useTutorialStore.getInitialState();
const initialLinePresetsState = useLinePresetsStore.getInitialState();
const initialNumberPickerState = useNumberPickerStore.getInitialState();
const initialPlayerStatsState = usePlayerStatsStore.getInitialState();
const initialSettingsState = useSettingsStore.getInitialState();
const initialStartupMigrationState = useStartupMigrationStore.getInitialState();
const initialTournamentState = useTournamentStore.getInitialState();
const initialUIState = useUIStore.getInitialState();

export function resetDashboardStores() {
  useGameStore.setState(initialGameState, true);
  useGameSessionStore.setState(initialGameSessionState, true);
  useAdvancedTrackingStore.setState(initialAdvancedTrackingState, true);
  useSavedAdvancedGamesStore.setState(
    {
      ...initialSavedAdvancedGamesState,
      summariesLoaded: true,
    },
    true,
  );
  useTutorialStore.setState(initialTutorialState, true);
}

export function resetAllStores() {
  resetAdvancedTrackingStorage();
  resetDashboardStores();
  useLinePresetsStore.setState(initialLinePresetsState, true);
  useNumberPickerStore.setState(initialNumberPickerState, true);
  usePlayerStatsStore.setState(initialPlayerStatsState, true);
  useSettingsStore.setState(initialSettingsState, true);
  useStartupMigrationStore.setState(initialStartupMigrationState, true);
  useTournamentStore.setState(initialTournamentState, true);
  useUIStore.setState(initialUIState, true);
}

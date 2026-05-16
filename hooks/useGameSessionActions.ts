import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';

export function startBasicGameSession() {
  useAdvancedTrackingStore.getState().resetCurrentGame();
  useGameStore.getState().resetGame();
  useGameSessionStore.getState().setActiveGameType('basic');
}

export function startAdvancedGameSession() {
  useAdvancedTrackingStore.getState().resetCurrentGame();
  useGameStore.getState().resetGame();
  useGameSessionStore.getState().setActiveGameType('advanced');
}

export function finishActiveGameSession() {
  useGameSessionStore.getState().clearActiveGame();
}

export function restoreBasicGameSession() {
  useGameSessionStore.getState().setActiveGameType('basic');
}

export function restoreAdvancedGameSession() {
  useGameSessionStore.getState().setActiveGameType('advanced');
}

export function useGameSessionActions() {
  return {
    startBasicGameSession,
    startAdvancedGameSession,
    finishActiveGameSession,
    restoreBasicGameSession,
    restoreAdvancedGameSession,
  };
}

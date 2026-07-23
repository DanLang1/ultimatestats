import { BasicEntryOverlay } from '@/components/basic/BasicEntryOverlay';
import { finishActiveGameSession } from '@/hooks/useGameSessionActions';
import { checkGameOver } from '@/lib/basic/gameUtils';
import { shouldShowLinePrompt } from '@/lib/basic/linePromptUtils';
import { hasItems } from '@/lib/utils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

import { StatEntryInner } from './StatEntryInner';

export type StatEntryDestination = 'line-editor' | 'point-summary';

interface StatEntryOverlayProps {
  onFinish: (destination: StatEntryDestination) => void;
}

export function StatEntryOverlay({ onFinish }: StatEntryOverlayProps) {
  const {
    pendingStatEntry,
    currentTeam,
    team2Name,
    addPlayer,
    addGoalEvent,
    cancelPendingGoal,
    pointTimerEnabled,
    isHalftimeBreak,
    currentLine,
  } = useGameStore();
  const { lineCallingEnabled, statEntryOrder } = useSettingsStore();

  if (!pendingStatEntry) {
    return null;
  }

  const currentLineSet = new Set(currentLine);
  const roster = hasItems(currentLine)
    ? currentTeam.roster.filter((player) => currentLineSet.has(player.id))
    : currentTeam.roster;
  const teamName = pendingStatEntry.team === 'team1' ? currentTeam.name : team2Name;

  const handleComplete = async (goalPlayerId: string | null, assistPlayerId: string | null) => {
    addGoalEvent({ goalPlayerId, assistPlayerId });

    const state = useGameStore.getState();
    const isGameOver = checkGameOver({
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      gameTo: state.gameTo,
      timerTimeLeft: state.timerTimeLeft,
    });

    if (isGameOver) {
      if (state.statTrackingEnabled) {
        await state.saveCurrentGame();
      }
      state.setCurrentGameStatus('finished');
      state.setPostGameFlowPending(true);
      finishActiveGameSession();
      return;
    }

    if (isHalftimeBreak) {
      return;
    }

    if (shouldShowLinePrompt()) {
      onFinish('line-editor');
      return;
    }

    if (pointTimerEnabled) {
      onFinish('point-summary');
      return;
    }
  };

  const handleCancel = () => {
    cancelPendingGoal();
  };

  return (
    <BasicEntryOverlay testID="stat-entry-overlay" onDismiss={handleCancel}>
      <StatEntryInner
        key={`${teamName}-${pendingStatEntry.pointNumber}`}
        teamName={teamName}
        roster={roster}
        onCancel={handleCancel}
        onComplete={handleComplete}
        onAddPlayer={addPlayer}
        entryOrder={statEntryOrder}
        showAddPlayer={!lineCallingEnabled || !hasItems(currentLine)}
      />
    </BasicEntryOverlay>
  );
}

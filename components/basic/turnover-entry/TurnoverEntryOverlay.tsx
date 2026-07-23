import { BasicEntryOverlay } from '@/components/basic/BasicEntryOverlay';
import { hasItems } from '@/lib/utils';
import { useGameStore } from '@/store/basic/gameStore';
import { TurnoverType } from '@/store/basic/gameStore.types';
import { useSettingsStore } from '@/store/settingsStore';

import { TurnoverEntryInner } from './TurnoverEntryInner';

interface TurnoverEntryOverlayProps {
  preselectedType?: TurnoverType;
  onDismiss: () => void;
}

export function TurnoverEntryOverlay({ preselectedType, onDismiss }: TurnoverEntryOverlayProps) {
  const {
    pendingTurnoverEntry,
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    addPlayer,
    addTurnoverEvent,
    clearPendingTurnoverEntry,
    currentLine,
  } = useGameStore();
  const { lineCallingEnabled } = useSettingsStore();
  if (!pendingTurnoverEntry) {
    return null;
  }

  const team1Name = currentTeam.name;
  const currentLineSet = new Set(currentLine);
  const lineFilteredRoster = hasItems(currentLine)
    ? currentTeam.roster.filter((player) => currentLineSet.has(player.id))
    : currentTeam.roster;
  const teamName = possession === 'team1' ? team1Name : team2Name;
  const isMyTeamTurnover = statTrackingEnabled && possession === 'team1';
  const isOpponentTurnover = statTrackingEnabled && possession === 'team2';
  const displayTeamName = isOpponentTurnover ? team1Name : teamName;

  const handleCancel = () => {
    clearPendingTurnoverEntry();
    onDismiss();
  };

  const handleComplete = (
    type: TurnoverType,
    playerId: string | null,
    player2Id?: string | null,
  ) => {
    let team: 'team1' | 'team2';
    if (type === 'block') {
      team = possession === 'team1' ? 'team2' : 'team1';
    } else {
      team = possession ?? 'team1';
    }

    addTurnoverEvent({
      team,
      subtype: type,
      playerId,
      player2Id,
    });
    onDismiss();
  };

  return (
    <BasicEntryOverlay testID="turnover-entry-overlay" onDismiss={handleCancel}>
      <TurnoverEntryInner
        key={`turnover-${possession}-${preselectedType}`}
        teamName={displayTeamName}
        roster={lineFilteredRoster}
        onCancel={handleCancel}
        onComplete={handleComplete}
        onAddPlayer={addPlayer}
        isMyTeamTurnover={isMyTeamTurnover}
        isOpponentTurnover={isOpponentTurnover}
        preselectedType={preselectedType}
        showAddPlayer={!lineCallingEnabled || !hasItems(currentLine)}
      />
    </BasicEntryOverlay>
  );
}

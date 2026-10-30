import { useState } from 'react';

import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import {
  getAnalyticsSidePerspective,
  resolveAnalyticsSideId,
} from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { getLiveInProgressGame } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';

/** Live stats for the current game: advanced analytics while one is in progress, else basic. */
export default function LiveGameStats() {
  const { palette } = useTheme();
  const liveAdvancedGame = useAdvancedTrackingStore(getLiveInProgressGame);
  const {
    currentTeam,
    team2Name,
    team1Score,
    team2Score,
    events,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
    pointLines,
    team1BgColor,
    team2BgColor,
  } = useGameStore();
  const [selectedSideId, setSelectedSideId] = useState<string | null>(null);

  if (liveAdvancedGame == null) {
    return (
      <StatsContent
        team1Name={currentTeam.name}
        team2Name={team2Name}
        team1Score={team1Score}
        team2Score={team2Score}
        events={events}
        roster={currentTeam.roster}
        routeScope="live"
        isSavedGame={false}
        startingPossession={startingPossession}
        gameTo={gameTo}
        autoHalftimeEnabled={autoHalftimeEnabled}
        pointLines={pointLines}
        team1Color={team1BgColor}
        team2Color={team2BgColor}
      />
    );
  }

  const analyticsGame = buildAnalyticsGame(liveAdvancedGame);
  const canSelectEitherSide = areBothSidesFullyTracked(liveAdvancedGame);
  const perspectiveSideId = resolveAnalyticsSideId(
    analyticsGame,
    canSelectEitherSide ? selectedSideId : null,
  );
  const perspective = getAnalyticsSidePerspective(analyticsGame, perspectiveSideId);

  return (
    <>
      {canSelectEitherSide ? (
        <SegmentedControl
          label="STATS FOR"
          options={liveAdvancedGame.sides.map((side, index) => ({
            value: side.id,
            label: side.label,
            testID: `advanced-stats-side-${side.id}`,
            activeColor: index === 0 ? palette.accent : palette.success,
          }))}
          value={perspectiveSideId}
          onChange={setSelectedSideId}
        />
      ) : null}
      <AdvancedStatsContent
        game={analyticsGame}
        gameId={liveAdvancedGame.id}
        myTeamName={perspective.sideName}
        opponentName={perspective.opposingSideName}
        myScore={perspective.score}
        opponentScore={perspective.opposingScore}
        perspectiveSideId={perspective.sideId}
        participantNames={analyticsGame.participantNames}
        routeScope="live"
      />
    </>
  );
}

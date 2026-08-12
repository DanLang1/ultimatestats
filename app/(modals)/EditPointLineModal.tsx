import { Redirect, router, useLocalSearchParams } from 'expo-router';

import EditPointLineSheet from '@/components/basic/timeline/EditPointLineSheet';
import { resolveEditableBasicPointLine } from '@/lib/basic/pointLineEditUtils';
import { Player, PointLineRecord, SavedGame } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';

interface PointLineEditSource {
  roster: Player[];
  pointLines: PointLineRecord[];
}

function getSavedGameSource(game: SavedGame | undefined): PointLineEditSource | null {
  if (!game) return null;
  return {
    roster: game.team1.roster,
    pointLines: game.pointLines ?? [],
  };
}

export default function EditPointLineModal() {
  const params = useLocalSearchParams<{ pointNumber?: string; gameId?: string }>();
  const {
    currentTeam,
    currentGameId,
    currentPoint,
    pointLines,
    savedGames,
    replacePointLine,
    replaceSavedGamePointLine,
  } = useGameStore();

  const savedGameId = params.gameId && params.gameId !== 'current' ? params.gameId : null;
  const source =
    savedGameId === null
      ? { roster: currentTeam.roster, pointLines }
      : getSavedGameSource(savedGames.find((game) => game.id === savedGameId));

  if (!source) {
    return <Redirect href="/SavedGameStats" />;
  }

  const editablePoint = resolveEditableBasicPointLine({
    pointNumber: Number(params.pointNumber),
    pointLines: source.pointLines,
    currentPoint,
    displayedGameId: savedGameId,
    currentGameId,
  });

  if (!editablePoint) {
    return savedGameId === null ? (
      <Redirect href="/GameTimeline" />
    ) : (
      <Redirect href={{ pathname: '/GameTimeline', params: { gameId: savedGameId } }} />
    );
  }

  const pointRecords = source.pointLines.filter(
    (record) => record.pointNumber === editablePoint.pointNumber,
  );
  const hasSubstitutionHistory =
    pointRecords.length > 1 || pointRecords.some((record) => record.isSubstitution);

  const dismiss = () => {
    if (savedGameId === null) {
      router.dismissTo('/GameTimeline');
      return;
    }
    router.dismissTo({ pathname: '/GameTimeline', params: { gameId: savedGameId } });
  };

  const saveLine = (playerIds: string[]): Promise<boolean> => {
    if (savedGameId === null) {
      return Promise.resolve(replacePointLine(editablePoint.pointNumber, playerIds));
    }
    return replaceSavedGamePointLine(savedGameId, editablePoint.pointNumber, playerIds);
  };

  return (
    <EditPointLineSheet
      pointNumber={editablePoint.pointNumber}
      roster={source.roster}
      pointLines={source.pointLines}
      initialLine={editablePoint.playerIds}
      hasSubstitutionHistory={hasSubstitutionHistory}
      onDismiss={dismiss}
      onSave={saveLine}
    />
  );
}

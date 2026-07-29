import type { ShareImportState } from '@/hooks/useShareImport';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import type { SharedPayload } from '@/lib/sharing';
import type { SavedGame, SavedTeam } from '@/lib/storage';

import { ImportDoneContent } from './ImportDoneContent';
import { ImportGamePreviewContent } from './ImportGamePreviewContent';
import { ImportGamesPreviewContent } from './ImportGamesPreviewContent';
import { ImportStatusContent } from './ImportStatusContent';
import { ImportTeamPreviewContent } from './ImportTeamPreviewContent';

type GamePayload = Extract<SharedPayload, { type: 'game' }>;
type AdvancedGamePayload = Extract<SharedPayload, { type: 'advanced-game' }>;
type TeamPayload = Extract<SharedPayload, { type: 'team' }>;

interface ImportStateContentProps {
  isPending: boolean;
  importState: ShareImportState | null;
  savedTeams: SavedTeam[];
  onDismiss: () => void;
  onImportGame: (payload: GamePayload) => void;
  onImportGames: (games: SavedGame[]) => void;
  onImportAdvancedGame: (payload: AdvancedGamePayload) => void;
  onImportAdvancedGames: (games: AdvancedTrackedGame[]) => void;
  onImportTeam: (payload: TeamPayload) => void;
  onViewGame: (gameId: string) => void;
  onViewAdvancedGame: (gameId: string) => void;
  onViewTeam: () => void;
  onViewGames: () => void;
}

export function ImportStateContent({
  isPending,
  importState,
  savedTeams,
  onDismiss,
  onImportGame,
  onImportGames,
  onImportAdvancedGame,
  onImportAdvancedGames,
  onImportTeam,
  onViewGame,
  onViewAdvancedGame,
  onViewTeam,
  onViewGames,
}: ImportStateContentProps) {
  if (isPending) return <ImportStatusContent status="loading" />;
  if (!importState) return null;

  if (importState.status === 'error') {
    return (
      <ImportStatusContent status="error" message={importState.message} onDismiss={onDismiss} />
    );
  }

  if (importState.status === 'preview-game' || importState.status === 'preview-advanced-game') {
    return (
      <ImportGamePreviewContent
        state={importState}
        savedTeams={savedTeams}
        onDismiss={onDismiss}
        onImportGame={onImportGame}
        onImportAdvancedGame={onImportAdvancedGame}
      />
    );
  }

  if (importState.status === 'preview-games' || importState.status === 'preview-advanced-games') {
    return (
      <ImportGamesPreviewContent
        state={importState}
        savedTeams={savedTeams}
        onDismiss={onDismiss}
        onImportGames={onImportGames}
        onImportAdvancedGames={onImportAdvancedGames}
      />
    );
  }

  if (importState.status === 'preview-team' || importState.status === 'team-exists') {
    return (
      <ImportTeamPreviewContent
        state={importState}
        onDismiss={onDismiss}
        onImportTeam={onImportTeam}
      />
    );
  }

  return (
    <ImportDoneContent
      state={importState}
      onViewGame={onViewGame}
      onViewAdvancedGame={onViewAdvancedGame}
      onViewTeam={onViewTeam}
      onViewGames={onViewGames}
    />
  );
}

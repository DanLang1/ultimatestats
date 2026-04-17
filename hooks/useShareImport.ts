import { fetchPayload, SharedPayload } from '@/lib/sharing';
import { SavedGame, SavedTeam } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/store/gameStore';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

type GamePayload = Extract<SharedPayload, { type: 'game' }>;
type TeamPayload = Extract<SharedPayload, { type: 'team' }>;
type GamesPayload = Extract<SharedPayload, { type: 'games' }>;

export type ShareImportState =
  | { status: 'preview-game'; payload: GamePayload; isUpdate: boolean }
  | { status: 'preview-team'; payload: TeamPayload }
  | { status: 'preview-games'; payload: GamesPayload; games: SavedGame[]; updateCount: number }
  | { status: 'team-exists'; payload: TeamPayload; existingTeam: SavedTeam }
  | { status: 'error'; message: string }
  | { status: 'done'; type: 'game'; gameId: string }
  | { status: 'done'; type: 'team' }
  | { status: 'done'; type: 'games'; count: number };

function deriveImportState(
  payload: SharedPayload,
  savedGames: SavedGame[],
  savedTeams: SavedTeam[],
): ShareImportState {
  if (payload.type === 'game') {
    const isUpdate = savedGames.some((g) => g.id === payload.data.id);
    return { status: 'preview-game', payload, isUpdate };
  }

  if (payload.type === 'team') {
    const existing = savedTeams.find((t) => t.id === payload.data.id);
    if (existing) {
      return { status: 'team-exists', payload, existingTeam: existing };
    }
    return { status: 'preview-team', payload };
  }

  const existingIds = new Set(savedGames.map((g) => g.id));
  const updateCount = payload.data.filter((g) => existingIds.has(g.id)).length;
  return { status: 'preview-games', payload, games: payload.data, updateCount };
}

export function useShareImport(shareId: string | undefined) {
  const { savedGames, savedTeams } = useGameStore();
  // Only set after a user action (import confirmed/cancelled) to override the derived state
  const [doneState, setDoneState] = useState<ShareImportState | null>(null);

  const query = useQuery({
    queryKey: ['sharePayload', shareId],
    queryFn: async () => {
      const payload = await fetchPayload(shareId!);
      // .then() required — Supabase builder is lazy; request only fires when consumed
      supabase.rpc('increment_view_count', { share_id: shareId }).then(() => {});
      return payload;
    },
    enabled: !!shareId,
  });

  let importState: ShareImportState | null = null;
  if (doneState) {
    importState = doneState;
  } else if (query.isError) {
    importState = {
      status: 'error',
      message: 'Could not load shared data. The link may have expired.',
    };
  } else if (query.data) {
    importState = deriveImportState(query.data, savedGames, savedTeams);
  }

  return { isPending: query.isPending, importState, setImportState: setDoneState };
}

import { fetchPayload, SharedPayload } from '@/lib/sharing';
import { SavedGame, SavedTeam } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/store/gameStore';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export type ShareImportState =
  | { status: 'preview'; payload: SharedPayload; isUpdate: boolean }
  | {
      status: 'preview-games';
      payload: SharedPayload;
      games: SavedGame[];
      updateCount: number;
    }
  | { status: 'team-exists'; payload: SharedPayload; existingTeam: SavedTeam }
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
    const game = payload.data as SavedGame;
    const isUpdate = savedGames.some((g) => g.id === game.id);
    return { status: 'preview', payload, isUpdate };
  }

  if (payload.type === 'team') {
    const team = payload.data as SavedTeam;
    const existing = savedTeams.find((t) => t.id === team.id);
    if (existing) {
      return { status: 'team-exists', payload, existingTeam: existing };
    }
  }

  if (payload.type === 'games') {
    const allGames = payload.data as SavedGame[];
    const existingIds = new Set(savedGames.map((g) => g.id));
    const updateCount = allGames.filter((g) => existingIds.has(g.id)).length;
    return { status: 'preview-games', payload, games: allGames, updateCount };
  }

  return { status: 'preview', payload, isUpdate: false };
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

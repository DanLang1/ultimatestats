import { fetchPayload, SharedPayload } from '@/lib/sharing';
import { SavedGame, SavedTeam } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/store/gameStore';
import { useEffect, useRef, useState } from 'react';

export type ShareImportState =
  | { status: 'loading' }
  | { status: 'preview'; payload: SharedPayload }
  | {
      status: 'preview-games';
      payload: SharedPayload;
      newGames: SavedGame[];
      duplicateCount: number;
    }
  | { status: 'duplicate'; isMultiple?: boolean }
  | { status: 'team-exists'; payload: SharedPayload; existingTeam: SavedTeam }
  | { status: 'error'; message: string }
  | { status: 'done'; type: 'game'; gameId: string }
  | { status: 'done'; type: 'team' }
  | { status: 'done'; type: 'games'; count: number };

export function useShareImport(shareId: string | undefined) {
  const { savedGames, savedTeams } = useGameStore();
  const [state, setState] = useState<ShareImportState>({ status: 'loading' });
  const hasStartedFetch = useRef(false);

  useEffect(() => {
    if (hasStartedFetch.current || !shareId) return;
    hasStartedFetch.current = true;

    (async () => {
      try {
        const payload = await fetchPayload(shareId);

        // .then() required — Supabase builder is lazy; request only fires when consumed
        supabase.rpc('increment_view_count', { share_id: shareId }).then(() => {});

        if (payload.type === 'game') {
          const game = payload.data as SavedGame;
          if (savedGames.some((g) => g.id === game.id)) {
            setState({ status: 'duplicate' });
            return;
          }
        }

        if (payload.type === 'team') {
          const team = payload.data as SavedTeam;
          const existing = savedTeams.find((t) => t.id === team.id);
          if (existing) {
            setState({ status: 'team-exists', payload, existingTeam: existing });
            return;
          }
        }

        if (payload.type === 'games') {
          const allGames = payload.data as SavedGame[];
          const existingIds = new Set(savedGames.map((g) => g.id));
          const newGames = allGames.filter((g) => !existingIds.has(g.id));
          const duplicateCount = allGames.length - newGames.length;

          if (newGames.length === 0) {
            setState({ status: 'duplicate', isMultiple: true });
            return;
          }

          setState({ status: 'preview-games', payload, newGames, duplicateCount });
          return;
        }

        setState({ status: 'preview', payload });
      } catch {
        setState({
          status: 'error',
          message: 'Could not load shared data. The link may have expired.',
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; savedGames/savedTeams read from initial snapshot
  }, [shareId]);

  return { importState: state, setImportState: setState };
}

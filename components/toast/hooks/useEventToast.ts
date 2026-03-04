import { EVENT_RECORDED_TOAST_DURATION_MS } from '@/lib/constants';
import { getPlayerName as getPlayerNameFromRoster, UNKNOWN_PLAYER_ID } from '@/lib/playerUtils';
import { Player } from '@/lib/storage';
import { EventToastSignal, GameEvent, TurnoverEvent } from '@/store/gameStore.types';
import { useEffect, useState } from 'react';

export type EventIconInfo = {
  library: 'material' | 'fontawesome5';
  name: string;
};

type EventToastState = {
  visible: boolean;
  message: string;
  tone: 'success' | 'danger' | 'neutral';
  icon: EventIconInfo;
};

const UNKNOWN_PLAYER_LABEL = 'Unknown player';

function getPlayerName(playerId: string | null | undefined, roster: Player[]): string | null {
  const resolved = getPlayerNameFromRoster(roster, playerId ?? null);
  if (resolved === 'Unknown') return UNKNOWN_PLAYER_LABEL;
  if (resolved?.startsWith('Deleted Player')) return null;
  if (playerId === UNKNOWN_PLAYER_ID) return UNKNOWN_PLAYER_LABEL;
  return resolved;
}

// ---------------------------------------------------------------------------
// Turnover signal
// ---------------------------------------------------------------------------

function getTurnoverMessage(event: TurnoverEvent, roster: Player[], team2Name: string) {
  const isOpponent = event.team === 'team2';
  const playerName = getPlayerName(event.playerId, roster);
  const player2Name = getPlayerName(event.player2Id, roster);

  if (isOpponent) {
    // Opponent action
    switch (event.subtype) {
      case 'block':
        // "Opp D" button — their team blocked us
        return `${team2Name} blocked us`;
      case 'throwaway':
        return `${team2Name} turnover`;
      default:
        return `${team2Name} turnover`;
    }
  }

  // Our team actions
  const playerLabel = playerName ?? UNKNOWN_PLAYER_LABEL;
  const nameLabel = playerName ? ` by ${playerName}` : '';
  switch (event.subtype) {
    case 'block':
      return `${playerLabel} got a block`;
    case 'throwaway':
      return `${playerLabel} threw it away`;
    case 'drop':
      return `${playerLabel} dropped it`;
    case 'fiftyfifty': {
      const player1Label = playerName ?? UNKNOWN_PLAYER_LABEL;
      const player2Label = player2Name ?? UNKNOWN_PLAYER_LABEL;
      if (event.playerId === event.player2Id) {
        return `Turnover by ${player1Label}`;
      }
      if (player1Label === UNKNOWN_PLAYER_LABEL && player2Label === UNKNOWN_PLAYER_LABEL) {
        return 'Turnover by Unknown Players';
      }
      return `Turnover by ${player1Label} and ${player2Label}`;
    }
    default:
      return `Turnover${nameLabel}`;
  }
}

function getTurnoverTone(event: TurnoverEvent): 'success' | 'danger' {
  const isOurTeamBlock = event.subtype === 'block' && event.team === 'team1';
  const isOpponentThrowaway = event.subtype === 'throwaway' && event.team === 'team2';
  return isOurTeamBlock || isOpponentThrowaway ? 'success' : 'danger';
}

const DEFAULT_ICON: EventIconInfo = { library: 'material', name: 'swap-horizontal' };

function getTurnoverIcon(event: TurnoverEvent): EventIconInfo {
  if (event.team === 'team2') {
    // Opponent actions
    if (event.subtype === 'block') return { library: 'material', name: 'hand-front-left-outline' };
    return { library: 'material', name: 'gift-outline' };
  }

  // Our team actions
  switch (event.subtype) {
    case 'block':
      return { library: 'material', name: 'hand-back-left-outline' };
    case 'drop':
      return { library: 'fontawesome5', name: 'hands-wash' };
    case 'throwaway':
      return { library: 'material', name: 'trash-can-outline' };
    case 'fiftyfifty':
      return { library: 'material', name: 'scale-balance' };
    default:
      return DEFAULT_ICON;
  }
}

// ---------------------------------------------------------------------------
// Undo signal
// ---------------------------------------------------------------------------

function getUndoMessage(event: GameEvent, roster: Player[], team2Name: string): string {
  if (event.type === 'goal') {
    if (event.team === 'team2') return `${team2Name} goal undone`;
    const scorer = getPlayerName(event.goalPlayerId, roster);
    return scorer ? `${scorer}'s goal undone` : 'Goal undone';
  }

  if (event.type === 'turnover') {
    if (event.team === 'team2') {
      switch (event.subtype) {
        case 'block':
          return `${team2Name} block undone`;
        case 'throwaway':
          return `${team2Name} turn undone`;
        default:
          return `${team2Name} turn undone`;
      }
    }
    const player = getPlayerName(event.playerId, roster);
    const player2 = getPlayerName(event.player2Id, roster);
    switch (event.subtype) {
      case 'block':
        return player ? `${player}'s block undone` : 'Block undone';
      case 'throwaway':
        return player ? `${player}'s throw undone` : 'Throwaway undone';
      case 'drop':
        return player ? `${player}'s drop undone` : 'Drop undone';
      case 'fiftyfifty': {
        const names =
          event.playerId === event.player2Id
            ? [player].filter(Boolean)
            : [player, player2].filter(Boolean);
        return names.length > 0 ? `Turnover by ${names.join(' & ')} undone` : 'Turnover undone';
      }
      default:
        return player ? `Turnover by ${player} undone` : 'Turnover undone';
    }
  }

  if (event.type === 'timeout') {
    const teamLabel = event.team === 'team1' ? 'Timeout' : `${team2Name} timeout`;
    return `${teamLabel} undone`;
  }

  return 'Action undone';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

type ToastOptions = {
  roster: Player[];
  team2Name: string;
  eventToastSignal: EventToastSignal | null;
  clearEventToastSignal: () => void;
};

export function useEventToast({
  roster,
  team2Name,
  eventToastSignal,
  clearEventToastSignal,
}: ToastOptions) {
  const [toast, setToast] = useState<EventToastState>({
    visible: false,
    message: '',
    tone: 'danger',
    icon: DEFAULT_ICON,
  });
  const [toastInstanceId, setToastInstanceId] = useState(0);

  const dismissToast = () => {
    setToast((current) => (current.visible ? { ...current, visible: false } : current));
  };

  useEffect(() => {
    if (!eventToastSignal) return;

    let message: string;
    let tone: EventToastState['tone'];
    let icon: EventIconInfo;

    if (eventToastSignal.kind === 'turnover') {
      message = getTurnoverMessage(eventToastSignal.event, roster, team2Name);
      tone = getTurnoverTone(eventToastSignal.event);
      icon = getTurnoverIcon(eventToastSignal.event);
    } else if (eventToastSignal.kind === 'undo') {
      message = getUndoMessage(eventToastSignal.event, roster, team2Name);
      tone = 'neutral';
      icon = { library: 'material', name: 'undo-variant' };
    } else {
      // opponentGoal
      message = `${team2Name} scored`;
      tone = 'danger';
      icon = { library: 'material', name: 'bullseye-arrow' };
    }

    setToast({ visible: true, message, tone, icon });
    setToastInstanceId((current) => current + 1);
    clearEventToastSignal();
  }, [eventToastSignal, roster, team2Name, clearEventToastSignal]);

  useEffect(() => {
    if (!toast.visible) return;
    const timeoutId = setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, EVENT_RECORDED_TOAST_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [toast.visible, toastInstanceId]);

  return { toast, toastInstanceId, dismissToast };
}

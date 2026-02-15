import { EVENT_RECORDED_TOAST_DURATION_MS } from '@/lib/constants';
import { Player } from '@/lib/storage';
import { TurnoverEvent, TurnoverToastSignal } from '@/store/gameStore.types';
import { useEffect, useState } from 'react';

export type TurnoverIconInfo = {
  library: 'material' | 'fontawesome5';
  name: string;
};

type TurnoverToastState = {
  visible: boolean;
  message: string;
  tone: 'success' | 'danger';
  icon: TurnoverIconInfo;
};

function getPlayerName(playerId: string | null | undefined, roster: Player[]): string | null {
  if (!playerId) return null;
  return roster.find((p) => p.id === playerId)?.name ?? null;
}

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
  const nameLabel = playerName ? ` by ${playerName}` : '';
  switch (event.subtype) {
    case 'block':
      return `${playerName} got a block`;
    case 'throwaway':
      return `${playerName} threw it away`;
    case 'drop':
      return `${playerName} dropped it`;
    case 'fiftyfifty': {
      const names = [playerName, player2Name].filter(Boolean);
      if (names.length === 2) {
        return `Turnover by ${names[0]} and ${names[1]}`;
      }
      if (names.length === 1) {
        return `Turnover by ${names[0]}`;
      }
      return 'Turnover recorded';
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

const DEFAULT_ICON: TurnoverIconInfo = { library: 'material', name: 'swap-horizontal' };

function getTurnoverIcon(event: TurnoverEvent): TurnoverIconInfo {
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

type ToastOptions = {
  roster: Player[];
  team2Name: string;
  turnoverToastSignal: TurnoverToastSignal | null;
  clearTurnoverToastSignal: () => void;
};

export function useTurnoverRecordedToast({
  roster,
  team2Name,
  turnoverToastSignal,
  clearTurnoverToastSignal,
}: ToastOptions) {
  const [toast, setToast] = useState<TurnoverToastState>({
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
    if (!turnoverToastSignal) return;

    const message = getTurnoverMessage(turnoverToastSignal.event, roster, team2Name);
    const tone = getTurnoverTone(turnoverToastSignal.event);
    const icon = getTurnoverIcon(turnoverToastSignal.event);

    setToast({ visible: true, message, tone, icon });
    setToastInstanceId((current) => current + 1);
    clearTurnoverToastSignal();
  }, [turnoverToastSignal, roster, team2Name, clearTurnoverToastSignal]);

  useEffect(() => {
    if (!toast.visible) return;
    const timeoutId = setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, EVENT_RECORDED_TOAST_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [toast.visible, toastInstanceId]);

  return { toast, toastInstanceId, dismissToast };
}

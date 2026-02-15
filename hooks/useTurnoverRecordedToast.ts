import { EVENT_RECORDED_TOAST_DURATION_MS } from '@/lib/constants';
import { Player } from '@/lib/storage';
import { GameEvent, TurnoverEvent, TurnoverToastSignal } from '@/store/gameStore.types';
import { useEffect, useState } from 'react';

type TurnoverToastState = {
  visible: boolean;
  message: string;
  tone: 'success' | 'danger';
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

function getTurnoverSignature(event: GameEvent, eventIndex: number) {
  if (event.type !== 'turnover') return null;
  return [
    eventIndex,
    event.type,
    event.team,
    event.subtype,
    event.playerId ?? 'null',
    event.player2Id ?? 'null',
    event.pointNumber ?? 'null',
    event.elapsedMs ?? 'null',
  ].join('|');
}

function getTurnoverTone(event: TurnoverEvent): 'success' | 'danger' {
  const isOurTeamBlock = event.subtype === 'block' && event.team === 'team1';
  const isOpponentThrowaway = event.subtype === 'throwaway' && event.team === 'team2';
  return isOurTeamBlock || isOpponentThrowaway ? 'success' : 'danger';
}

type ToastOptions = {
  events: GameEvent[];
  undoLastAction: () => boolean;
  roster: Player[];
  team2Name: string;
  turnoverToastSignal: TurnoverToastSignal | null;
  clearTurnoverToastSignal: () => void;
};

export function useTurnoverRecordedToast({
  events,
  undoLastAction,
  roster,
  team2Name,
  turnoverToastSignal,
  clearTurnoverToastSignal,
}: ToastOptions) {
  const [toast, setToast] = useState<TurnoverToastState>({
    visible: false,
    message: '',
    tone: 'danger',
  });
  const [turnoverSignature, setTurnoverSignature] = useState<string | null>(null);
  const [toastInstanceId, setToastInstanceId] = useState(0);

  const dismissToast = () => {
    setToast((current) => (current.visible ? { ...current, visible: false } : current));
    setTurnoverSignature(null);
  };

  const handleUndoTurnover = () => {
    if (!toast.visible || !turnoverSignature) return;
    const lastEventIndex = events.length - 1;
    const lastEvent = events[lastEventIndex];
    const latestSignature = lastEvent ? getTurnoverSignature(lastEvent, lastEventIndex) : null;

    if (latestSignature !== turnoverSignature) {
      dismissToast();
      return;
    }

    const didUndo = undoLastAction();
    if (didUndo) {
      dismissToast();
    }
  };

  useEffect(() => {
    if (!turnoverToastSignal) return;

    const message = getTurnoverMessage(turnoverToastSignal.event, roster, team2Name);
    const tone = getTurnoverTone(turnoverToastSignal.event);
    const signature = getTurnoverSignature(
      turnoverToastSignal.event,
      turnoverToastSignal.eventIndex,
    );
    if (!signature) {
      clearTurnoverToastSignal();
      return;
    }

    setTurnoverSignature(signature);
    setToast({ visible: true, message, tone });
    setToastInstanceId((current) => current + 1);
    clearTurnoverToastSignal();
  }, [turnoverToastSignal, roster, team2Name, clearTurnoverToastSignal]);

  useEffect(() => {
    if (!toast.visible) return;
    const timeoutId = setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
      setTurnoverSignature(null);
    }, EVENT_RECORDED_TOAST_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [toast.visible, toastInstanceId]);

  return {
    toast,
    dismissToast,
    handleUndoTurnover,
  };
}

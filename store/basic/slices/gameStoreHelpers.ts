import { DEFAULT_HALFTIME_BREAK_SECONDS, DEFAULT_TIMEOUT_SECONDS } from '@/lib/constants';
import { getLatestLineForPoint } from '@/lib/lineUtils';
import { Player, PointLineRecord } from '@/lib/storage';

import { GameState } from '../gameStore.types';

export function canReplacePointLine(
  pointLines: PointLineRecord[],
  pointNumber: number,
  playerIds: string[],
  roster: Player[],
): boolean {
  const existingLine = getLatestLineForPoint(pointLines, pointNumber);
  if (existingLine.length === 0 || playerIds.length !== existingLine.length) return false;
  if (new Set(playerIds).size !== playerIds.length) return false;

  const rosterPlayerIds = new Set(roster.map((player) => player.id));
  return playerIds.every((playerId) => rosterPlayerIds.has(playerId));
}

export function resetGameState(state: GameState, hardCapMinutes: number) {
  state.team1Score = 0;
  state.team2Score = 0;
  state.team1Timeouts.fill(true);
  state.team2Timeouts.fill(true);
  state.team1Floater = true;
  state.team2Floater = true;
  state.gameHalf = 1;
  state.isSoftCap = false;
  state.softCapPending = false;
  state.gameTo = state.baseGameTo;
  state.events = [];
  state.pendingStatEntry = null;
  state.possession = null;
  state.startingPossession = null;
  state.pendingTurnoverEntry = null;
  state.eventToastSignal = null;
  state.currentPoint = 1;
  state.timerEndTime = null;
  state.timerTimeLeft = hardCapMinutes * 60;
  state.currentGameStatus = 'fresh';
  state.isPostGameFlowPending = false;
  state.currentGameId = null;
  state.isHalftimeBreak = false;
  state.halftimeEndTime = null;
  state.halftimeTimeLeft = DEFAULT_HALFTIME_BREAK_SECONDS;
  state.pendingTimeoutModal = false;
  state.timeoutEndTime = null;
  state.timeoutTimeLeft = DEFAULT_TIMEOUT_SECONDS;
  state.currentPointStartTime = null;
  state.pointStartTimestamps = {};
  state.pointTimerPausedElapsed = null;
  state.currentLine = [];
  state.pointLines = [];
}

import { getGameSessionStatus } from '../gameSessionUtils';

describe('getGameSessionStatus', () => {
  const baseState = {
    team1Score: 0,
    team2Score: 0,
    gameTo: 15,
    timerTimeLeft: 3600,
    currentGameStatus: 'fresh',
    events: [],
    currentPoint: 1,
    currentPointStartTime: null,
    pointTimerPausedElapsed: null,
    possession: null,
    startingPossession: null,
    pendingStatEntry: null,
    pendingTurnoverEntry: null,
    pendingTimeoutModal: false,
    isHalftimeBreak: false,
    currentGameId: null,
  } as const;

  it('returns fresh for a clean scoreboard', () => {
    expect(getGameSessionStatus(baseState)).toBe('fresh');
  });

  it('returns inProgress once gameplay has started', () => {
    expect(
      getGameSessionStatus({
        ...baseState,
        team1Score: 1,
        currentPoint: 2,
        events: [{ type: 'goal' }],
      }),
    ).toBe('inProgress');
  });

  it('returns finished when the game status is finished', () => {
    expect(
      getGameSessionStatus({
        ...baseState,
        team1Score: 15,
        team2Score: 13,
        currentGameStatus: 'finished',
      }),
    ).toBe('finished');
  });

  it('returns finished when the score state is already game over', () => {
    expect(
      getGameSessionStatus({
        ...baseState,
        team1Score: 15,
        team2Score: 13,
      }),
    ).toBe('finished');
  });
});

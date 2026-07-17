import { PointLineRecord } from '@/lib/storage/types';
import { GameEvent } from '@/store/basic/gameStore.types';

import { hasPlayerParticipatedInCurrentGame } from '../playerUtils';

describe('hasPlayerParticipatedInCurrentGame', () => {
  it('returns true when the player appears in point lines', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1000 },
    ];

    expect(hasPlayerParticipatedInCurrentGame('b', [], pointLines)).toBe(true);
  });

  it('returns true when the player is attributed in a goal event', () => {
    const events: GameEvent[] = [
      {
        type: 'goal',
        team: 'team1',
        goalPlayerId: 'a',
        assistPlayerId: 'b',
      },
    ];

    expect(hasPlayerParticipatedInCurrentGame('a', events, [])).toBe(true);
    expect(hasPlayerParticipatedInCurrentGame('b', events, [])).toBe(true);
  });

  it('returns true when the player is attributed in a turnover event', () => {
    const events: GameEvent[] = [
      {
        type: 'turnover',
        team: 'team1',
        subtype: 'fiftyfifty',
        playerId: 'a',
        player2Id: 'b',
      },
    ];

    expect(hasPlayerParticipatedInCurrentGame('a', events, [])).toBe(true);
    expect(hasPlayerParticipatedInCurrentGame('b', events, [])).toBe(true);
  });

  it('returns false for timeout-only participation or absent players', () => {
    const events: GameEvent[] = [
      {
        type: 'timeout',
        team: 'team1',
        index: 0,
        isFloater: false,
      },
    ];

    expect(hasPlayerParticipatedInCurrentGame('a', events, [])).toBe(false);
  });
});

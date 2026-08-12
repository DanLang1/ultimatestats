import {
  canEditBasicPointLine,
  resolveEditableBasicPointLine,
} from '@/lib/basic/pointLineEditUtils';
import { PointLineRecord } from '@/lib/storage/types';

const pointLines: PointLineRecord[] = [{ pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1 }];

describe('canEditBasicPointLine', () => {
  it('allows a completed point in the live game', () => {
    const input = {
      pointNumber: 1,
      pointLines,
      currentPoint: 2,
      displayedGameId: null,
      currentGameId: 'game-1',
    };

    expect(canEditBasicPointLine(input)).toBe(true);
    expect(resolveEditableBasicPointLine(input)).toEqual({
      pointNumber: 1,
      playerIds: ['a', 'b'],
    });
  });

  it('blocks the in-progress point in the live game', () => {
    expect(
      canEditBasicPointLine({
        pointNumber: 1,
        pointLines,
        currentPoint: 1,
        displayedGameId: null,
        currentGameId: 'game-1',
      }),
    ).toBe(false);
  });

  it('blocks the in-progress point through the matching saved record', () => {
    expect(
      canEditBasicPointLine({
        pointNumber: 1,
        pointLines,
        currentPoint: 1,
        displayedGameId: 'game-1',
        currentGameId: 'game-1',
      }),
    ).toBe(false);
  });

  it('allows a recorded point in an unrelated saved game', () => {
    expect(
      canEditBasicPointLine({
        pointNumber: 1,
        pointLines,
        currentPoint: 1,
        displayedGameId: 'historical-game',
        currentGameId: 'current-game',
      }),
    ).toBe(true);
  });

  it('rejects a point without line data', () => {
    expect(
      canEditBasicPointLine({
        pointNumber: 2,
        pointLines,
        currentPoint: 3,
        displayedGameId: null,
        currentGameId: 'game-1',
      }),
    ).toBe(false);
  });
});

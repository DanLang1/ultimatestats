import {
  correctAdvancedPointLines,
  type CorrectAdvancedPointLinesInput,
} from '../advancedPointLineCorrectionUtils';
import type { AdvancedTrackedGame } from '../types';

const HOME = 'home';
const AWAY = 'away';

const participantRef = (participantId: string) => ({
  refType: 'participant' as const,
  participantId,
});

function makeGame(): AdvancedTrackedGame {
  return {
    id: 'point-line-correction-game',
    schemaVersion: 3,
    createdAt: 1,
    updatedAt: 1,
    gameType: 'game',
    status: 'final',
    focusSideId: HOME,
    initialReceivingSideId: HOME,
    settings: { locationMode: 'none' },
    sides: [
      { id: HOME, label: 'Home', trackingMode: 'full-roster' },
      { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [
      { id: 'thrower', name: 'Thrower' },
      { id: 'subbed-out', name: 'Subbed Out' },
      { id: 'scorer', name: 'Scorer' },
      { id: 'replacement', name: 'Replacement' },
      { id: 'bench', name: 'Bench' },
    ],
    points: [
      {
        id: 'point-1',
        lines: [{ sideId: HOME, participantIds: ['thrower', 'subbed-out', 'scorer'] }],
        subs: [
          {
            id: 'sub-1',
            sideId: HOME,
            type: 'injury',
            inIds: ['replacement'],
            outIds: ['subbed-out'],
            stoppageActionId: 'injury-1',
          },
        ],
        possessions: [
          {
            id: 'possession-1',
            sideId: HOME,
            actions: [
              {
                id: 'injury-1',
                kind: 'stoppage',
                reason: 'injury',
                pausedAt: 100,
                resumedAt: 200,
              },
              {
                id: 'goal-1',
                kind: 'throw',
                sideId: HOME,
                thrower: participantRef('thrower'),
                toPlayer: participantRef('scorer'),
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };
}

function correction(lines: string[]): CorrectAdvancedPointLinesInput {
  return { pointId: 'point-1', lines: [{ sideId: HOME, participantIds: lines }] };
}

describe('advanced point line corrections', () => {
  it('reuses active correction rules and reconciles an overridden injury substitution', () => {
    const game = makeGame();
    const corrected = correctAdvancedPointLines(
      game,
      correction(['thrower', 'scorer', 'replacement']),
    );

    expect(corrected.points[0].lines[0].participantIds).toEqual([
      'thrower',
      'scorer',
      'replacement',
    ]);
    expect(corrected.points[0].subs).toBeUndefined();
    expect(corrected.points[0].possessions[0].actions[1]).toMatchObject({
      id: 'goal-1',
      thrower: participantRef('thrower'),
      toPlayer: participantRef('scorer'),
    });
    expect(game.points[0].lines[0].participantIds).toEqual(['thrower', 'subbed-out', 'scorer']);
  });

  it('rejects removing a participant who recorded an action', () => {
    expect(() =>
      correctAdvancedPointLines(makeGame(), correction(['subbed-out', 'scorer', 'bench'])),
    ).toThrow('Thrower has recorded an action this point and cannot be removed from the lineup.');
  });
});

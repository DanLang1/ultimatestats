import {
  canCorrectAdvancedPointFromTimeline,
  correctAdvancedPointActiveLines,
  getAdvancedLineCorrectionRestrictions,
  reconcileAdvancedLineCorrectionDraft,
  type CorrectAdvancedPointActiveLinesInput,
} from '../advancedPointLineCorrectionUtils';
import { getEffectiveLineParticipantIds } from '../trackingUtils';
import type { AdvancedTrackedGame } from '../types';

const HOME = 'home';
const AWAY = 'away';
const HOME_START = ['thrower', 'injured-out', 'scorer', 'home-4', 'home-5', 'home-6', 'home-7'];
const HOME_ACTIVE = ['thrower', 'scorer', 'home-4', 'home-5', 'home-6', 'home-7', 'injury-in'];

const participantRef = (participantId: string) => ({
  refType: 'participant' as const,
  participantId,
});

function makeGame(): AdvancedTrackedGame {
  const participantIds = [
    ...HOME_START,
    'injury-in',
    'replacement',
    ...Array.from({ length: 7 }, (_, index) => `away-${index + 1}`),
  ];
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
    participants: participantIds.map((id) => ({ id, name: id })),
    points: [
      {
        id: 'point-1',
        lines: [{ sideId: HOME, participantIds: HOME_START }],
        subs: [
          {
            id: 'sub-1',
            sideId: HOME,
            type: 'injury',
            inIds: ['injury-in'],
            outIds: ['injured-out'],
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

function correction(activeParticipantIds: string[]): CorrectAdvancedPointActiveLinesInput {
  return {
    pointId: 'point-1',
    activeLines: [{ sideId: HOME, participantIds: activeParticipantIds }],
  };
}

describe('advanced active-line corrections', () => {
  it('reverse-replays injuries and preserves their exact records', () => {
    const game = makeGame();
    const desiredActiveLine = HOME_ACTIVE.map((id) => (id === 'home-4' ? 'replacement' : id));
    const corrected = correctAdvancedPointActiveLines(game, correction(desiredActiveLine));
    const correctedPoint = corrected.points[0];

    expect(correctedPoint.subs).toEqual(game.points[0].subs);
    expect(new Set(correctedPoint.lines[0].participantIds)).toEqual(
      new Set(['thrower', 'injured-out', 'scorer', 'replacement', 'home-5', 'home-6', 'home-7']),
    );
    expect(getEffectiveLineParticipantIds(correctedPoint, HOME)).toEqual(desiredActiveLine);
    expect(correctedPoint.possessions[0].actions[1]).toMatchObject({
      id: 'goal-1',
      thrower: participantRef('thrower'),
      toPlayer: participantRef('scorer'),
    });
    expect(game.points[0].lines[0].participantIds).toEqual(HOME_START);
  });

  it('rejects removing the active player required by a recorded injury', () => {
    const desiredActiveLine = HOME_ACTIVE.map((id) => (id === 'injury-in' ? 'replacement' : id));

    expect(() =>
      correctAdvancedPointActiveLines(makeGame(), correction(desiredActiveLine)),
    ).toThrow('injury-in entered through a recorded injury substitution and must remain active.');
  });

  it('reverse-replays a chain of trusted injury substitutions', () => {
    const game = makeGame();
    game.participants.push({ id: 'second-injury-in', name: 'second-injury-in' });
    game.points[0].subs!.push({
      id: 'sub-2',
      sideId: HOME,
      type: 'injury',
      inIds: ['second-injury-in'],
      outIds: ['injury-in'],
      stoppageActionId: 'injury-2',
    });
    game.points[0].possessions[0].actions.splice(1, 0, {
      id: 'injury-2',
      kind: 'stoppage',
      reason: 'injury',
      pausedAt: 300,
      resumedAt: 400,
    });
    const desiredActiveLine = HOME_ACTIVE.map((id) => {
      if (id === 'injury-in') return 'second-injury-in';
      if (id === 'home-4') return 'replacement';
      return id;
    });

    const corrected = correctAdvancedPointActiveLines(game, correction(desiredActiveLine));

    expect(corrected.points[0].subs).toEqual(game.points[0].subs);
    expect(getEffectiveLineParticipantIds(corrected.points[0], HOME)).toEqual(desiredActiveLine);
    expect(corrected.points[0].lines[0].participantIds).toContain('injured-out');
    expect(corrected.points[0].lines[0].participantIds).not.toContain('injury-in');
  });

  it('rejects removing a participant who recorded an action', () => {
    const desiredActiveLine = HOME_ACTIVE.map((id) => (id === 'thrower' ? 'replacement' : id));

    expect(() =>
      correctAdvancedPointActiveLines(makeGame(), correction(desiredActiveLine)),
    ).toThrow('thrower has recorded an action this point');
  });

  it('rejects an inconsistent existing injury history instead of discarding it', () => {
    const game = makeGame();
    game.points[0].lines[0].participantIds = game.points[0].lines[0].participantIds.map((id) =>
      id === 'injured-out' ? 'replacement' : id,
    );

    expect(() => correctAdvancedPointActiveLines(game, correction(HOME_ACTIVE))).toThrow(
      'Participant "injured-out" is not active for side "home".',
    );
    expect(game.points[0].subs).toHaveLength(1);
  });

  it('allows actionless active players to swap sides atomically', () => {
    const game = makeGame();
    const awayLine = Array.from({ length: 7 }, (_, index) => `away-${index + 1}`);
    game.sides[1].trackingMode = 'full-roster';
    game.points[0] = {
      id: 'point-1',
      lines: [
        { sideId: HOME, participantIds: HOME_START },
        { sideId: AWAY, participantIds: awayLine },
      ],
      possessions: [],
    };

    const corrected = correctAdvancedPointActiveLines(game, {
      pointId: 'point-1',
      activeLines: [
        {
          sideId: HOME,
          participantIds: [awayLine[0], ...HOME_START.slice(1)],
        },
        {
          sideId: AWAY,
          participantIds: [HOME_START[0], ...awayLine.slice(1)],
        },
      ],
    });

    expect(corrected.points[0].lines[0].participantIds).toContain(awayLine[0]);
    expect(corrected.points[0].lines[1].participantIds).toContain(HOME_START[0]);
  });

  it('derives action, injury, and opposing-history restrictions', () => {
    const game = makeGame();
    const awayLine = Array.from({ length: 7 }, (_, index) => `away-${index + 1}`);
    game.sides[1].trackingMode = 'full-roster';
    game.participants.push({ id: 'away-replacement', name: 'Away Replacement' });
    game.points[0].lines.push({ sideId: AWAY, participantIds: awayLine });
    game.points[0].subs!.push({
      id: 'away-sub',
      sideId: AWAY,
      type: 'injury',
      inIds: ['away-replacement'],
      outIds: ['away-1'],
      stoppageActionId: 'away-injury',
    });
    const restrictions = getAdvancedLineCorrectionRestrictions(game, game.points[0], HOME);

    expect(restrictions.get('thrower')).toEqual({ reason: 'recorded-action' });
    expect(restrictions.get('injury-in')).toEqual({ reason: 'recorded-injury' });
    expect(restrictions.get('injured-out')).toEqual({ reason: 'recorded-injury' });
    expect(restrictions.get('away-1')).toEqual({ reason: 'opposing-history', sideId: AWAY });
    expect(restrictions.has('home-4')).toBe(false);
    expect(restrictions.has('replacement')).toBe(false);
  });

  it('reconciles a two-side draft when a player crosses sides', () => {
    const activeLinesBySide = {
      [HOME]: ['home-1', 'home-2', 'home-3'],
      [AWAY]: ['away-1', 'away-2', 'away-3'],
    };

    expect(
      reconcileAdvancedLineCorrectionDraft({
        activeLinesBySide,
        draftLinesBySide: {},
        selectedSideId: HOME,
        selectedParticipantIds: ['away-1', 'home-2', 'home-3'],
      }),
    ).toEqual({
      [HOME]: ['away-1', 'home-2', 'home-3'],
      [AWAY]: ['away-2', 'away-3'],
    });
  });

  it('restores available active players to an incomplete opposing draft', () => {
    const activeLinesBySide = {
      [HOME]: ['home-1', 'home-2', 'home-3'],
      [AWAY]: ['away-1', 'away-2', 'away-3'],
    };

    expect(
      reconcileAdvancedLineCorrectionDraft({
        activeLinesBySide,
        draftLinesBySide: { [AWAY]: ['away-1', 'away-2'] },
        selectedSideId: HOME,
        selectedParticipantIds: activeLinesBySide[HOME],
      }),
    ).toEqual({
      [HOME]: activeLinesBySide[HOME],
      [AWAY]: activeLinesBySide[AWAY],
    });
  });

  it('uses game termination as the final boundary for its unfinished last point', () => {
    const game = makeGame();
    game.status = 'terminated';
    game.points[0].possessions[0].actions.pop();

    expect(canCorrectAdvancedPointFromTimeline(game, game.points[0])).toBe(true);
    expect(
      canCorrectAdvancedPointFromTimeline({ ...game, status: 'in_progress' }, game.points[0]),
    ).toBe(false);
  });
});

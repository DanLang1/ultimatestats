import { assertValidInjurySubInput, InjurySubInput } from '../trackingUtils';
import {
  AdvancedTrackedGame,
  GameSide,
  Participant,
  TrackedPoint,
  PointPossession,
  StoppageAction,
  ThrowAction,
} from '../types';

const SIDE_A_ID = 'side-a';
const SIDE_B_ID = 'side-b';
const PARTICIPANT_1_ID = 'p1';
const PARTICIPANT_2_ID = 'p2';

function makeSide(id: string, label: string): GameSide {
  return { id, label, trackingMode: 'full-roster' };
}

function makeParticipant(id: string, name: string): Participant {
  return { id, name };
}

function makeGame(overrides: Partial<AdvancedTrackedGame> = {}): AdvancedTrackedGame {
  return {
    id: 'game-1',
    schemaVersion: 1,
    createdAt: 1000,
    updatedAt: 1000,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: SIDE_A_ID,
    initialReceivingSideId: SIDE_A_ID,
    sides: [makeSide(SIDE_A_ID, 'Team A'), makeSide(SIDE_B_ID, 'Team B')],
    participants: [
      makeParticipant(PARTICIPANT_1_ID, 'Player 1'),
      makeParticipant(PARTICIPANT_2_ID, 'Player 2'),
    ],
    settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
    points: [],
    ...overrides,
  };
}

function makeStoppageAction(overrides: Partial<StoppageAction> = {}): StoppageAction {
  return {
    id: 'stoppage-1',
    kind: 'stoppage',
    reason: 'injury',
    recordedAt: 2000,
    ...overrides,
  };
}

function makePossession(overrides: Partial<PointPossession> = {}): PointPossession {
  return {
    id: 'possession-1',
    sideId: SIDE_A_ID,
    actions: [makeStoppageAction()],
    ...overrides,
  };
}

function makePoint(overrides: Partial<TrackedPoint> = {}): TrackedPoint {
  return {
    id: 'point-1',
    lines: [{ sideId: SIDE_A_ID, participantIds: [PARTICIPANT_1_ID] }],
    possessions: [makePossession()],
    ...overrides,
  };
}

function makeInput(overrides: Partial<InjurySubInput> = {}): InjurySubInput {
  return {
    stoppageActionId: 'stoppage-1',
    sideId: SIDE_A_ID,
    inIds: [PARTICIPANT_1_ID],
    outIds: [PARTICIPANT_2_ID],
    ...overrides,
  };
}

describe('assertValidInjurySubInput', () => {
  it('does not throw for valid input', () => {
    const game = makeGame();
    const point = makePoint();
    const input = makeInput();

    expect(() => assertValidInjurySubInput(game, point, input)).not.toThrow();
  });

  it('throws when stoppageActionId is not found in any possession', () => {
    const game = makeGame();
    const point = makePoint();
    const input = makeInput({ stoppageActionId: 'nonexistent' });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Stoppage action "nonexistent" not found in current point.',
    );
  });

  it('throws when action is not a stoppage', () => {
    const game = makeGame();
    const throwAction: ThrowAction = {
      id: 'throw-1',
      kind: 'throw',
      sideId: SIDE_A_ID,
      thrower: { refType: 'participant', participantId: PARTICIPANT_1_ID },
      result: 'complete',
      recordedAt: 3000,
    };
    const possession = makePossession({ actions: [throwAction] });
    const point = makePoint({ possessions: [possession] });
    const input = makeInput({ stoppageActionId: 'throw-1' });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Action "throw-1" is not a stoppage.',
    );
  });

  it('throws when stoppage reason is not injury', () => {
    const game = makeGame();
    const possession = makePossession({
      actions: [makeStoppageAction({ reason: 'timeout' })],
    });
    const point = makePoint({ possessions: [possession] });
    const input = makeInput();

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Only injury stoppages can have subs.',
    );
  });

  it('throws when sideId is unknown', () => {
    const game = makeGame();
    const point = makePoint();
    const input = makeInput({ sideId: 'unknown-side' });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Unknown sideId "unknown-side"',
    );
  });

  it('throws when inIds contain an unknown participant', () => {
    const game = makeGame();
    const point = makePoint();
    const input = makeInput({ inIds: ['unknown-participant'] });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Unknown participantId "unknown-participant"',
    );
  });

  it('throws when outIds contain an unknown participant', () => {
    const game = makeGame();
    const point = makePoint();
    const input = makeInput({ outIds: ['unknown-participant'] });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Unknown participantId "unknown-participant"',
    );
  });

  it('finds the stoppage across multiple possessions', () => {
    const game = makeGame();
    const firstPossession = makePossession({
      id: 'possession-1',
      actions: [
        {
          id: 'pickup-1',
          kind: 'disc_pickup' as const,
          sideId: SIDE_B_ID,
          player: { refType: 'participant' as const, participantId: PARTICIPANT_1_ID },
          recordedAt: 3000,
        },
      ],
    });
    const secondPossession = makePossession({
      id: 'possession-2',
      sideId: SIDE_A_ID,
      actions: [makeStoppageAction({ id: 'stoppage-2' })],
    });
    const point = makePoint({ possessions: [firstPossession, secondPossession] });
    const input = makeInput({ stoppageActionId: 'stoppage-2' });

    expect(() => assertValidInjurySubInput(game, point, input)).not.toThrow();
  });

  it('throws when point has no possessions', () => {
    const game = makeGame();
    const point = makePoint({ possessions: [] });
    const input = makeInput();

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Stoppage action "stoppage-1" not found in current point.',
    );
  });
});

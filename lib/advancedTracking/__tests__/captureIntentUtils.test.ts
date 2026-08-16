import { CaptureIntent, planCaptureIntent } from '../captureIntentUtils';
import type { AdvancedTrackedGame } from '../types';

const game: AdvancedTrackedGame = {
  id: 'game',
  schemaVersion: 2,
  createdAt: 1,
  updatedAt: 1,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: 'home',
  initialReceivingSideId: 'home',
  settings: { locationMode: 'none' },
  sides: [
    { id: 'home', label: 'Home', trackingMode: 'full-roster' },
    { id: 'away', label: 'Away', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: 'holder', name: 'Holder' },
    { id: 'receiver', name: 'Receiver' },
  ],
  points: [
    {
      id: 'point',
      lines: [{ sideId: 'home', participantIds: ['holder', 'receiver'] }],
      possessions: [
        {
          id: 'possession',
          sideId: 'home',
          actions: [
            {
              id: 'pickup',
              kind: 'disc_pickup',
              sideId: 'home',
              player: { refType: 'participant', participantId: 'holder' },
            },
          ],
        },
      ],
    },
  ],
};

describe('planCaptureIntent', () => {
  it('plans a direct goal without a complete-then-amend action', () => {
    expect(
      planCaptureIntent(game, {
        kind: 'goal',
        scorer: { refType: 'participant', participantId: 'receiver' },
      }),
    ).toEqual({
      ok: true,
      plan: {
        throw: {
          thrower: { refType: 'participant', participantId: 'holder' },
          result: 'goal',
          toPlayer: { refType: 'participant', participantId: 'receiver' },
        },
      },
    });
  });

  it('plans anonymous opponent outcomes with possession scaffolding after a turnover', () => {
    const afterTurnover = makeGameAfterFocusTurnover();
    expect(planCaptureIntent(afterTurnover, { kind: 'anonymous-opponent-goal' })).toMatchObject({
      ok: true,
      plan: {
        pickup: { sideId: 'away', player: { refType: 'untracked' } },
        throw: { thrower: { refType: 'untracked' }, result: 'goal' },
      },
    });
  });

  it.each([
    ['block', { kind: 'block', defender: participantRef('receiver') }],
    ['pressure', { kind: 'pressure', defender: participantRef('receiver') }],
    ['stall', { kind: 'stall', defender: participantRef('receiver') }],
  ] satisfies [string, CaptureIntent][])(
    'maps an anonymous opponent %s while preserving the selected defender',
    (_label, intent) => {
      expect(planCaptureIntent(makeGameAfterFocusTurnover(), intent)).toMatchObject({
        ok: true,
        plan: {
          pickup: { sideId: 'away', player: { refType: 'untracked' } },
          throw: {
            thrower: { refType: 'untracked' },
            result: intent.kind,
            defender: participantRef('receiver'),
          },
        },
      });
    },
  );

  it('maps an anonymous opponent Callahan scorer to the canonical receiver field', () => {
    expect(
      planCaptureIntent(makeGameAfterFocusTurnover(), {
        kind: 'callahan',
        scorer: participantRef('receiver'),
      }),
    ).toMatchObject({
      ok: true,
      plan: {
        pickup: { sideId: 'away', player: { refType: 'untracked' } },
        throw: {
          thrower: { refType: 'untracked' },
          result: 'callahan',
          toPlayer: participantRef('receiver'),
        },
      },
    });
  });

  it('maps a fully tracked Callahan scorer to the canonical defender field', () => {
    const trackedGame = structuredClone(game);
    trackedGame.sides[1].trackingMode = 'full-roster';
    trackedGame.participants.push({ id: 'away-scorer', name: 'Away Scorer' });
    trackedGame.points[0].lines.push({ sideId: 'away', participantIds: ['away-scorer'] });

    expect(
      planCaptureIntent(trackedGame, {
        kind: 'callahan',
        scorer: participantRef('away-scorer'),
      }),
    ).toMatchObject({
      ok: true,
      plan: {
        throw: {
          thrower: participantRef('holder'),
          result: 'callahan',
          defender: participantRef('away-scorer'),
        },
      },
    });
  });

  it.each(['pass', 'goal'] as const)('preserves a touch %s to the current holder', (kind) => {
    const intent: CaptureIntent =
      kind === 'pass'
        ? { kind, receiver: participantRef('holder') }
        : { kind, scorer: participantRef('holder') };

    expect(planCaptureIntent(game, intent)).toMatchObject({
      ok: true,
      plan: {
        throw: {
          thrower: participantRef('holder'),
          result: kind === 'pass' ? 'complete' : 'goal',
          toPlayer: participantRef('holder'),
        },
      },
    });
  });
});

function participantRef(participantId: string) {
  return { refType: 'participant' as const, participantId };
}

function makeGameAfterFocusTurnover(): AdvancedTrackedGame {
  const afterTurnover = structuredClone(game);
  afterTurnover.points[0].possessions[0].actions.push({
    id: 'turnover',
    kind: 'throw',
    sideId: 'home',
    thrower: participantRef('holder'),
    result: 'throwaway',
  });
  return afterTurnover;
}

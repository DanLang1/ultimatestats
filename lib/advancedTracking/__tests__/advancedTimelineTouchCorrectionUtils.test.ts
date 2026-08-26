import {
  findTouchEditingTarget,
  getEditableTouchActionIds,
} from '../advancedTimelineTouchCorrectionUtils';
import type {
  AdvancedCorrectionContext,
  AdvancedStandaloneCorrectionContext,
  AdvancedTouchCorrectionSegment,
} from '../advancedTouchCorrectionUtils';

const point = { id: 'point-1' } as AdvancedTouchCorrectionSegment['point'];
const possession = { id: 'possession-1' } as AdvancedTouchCorrectionSegment['possession'];

function touchSegment(): AdvancedTouchCorrectionSegment {
  return {
    kind: 'touch-segment',
    point,
    possession,
    sideId: 'home',
    touches: [
      {
        touchId: 'pickup:pickup-1',
        kind: 'pickup',
        sideId: 'home',
        currentRef: { refType: 'unknown' },
        currentParticipantId: null,
        incomingActionId: 'pickup-1',
        outgoingActionId: 'pass-1',
        mutatedActionIds: ['pickup-1', 'pass-1'],
        eligibleParticipants: [],
      },
      {
        touchId: 'pass-receiver:pass-1',
        kind: 'pass-receiver',
        sideId: 'home',
        currentRef: { refType: 'unknown' },
        currentParticipantId: null,
        incomingActionId: 'pass-1',
        mutatedActionIds: ['pass-1'],
        eligibleParticipants: [],
      },
    ],
  };
}

function standalone(): AdvancedStandaloneCorrectionContext {
  return {
    kind: 'pull-receiver',
    point,
    possession,
    action: { id: 'pull-1' } as AdvancedStandaloneCorrectionContext['action'],
    sideId: 'home',
    currentRef: undefined,
    currentParticipantId: null,
    eligibleParticipants: [],
  };
}

describe('advanced timeline touch correction utilities', () => {
  it('collects standalone and mutated touch action IDs', () => {
    const contexts: AdvancedCorrectionContext[] = [
      standalone(),
      { kind: 'touch', segment: touchSegment(), touch: touchSegment().touches[0] },
    ];

    expect(getEditableTouchActionIds(contexts)).toEqual(new Set(['pull-1', 'pickup-1', 'pass-1']));
  });

  it('finds a matching standalone target', () => {
    const context = standalone();
    expect(
      findTouchEditingTarget([context], {
        pointId: 'point-1',
        possessionId: 'possession-1',
        actionId: 'pull-1',
        preselectTouch: false,
      }),
    ).toEqual({ context });
  });

  it('finds a touch target and preselects its incoming action', () => {
    const segment = touchSegment();
    const context: AdvancedCorrectionContext = {
      kind: 'touch',
      segment,
      touch: segment.touches[0],
    };

    expect(
      findTouchEditingTarget([context], {
        pointId: 'point-1',
        possessionId: 'possession-1',
        actionId: 'pass-1',
        preselectTouch: true,
      }),
    ).toEqual({ context: segment, initialTouchId: 'pass-receiver:pass-1' });
  });

  it('does not preselect a touch when preselection is not requested', () => {
    const segment = touchSegment();
    const context: AdvancedCorrectionContext = {
      kind: 'touch',
      segment,
      touch: segment.touches[0],
    };

    expect(
      findTouchEditingTarget([context], {
        pointId: 'point-1',
        possessionId: 'possession-1',
        actionId: 'pass-1',
        preselectTouch: false,
      }),
    ).toEqual({ context: segment, initialTouchId: undefined });
  });

  it('returns null for an unresolved target', () => {
    expect(
      findTouchEditingTarget([], {
        pointId: 'point-1',
        possessionId: 'possession-1',
        actionId: 'missing',
        preselectTouch: true,
      }),
    ).toBeNull();
  });
});

import {
  buildRecordPullInput,
  getPullingSideTitle,
} from '@/lib/advancedTracking/pullTrackingUtils';
import type { AdvancedTrackedGame, PointLine } from '@/lib/advancedTracking/types';

const LIGHT = 'light';
const DARK = 'dark';

const game: AdvancedTrackedGame = {
  id: 'scrimmage-game',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'scrimmage',
  status: 'in_progress',
  focusSideId: LIGHT,
  initialReceivingSideId: LIGHT,
  settings: { locationMode: 'none' },
  sides: [
    { id: LIGHT, label: 'Light', trackingMode: 'full-roster' },
    { id: DARK, label: 'Dark', trackingMode: 'full-roster' },
  ],
  participants: [
    { id: 'light-puller', name: 'Light Puller' },
    { id: 'dark-player', name: 'Dark Player' },
  ],
  points: [],
};

describe('buildRecordPullInput', () => {
  it('preserves both scrimmage lines and tracks a non-focus puller', () => {
    const lines: PointLine[] = [
      { sideId: LIGHT, participantIds: ['light-puller'] },
      { sideId: DARK, participantIds: ['dark-player'] },
    ];

    const input = buildRecordPullInput({
      game,
      isOurPull: false,
      isPullerTracked: true,
      lineParticipantIds: [],
      lines,
      selectedPullerId: 'dark-player',
      hangTimeMs: 1200,
      result: 'inbound',
    });

    expect(input.lines).toEqual(lines);
    expect(input.puller).toEqual({ refType: 'participant', participantId: 'dark-player' });
    expect(input.hangTimeMs).toBe(1200);
  });
});

describe('getPullingSideTitle', () => {
  it('uses the scrimmage side label when provided', () => {
    expect(getPullingSideTitle(false, 'Dark')).toBe('DARK IS PULLING');
  });

  it('keeps standard pull titles unchanged', () => {
    expect(getPullingSideTitle(true)).toBe('WE ARE PULLING');
    expect(getPullingSideTitle(false)).toBe('THEY ARE PULLING');
  });
});

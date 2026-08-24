import {
  withAdvancedGameNote,
  withAdvancedPointNote,
  withoutAdvancedPrivateNotes,
} from '@/lib/advancedTracking/gameNoteUtils';
import type { AdvancedTrackedGame, TrackedPoint } from '@/lib/advancedTracking/types';

const point: TrackedPoint = { id: 'point-1', lines: [], possessions: [] };

describe('withAdvancedGameNote', () => {
  it('keeps absent metadata absent when no note is provided', () => {
    expect(withAdvancedGameNote(undefined, undefined)).toBeUndefined();
  });

  it('omits the note key when a note is blank', () => {
    const metadata = withAdvancedGameNote(
      { title: 'Showcase Game', notes: 'Previous note' },
      '   ',
    );

    expect(metadata).toEqual({ title: 'Showcase Game' });
    expect(metadata).not.toHaveProperty('notes');
  });
});

describe('point notes', () => {
  it('normalizes and removes point notes without changing the stable point id', () => {
    expect(withAdvancedPointNote(point, '  Watch reset timing  ')).toEqual({
      ...point,
      note: 'Watch reset timing',
    });
    expect(withAdvancedPointNote({ ...point, note: 'old' }, '   ')).toEqual(point);
  });

  it('strips game and point notes from shared snapshots', () => {
    const game = {
      id: 'game-1',
      schemaVersion: 3,
      createdAt: 1,
      updatedAt: 1,
      gameType: 'game',
      status: 'final',
      focusSideId: 'home',
      initialReceivingSideId: 'home',
      metadata: { title: 'Game', notes: 'private game' },
      settings: { locationMode: 'none' },
      sides: [
        { id: 'home', label: 'Home', trackingMode: 'full-roster' },
        { id: 'away', label: 'Away', trackingMode: 'anonymous' },
      ],
      participants: [],
      points: [{ ...point, note: 'private point' }],
    } satisfies AdvancedTrackedGame;

    const shared = withoutAdvancedPrivateNotes(game);
    expect(shared.metadata).toEqual({ title: 'Game' });
    expect(shared.points[0]).toEqual(point);
  });

  it('returns a note-free game unchanged', () => {
    const game = {
      id: 'game-1',
      schemaVersion: 3,
      createdAt: 1,
      updatedAt: 1,
      gameType: 'game',
      status: 'final',
      focusSideId: 'home',
      initialReceivingSideId: 'home',
      metadata: { title: 'Game' },
      settings: { locationMode: 'none' },
      sides: [
        { id: 'home', label: 'Home', trackingMode: 'full-roster' },
        { id: 'away', label: 'Away', trackingMode: 'anonymous' },
      ],
      participants: [],
      points: [point],
    } satisfies AdvancedTrackedGame;

    expect(withoutAdvancedPrivateNotes(game)).toBe(game);
  });
});

import { withAdvancedGameNote } from '@/lib/advancedTracking/gameNoteUtils';

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

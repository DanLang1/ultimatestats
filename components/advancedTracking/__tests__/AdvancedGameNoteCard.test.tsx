import { screen, userEvent } from '@testing-library/react-native';

import { AdvancedGameNoteCard } from '@/components/advancedTracking/AdvancedGameNoteCard';
import { renderScreen } from '@/test/render';

describe('AdvancedGameNoteCard', () => {
  it('keeps a long note compact and opens the full editor action', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    const longNote = Array.from({ length: 20 }, (_, index) => `Observation ${index + 1}`).join(
      '\n',
    );
    await renderScreen(<AdvancedGameNoteCard note={longNote} onPress={onPress} />);

    expect(screen.getByText(longNote)).toHaveProp('numberOfLines', 6);
    expect(screen.getByText('View & edit')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Edit game note' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

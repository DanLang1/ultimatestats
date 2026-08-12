import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { AdvancedGameNoteModal } from '@/components/advancedTracking/AdvancedGameNoteModal';
import { renderScreen } from '@/test/render';

describe('AdvancedGameNoteModal', () => {
  it('saves the entered note and closes', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue(undefined);
    await renderScreen(<AdvancedGameNoteModal onClose={onClose} onSave={onSave} />);

    await user.type(screen.getByTestId('advanced-game-note-input'), 'Windy second half');
    await user.press(screen.getByTestId('advanced-game-note-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Windy second half');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error after a failed save and permits a retry', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSave = jest
      .fn()
      .mockRejectedValueOnce(new Error('Persistence failed'))
      .mockResolvedValueOnce(undefined);
    await renderScreen(<AdvancedGameNoteModal onClose={onClose} onSave={onSave} />);

    await user.type(screen.getByTestId('advanced-game-note-input'), 'Review the zone offense');
    await user.press(screen.getByTestId('advanced-game-note-save'));

    expect(await screen.findByText('Could not save the note. Try again.')).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    await user.press(screen.getByTestId('advanced-game-note-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

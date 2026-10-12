import { captureException } from '@sentry/react-native';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { AdvancedGameNoteModal } from '@/components/advancedTracking/AdvancedGameNoteModal';
import { renderScreen } from '@/test/render';

describe('AdvancedGameNoteModal', () => {
  it('shows and reports an error after a failed save and permits a retry', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const onClose = jest.fn();
    const saveError = new Error('Persistence failed');
    const onSave = jest.fn().mockRejectedValueOnce(saveError).mockResolvedValueOnce(undefined);
    await renderScreen(<AdvancedGameNoteModal onClose={onClose} onSave={onSave} />);

    await user.type(screen.getByTestId('advanced-game-note-input'), 'Review the zone offense');
    await user.press(screen.getByTestId('advanced-game-note-save'));

    expect(await screen.findByText('Could not save the note. Try again.')).toBeVisible();
    expect(captureException).toHaveBeenCalledWith(saveError, {
      tags: { area: 'advanced-game-note-save' },
      extra: undefined,
    });
    expect(onClose).not.toHaveBeenCalled();

    await user.press(screen.getByTestId('advanced-game-note-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

import { screen, userEvent } from '@testing-library/react-native';

import {
  OffenseActions,
  OffenseActionsProps,
} from '@/components/advancedTracking/bottomCard/OffenseActions';
import { renderScreen } from '@/test/render';

const ACTION_TEST_IDS = ['offense-throwaway', 'offense-drop', 'offense-goal'] as const;

async function renderOffenseActions(overrides: Partial<OffenseActionsProps> = {}) {
  const props: OffenseActionsProps = {
    hasHolder: true,
    canDropOpeningPull: false,
    onThrowaway: jest.fn(),
    onArmTapAction: jest.fn(),
    ...overrides,
  };
  await renderScreen(<OffenseActions {...props} />);
  return props;
}

describe('OffenseActions', () => {
  it('enables every action while a player holds the disc', async () => {
    await renderOffenseActions();

    for (const testID of ACTION_TEST_IDS) expect(screen.getByTestId(testID)).toBeEnabled();
  });

  it('only offers Drop while the opening pull can still be dropped', async () => {
    await renderOffenseActions({ hasHolder: false, canDropOpeningPull: true });

    expect(screen.getByTestId('offense-throwaway')).toBeDisabled();
    expect(screen.getByTestId('offense-drop')).toBeEnabled();
    expect(screen.getByTestId('offense-goal')).toBeDisabled();
  });

  it('records a throwaway directly and arms the tap-then-player actions', async () => {
    const user = userEvent.setup();
    const { onThrowaway, onArmTapAction } = await renderOffenseActions();

    await user.press(screen.getByTestId('offense-throwaway'));
    await user.press(screen.getByTestId('offense-drop'));
    await user.press(screen.getByTestId('offense-goal'));

    expect(onThrowaway).toHaveBeenCalledTimes(1);
    expect(onArmTapAction).toHaveBeenNthCalledWith(1, 'drop');
    expect(onArmTapAction).toHaveBeenNthCalledWith(2, 'goal');
  });
});

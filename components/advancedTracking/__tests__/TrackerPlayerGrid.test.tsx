import { screen, userEvent } from '@testing-library/react-native';

import {
  TrackerPlayerGrid,
  TrackerPlayerGridHandlers,
} from '@/components/advancedTracking/TrackerPlayerGrid';
import type { PassModifier, Participant, PlayerRef } from '@/lib/advancedTracking/types';
import { renderScreen } from '@/test/render';

const participants: Participant[] = [{ id: 'defender', name: 'Defender' }];

const handlers: TrackerPlayerGridHandlers = {
  onPlayerTap: jest.fn(),
  onDrop: jest.fn(),
  onPullDrop: jest.fn(),
  onGoal: jest.fn(),
  onThrowaway: jest.fn(),
};

interface RenderGridOptions {
  passModifier?: PassModifier;
  activeParticipants?: Participant[];
  canChangeLine?: boolean;
  discHolderRef?: PlayerRef;
  oppHasDisc?: boolean;
  canDropOpeningPull?: boolean;
  onLineChangePress?: () => void;
}

async function renderGrid({
  passModifier = null,
  activeParticipants = participants,
  canChangeLine = false,
  discHolderRef = { refType: 'participant', participantId: 'thrower' },
  oppHasDisc = false,
  canDropOpeningPull = false,
  onLineChangePress = jest.fn(),
}: RenderGridOptions = {}) {
  await renderScreen(
    <TrackerPlayerGrid
      activeParticipants={activeParticipants}
      discHolderRef={discHolderRef}
      oppHasDisc={oppHasDisc}
      canDropOpeningPull={canDropOpeningPull}
      passModifier={passModifier}
      handlers={handlers}
      onLineChangePress={onLineChangePress}
      canChangeLine={canChangeLine}
      availableHeight={null}
    />,
  );

  return { onLineChangePress };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TrackerPlayerGrid', () => {
  describe('Unknown chip visibility', () => {
    it.each<Exclude<PassModifier, null>>(['block', 'callahan', 'fifty-fifty', 'pressure', 'stall'])(
      'hides Unknown while selecting a player for %s',
      async (passModifier) => {
        await renderGrid({ passModifier });

        expect(screen.getByTestId('tracker-chip-Defender')).toBeVisible();
        expect(screen.queryByTestId('tracker-chip-Unknown')).not.toBeOnTheScreen();
      },
    );

    it('keeps Unknown available for normal pass tracking', async () => {
      await renderGrid({ passModifier: null });

      expect(screen.getByTestId('tracker-chip-Unknown')).toBeVisible();
    });
  });

  describe('Line action tile', () => {
    it('invokes onLineChangePress when the tile is pressed', async () => {
      const onLineChangePress = jest.fn();
      const user = userEvent.setup();
      await renderGrid({ canChangeLine: true, onLineChangePress });

      await user.press(screen.getByTestId('tracker-line-action-tile'));

      expect(onLineChangePress).toHaveBeenCalledTimes(1);
    });
  });
});

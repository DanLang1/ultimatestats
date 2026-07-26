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
    it('shows the line-action tile when canChangeLine is true', async () => {
      await renderGrid({ canChangeLine: true });

      expect(screen.getByTestId('tracker-line-action-tile')).toBeVisible();
    });

    it('hides the line-action tile when canChangeLine is false', async () => {
      await renderGrid({ canChangeLine: false });

      expect(screen.queryByTestId('tracker-line-action-tile')).not.toBeOnTheScreen();
    });

    it('invokes onLineChangePress when the tile is pressed', async () => {
      const onLineChangePress = jest.fn();
      const user = userEvent.setup();
      await renderGrid({ canChangeLine: true, onLineChangePress });

      await user.press(screen.getByTestId('tracker-line-action-tile'));

      expect(onLineChangePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('grid layout / padding', () => {
    it('renders all participants when count is less than column count', async () => {
      await renderGrid({
        activeParticipants: [{ id: 'p1', name: 'Alpha' }],
      });

      expect(screen.getByTestId('tracker-chip-Alpha')).toBeVisible();
      // plus Unknown tile -> total visible chips = 2
      expect(screen.getByTestId('tracker-chip-Unknown')).toBeVisible();
      expect(screen.queryByTestId('tracker-line-action-tile')).not.toBeOnTheScreen();
    });

    it('renders participants plus line-action tile without Unknown when modifier is active', async () => {
      await renderGrid({
        activeParticipants: [
          { id: 'p1', name: 'Alpha' },
          { id: 'p2', name: 'Bravo' },
        ],
        passModifier: 'stall',
        canChangeLine: true,
      });

      expect(screen.getByTestId('tracker-chip-Alpha')).toBeVisible();
      expect(screen.getByTestId('tracker-chip-Bravo')).toBeVisible();
      expect(screen.getByTestId('tracker-line-action-tile')).toBeVisible();
      expect(screen.queryByTestId('tracker-chip-Unknown')).not.toBeOnTheScreen();
    });

    it('renders participants exceeding column count without throwing', async () => {
      const many: Participant[] = Array.from({ length: 7 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
      }));

      await renderGrid({ activeParticipants: many });

      // all participants render
      expect(screen.getByTestId('tracker-chip-Player 0')).toBeVisible();
      expect(screen.getByTestId(`tracker-chip-Player 6`)).toBeVisible();
      expect(screen.getByTestId('tracker-chip-Unknown')).toBeVisible();
    });
  });
});

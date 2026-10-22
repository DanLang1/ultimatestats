import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import HubTabBar from '@/components/navigation/HubTabBar';
import { arrangeAdvancedGame, arrangeBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockPathname } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

let mockSegments: string[] = [];
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test/mocks/expoRouter'),
  useSegments: () => mockSegments,
}));

let mockNavigate: jest.Mock;
let mockEmit: jest.Mock;

function tabProps(index = 0, prevented = false): BottomTabBarProps {
  mockNavigate = jest.fn();
  mockEmit = jest.fn(() => ({ defaultPrevented: prevented }));
  const names = ['(home)', '(game)', '(analytics)', '(team)'];
  return {
    state: { index, routes: names.map((name) => ({ key: name, name })) },
    descriptors: Object.fromEntries(
      names.map((name) => [
        name,
        {
          options: {
            tabBarAccessibilityLabel: {
              '(home)': 'Home',
              '(game)': 'Game',
              '(analytics)': 'Stats',
              '(team)': 'Team',
            }[name],
          },
        },
      ]),
    ),
    navigation: { emit: mockEmit, navigate: mockNavigate },
  } as unknown as BottomTabBarProps;
}

beforeEach(() => {
  resetAllStores();
  resetMockRouter();
  mockSegments = [];
  setMockPathname('/dashboard');
});

it('routes a focused tab to its root and dispatches other tabs through the navigator', async () => {
  const props = tabProps();
  const user = userEvent.setup();
  await renderScreen(<HubTabBar {...props} />);
  await user.press(screen.getByRole('button', { name: 'Home', selected: true }));
  expect(router.navigate).toHaveBeenCalledWith('/dashboard');
  await user.press(screen.getByRole('button', { name: 'Stats' }));
  expect(mockNavigate).toHaveBeenCalledWith('(analytics)');
  expect(mockEmit).toHaveBeenCalledWith({
    type: 'tabPress',
    target: '(analytics)',
    canPreventDefault: true,
  });
});

it('honors a prevented tab press', async () => {
  const props = tabProps(0, true);
  await renderScreen(<HubTabBar {...props} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Stats' }));
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(router.navigate).not.toHaveBeenCalled();
});

it('resumes the active basic game when pressing Game', async () => {
  arrangeBasicGame();
  await renderScreen(<HubTabBar {...tabProps()} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Game' }));
  expect(router.navigate).toHaveBeenCalledWith('/scoreboard');
});

it('returns to the mounted advanced tracker instead of stacking another', async () => {
  arrangeAdvancedGame();
  await renderScreen(<HubTabBar {...tabProps()} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Game' }));
  expect(router.dismissTo).toHaveBeenCalledWith('/advanced-tracking/tracker-line-select');
  expect(router.navigate).not.toHaveBeenCalled();
});

it('offers a new game when no session is active', async () => {
  await renderScreen(<HubTabBar {...tabProps()} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Game' }));
  expect(screen.getByText('New Game')).toBeVisible();
  expect(screen.getByText('Basic Scoreboard')).toBeVisible();
  expect(router.navigate).not.toHaveBeenCalled();
});

it.each(['/saved-games/game-1', '/advanced-tracking/analytics/game-1'])(
  'marks Stats active on nested analytics %s',
  async (pathname) => {
    setMockPathname(pathname);
    await renderScreen(<HubTabBar {...tabProps(2)} />);
    expect(screen.getByRole('button', { name: 'Stats', selected: true })).toBeVisible();
  },
);

it.each(['scoreboard', 'modal'])('hides hub controls on %s', async (surface) => {
  if (surface === 'scoreboard') setMockPathname('/scoreboard');
  else mockSegments = ['(modals)', 'edit-event-modal'];
  await renderScreen(<HubTabBar {...tabProps()} />);
  expect(screen.queryByRole('button', { name: 'Home' })).not.toBeOnTheScreen();
});

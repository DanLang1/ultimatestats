import { router } from 'expo-router';

import ShareLinkRedirectScreen from '@/app/s/[kind]/[shareId]';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('public share-link route', () => {
  beforeEach(() => {
    resetMockRouter();
  });

  it('normalizes a valid public share route into the Import screen', async () => {
    setMockSearchParams({ kind: 'advanced-game', shareId: 'share-123' });

    await renderScreen(<ShareLinkRedirectScreen />);

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: '/Import', params: { shareId: 'share-123' } },
      { relativeToDirectory: undefined, withAnchor: undefined },
    );
  });

  it('rejects an unsupported public share route', async () => {
    setMockSearchParams({ kind: 'unknown', shareId: 'share-123' });

    await renderScreen(<ShareLinkRedirectScreen />);

    expect(router.replace).toHaveBeenCalledWith('/', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
  });
});

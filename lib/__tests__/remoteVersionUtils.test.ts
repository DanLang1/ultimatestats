import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  checkRemoteVersion,
  LAST_DISMISSED_REMOTE_VERSION_KEY,
  setLastDismissedRemoteVersion,
} from '../remoteVersionUtils';

jest.mock('expo-constants', () => ({ expoConfig: { version: '2.0.0' } }));

describe('remote update notifications', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function serveVersion(latestVersion: string) {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(
        async () => new Response(JSON.stringify({ latestVersion }), { status: 200 }),
      );
  }

  it('offers a newer version, remembers dismissal, and offers a subsequent release', async () => {
    serveVersion('2.1.0');
    await expect(checkRemoteVersion()).resolves.toEqual({
      hasUpdate: true,
      latestVersion: '2.1.0',
    });

    await setLastDismissedRemoteVersion('2.1.0');
    await expect(checkRemoteVersion()).resolves.toEqual({
      hasUpdate: false,
      latestVersion: '2.1.0',
    });

    serveVersion('2.2.0');
    await expect(checkRemoteVersion()).resolves.toEqual({
      hasUpdate: true,
      latestVersion: '2.2.0',
    });
  });

  it('does not offer the installed version on a fresh install', async () => {
    serveVersion('2.0.0');
    await expect(checkRemoteVersion()).resolves.toEqual({
      hasUpdate: false,
      latestVersion: '2.0.0',
    });
  });

  it.each(['1.9.9', '1.9', '1.10.0'])(
    'does not offer an older published version (%s) to a newer build',
    async (published) => {
      serveVersion(published);
      await expect(checkRemoteVersion()).resolves.toEqual({
        hasUpdate: false,
        latestVersion: published,
      });
    },
  );

  it('compares version segments numerically', async () => {
    serveVersion('2.0.10');
    await expect(checkRemoteVersion()).resolves.toEqual({
      hasUpdate: true,
      latestVersion: '2.0.10',
    });
  });

  it.each(['http', 'network', 'json'] as const)(
    'suppresses notifications after a %s failure',
    async (failure) => {
      const fetchMock = jest.spyOn(global, 'fetch');
      if (failure === 'network') {
        fetchMock.mockRejectedValue(new Error('offline'));
      } else {
        fetchMock.mockResolvedValue(
          new Response('Invalid JSON', { status: failure === 'http' ? 503 : 200 }),
        );
      }
      await expect(checkRemoteVersion()).resolves.toEqual({
        hasUpdate: false,
        latestVersion: null,
      });
    },
  );

  it('reports a failed dismissal write instead of claiming it was saved', async () => {
    const error = new Error('Storage full');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(error);
    await expect(setLastDismissedRemoteVersion('2.1.0')).rejects.toBe(error);
    await expect(AsyncStorage.getItem(LAST_DISMISSED_REMOTE_VERSION_KEY)).resolves.toBeNull();
  });
});

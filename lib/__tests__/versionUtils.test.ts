import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { acknowledgeVersion, checkForNewVersion, LAST_SEEN_VERSION_KEY } from '../versionUtils';

jest.mock('expo-constants', () => ({ expoConfig: { version: '2.0.0' } }));

describe('release acknowledgement', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    Constants.expoConfig!.version = '2.0.0';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows release notes until acknowledged, then shows them again after an upgrade', async () => {
    await expect(checkForNewVersion()).resolves.toEqual({
      hasUpdate: true,
      currentVersion: '2.0.0',
      lastSeenVersion: null,
    });

    await acknowledgeVersion();
    await expect(checkForNewVersion()).resolves.toEqual({
      hasUpdate: false,
      currentVersion: '2.0.0',
      lastSeenVersion: '2.0.0',
    });

    Constants.expoConfig!.version = '2.1.0';
    await expect(checkForNewVersion()).resolves.toEqual({
      hasUpdate: true,
      currentVersion: '2.1.0',
      lastSeenVersion: '2.0.0',
    });
  });

  it('uses the default version consistently when the manifest omits it', async () => {
    delete Constants.expoConfig!.version;
    await acknowledgeVersion();
    await expect(checkForNewVersion()).resolves.toEqual({
      hasUpdate: false,
      currentVersion: '1.0.0',
      lastSeenVersion: '1.0.0',
    });
  });

  it('preserves the last acknowledged release if persistence fails', async () => {
    await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, '1.0.0');
    const error = new Error('Storage full');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(error);
    await expect(acknowledgeVersion()).rejects.toBe(error);
    await expect(checkForNewVersion()).resolves.toEqual({
      hasUpdate: true,
      currentVersion: '2.0.0',
      lastSeenVersion: '1.0.0',
    });
  });
});

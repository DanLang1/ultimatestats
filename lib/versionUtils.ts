import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const LAST_SEEN_VERSION_KEY = 'ultimatestats_last_seen_version';

export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

async function getLastSeenVersion(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
}

async function setLastSeenVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, version);
}

export async function acknowledgeVersion(): Promise<void> {
  await setLastSeenVersion(getCurrentVersion());
}

export async function checkForNewVersion(): Promise<{
  hasUpdate: boolean;
  currentVersion: string;
  lastSeenVersion: string | null;
}> {
  const currentVersion = getCurrentVersion();
  const lastSeenVersion = await getLastSeenVersion();

  // If no stored version, user hasn't acknowledged any version yet
  // This could be a fresh install or first time with version tracking
  const hasUpdate = lastSeenVersion === null || lastSeenVersion !== currentVersion;

  return {
    hasUpdate,
    currentVersion,
    lastSeenVersion,
  };
}

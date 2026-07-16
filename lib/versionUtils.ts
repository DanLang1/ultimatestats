import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const LAST_SEEN_VERSION_KEY = 'ultimatestats_last_seen_version';

/**
 * Get the current app version from expo-constants
 */
export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/**
 * Get the last version the user has seen/acknowledged
 */
async function getLastSeenVersion(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
}

/**
 * Save the current version as the last seen version
 */
async function setLastSeenVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, version);
}

/**
 * Mark the current version as acknowledged by the user
 */
export async function acknowledgeVersion(): Promise<void> {
  await setLastSeenVersion(getCurrentVersion());
}

/**
 * Check if there's a new version the user hasn't seen yet
 */
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

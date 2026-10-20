import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { LATEST_VERSION_JSON_URL } from './constants';

export const LAST_DISMISSED_REMOTE_VERSION_KEY = 'ultimatestats_last_dismissed_remote_version';

function getCurrentVersion(): string {
  return Constants.expoConfig!.version!;
}

/** Compares dotted numeric versions such as `2.10.0` and `2.9.1`. */
function isNewerVersion(candidate: string, current: string): boolean {
  const candidateParts = candidate.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  const length = Math.max(candidateParts.length, currentParts.length);

  for (let index = 0; index < length; index++) {
    const difference = (candidateParts[index] ?? 0) - (currentParts[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(LATEST_VERSION_JSON_URL, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.latestVersion;
  } catch {
    return null;
  }
}

async function getLastDismissedRemoteVersion(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_DISMISSED_REMOTE_VERSION_KEY);
}

export async function setLastDismissedRemoteVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(LAST_DISMISSED_REMOTE_VERSION_KEY, version);
}

export async function checkRemoteVersion(): Promise<{
  hasUpdate: boolean;
  latestVersion: string | null;
}> {
  const [latestVersion, lastDismissed] = await Promise.all([
    fetchLatestVersion(),
    getLastDismissedRemoteVersion(),
  ]);

  if (!latestVersion) return { hasUpdate: false, latestVersion: null };

  // A build ahead of the published version (e.g. during App Review) must not prompt an update.
  const hasUpdate =
    isNewerVersion(latestVersion, getCurrentVersion()) && lastDismissed !== latestVersion;
  return { hasUpdate, latestVersion };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LATEST_VERSION_JSON_URL } from './constants';

export const LAST_DISMISSED_REMOTE_VERSION_KEY = 'ultimatestats_last_dismissed_remote_version';

function getCurrentVersion(): string {
  return Constants.expoConfig!.version!;
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

  const hasUpdate = latestVersion !== getCurrentVersion() && lastDismissed !== latestVersion;
  return { hasUpdate, latestVersion };
}

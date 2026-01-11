import { acknowledgeVersion, checkForNewVersion, getCurrentVersion } from '@/lib/versionUtils';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

interface VersionCheckResult {
  hasNewVersion: boolean;
  currentVersion: string;
  acknowledge: () => Promise<void>;
}

/**
 * Hook to check if user has seen the current app version
 * Returns hasNewVersion=true if the current version differs from last acknowledged
 * Re-checks on screen focus so badge updates when returning from About page
 */
export function useVersionCheck(): VersionCheckResult {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const currentVersion = getCurrentVersion();

  // Re-check version on every screen focus
  useFocusEffect(
    useCallback(() => {
      checkForNewVersion().then((result) => {
        setHasNewVersion(result.hasUpdate);
      });
    }, []),
  );

  const acknowledge = async () => {
    await acknowledgeVersion();
    setHasNewVersion(false);
  };

  return {
    hasNewVersion,
    currentVersion,
    acknowledge,
  };
}

import { acknowledgeVersion, checkForNewVersion, getCurrentVersion } from '@/lib/versionUtils';
import { useFocusEffect } from 'expo-router';
import { useState } from 'react';

interface VersionCheckResult {
  hasNewVersion: boolean;
  currentVersion: string;
  acknowledge: () => Promise<void>;
}

export function useVersionCheck(): VersionCheckResult {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const currentVersion = getCurrentVersion();

  useFocusEffect(() => {
    checkForNewVersion().then((result) => {
      setHasNewVersion(result.hasUpdate);
    });
  });

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

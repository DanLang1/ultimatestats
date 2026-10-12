import { useFocusEffect } from 'expo-router';
import { useState } from 'react';

import { reportError } from '@/lib/sentry';
import { acknowledgeVersion, checkForNewVersion, getCurrentVersion } from '@/lib/versionUtils';

interface VersionCheckResult {
  hasNewVersion: boolean;
  currentVersion: string;
  acknowledge: () => Promise<void>;
}

export function useVersionCheck(): VersionCheckResult {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const currentVersion = getCurrentVersion();

  useFocusEffect(() => {
    checkForNewVersion()
      .then((result) => {
        setHasNewVersion(result.hasUpdate);
      })
      .catch((error: unknown) => {
        reportError('version-check', error);
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

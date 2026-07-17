import { useQuery, useQueryClient } from '@tanstack/react-query';

import { checkRemoteVersion, setLastDismissedRemoteVersion } from '@/lib/remoteVersionUtils';

export function useRemoteVersionCheck() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['remoteVersion'],
    queryFn: checkRemoteVersion,
    staleTime: Infinity,
  });

  const dismiss = async () => {
    if (data?.latestVersion) {
      await setLastDismissedRemoteVersion(data.latestVersion);
    }
    queryClient.setQueryData(['remoteVersion'], {
      hasUpdate: false,
      latestVersion: data?.latestVersion ?? null,
    });
  };

  return {
    hasUpdate: data?.hasUpdate ?? false,
    latestVersion: data?.latestVersion ?? null,
    dismiss,
  };
}

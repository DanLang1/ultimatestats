import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { Redirect } from 'expo-router';

export default function GameTabIndexRoute() {
  const activeSession = useActiveGameSession();

  return <Redirect href={activeSession.route} />;
}

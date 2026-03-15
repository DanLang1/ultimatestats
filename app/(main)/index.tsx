import { Redirect } from 'expo-router';
import { useGameStore } from '@/store/gameStore';

export default function IndexRoute() {
  const currentGameStatus = useGameStore((state) => state.currentGameStatus);
  const isPostGameFlowPending = useGameStore((state) => state.isPostGameFlowPending);

  if (currentGameStatus === 'finished') {
    return <Redirect href={isPostGameFlowPending ? '/GameComplete' : '/Dashboard'} />;
  }

  if (currentGameStatus !== 'inProgress') {
    return <Redirect href="/Dashboard" />;
  }

  return <Redirect href="/Scoreboard" />;
}

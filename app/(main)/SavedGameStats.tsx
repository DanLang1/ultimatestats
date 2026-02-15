import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SavedGameStatsRedirect() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();

  if (!gameId) {
    return <Redirect href={{ pathname: '/ViewStats', params: { tab: 'saved' } }} />;
  }

  return <Redirect href={{ pathname: '/saved-games/[gameId]', params: { gameId } }} />;
}

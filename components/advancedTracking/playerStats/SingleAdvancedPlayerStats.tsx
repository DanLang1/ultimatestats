import AdvancedPlayerStatsView from '@/components/advancedTracking/playerStats/AdvancedPlayerStatsView';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';

type SingleAdvancedPlayerStatsProps = {
  gameId: string;
  participantId: string | undefined;
};

export default function SingleAdvancedPlayerStats({
  gameId,
  participantId,
}: SingleAdvancedPlayerStatsProps) {
  const { data: rawGame, isLoading } = useAdvancedGame(gameId);
  const analyticsGame = rawGame ? buildAnalyticsGame(rawGame) : null;

  return (
    <AdvancedPlayerStatsView
      analyticsGame={analyticsGame}
      participantId={participantId}
      isLoading={isLoading}
    />
  );
}

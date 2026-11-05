import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getShareLimitBlock } from '@/lib/savedGamesListUtils';
import { serializeAdvancedGames, serializeGames, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { GameKind } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface CombinedStatsViewProps {
  kind: GameKind;
  gameIds: string[];
}

/** The Combined Stats screen for one team's games of one kind. */
export default function CombinedStatsView({ kind, gameIds }: CombinedStatsViewProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { state, exportCSV } = useCombinedStats(kind, gameIds);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );
  const isReady = state.status === 'ready';
  const actionIconColor = isReady ? palette.accent : palette.textMuted;

  const handleShareGames = () => {
    if (state.status !== 'ready') return;
    const { stats } = state;

    const shareBlock = getShareLimitBlock(stats.kind, stats.games.length);
    if (shareBlock != null) {
      showAlert({ title: "Can't share these games", message: shareBlock });
      return;
    }

    setPendingShareAction(() => async () => {
      const payload =
        stats.kind === 'advanced'
          ? serializeAdvancedGames(stats.games)
          : serializeGames(stats.games);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleConfirmShare = () => runPendingShareAction(pendingShareAction);

  const handleCancelShare = () => {
    setPendingShareAction(null);
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'share',
      label: 'Share',
      onPress: handleShareGames,
      disabled: !isReady,
      inlineIcon: (
        <MaterialCommunityIcons
          name="share-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="share-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
    },
    {
      key: 'csv',
      label: 'Export CSV',
      onPress: exportCSV,
      disabled: !isReady,
      inlineIcon: (
        <MaterialCommunityIcons
          name="file-delimited-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="file-delimited-outline"
          size={scaleBySizeClass(18, sizeClass)}
          color={actionIconColor}
        />
      ),
    },
  ];

  let mainContent: ReactNode;
  if (state.status === 'loading') {
    mainContent = (
      <View style={styles.statusState}>
        <ActivityIndicator color={palette.accent} />
        <ThemedText style={[styles.statusTitle, { color: palette.textInverse }]}>
          Loading combined stats
        </ThemedText>
        <ThemedText style={[styles.statusText, { color: palette.textMuted }]}>
          Fetching full advanced game records...
        </ThemedText>
      </View>
    );
  } else if (state.status === 'unavailable' || state.status === 'notFound') {
    const message =
      state.status === 'unavailable' ? state.message : 'The selected games could not be found.';
    mainContent = (
      <View style={styles.statusState}>
        <MaterialCommunityIcons
          name="alert"
          size={scaleBySizeClass(28, sizeClass)}
          color={palette.accent}
        />
        <ThemedText style={[styles.statusTitle, { color: palette.textInverse }]}>
          Combined stats unavailable
        </ThemedText>
        <ThemedText style={[styles.statusText, { color: palette.textMuted }]}>{message}</ThemedText>
        <Pressable
          style={[styles.statusButton, { backgroundColor: palette.accent }]}
          onPress={() => router.back()}>
          <ThemedText style={[styles.statusButtonText, { color: palette.textOnAccent }]}>
            Back to Games
          </ThemedText>
        </Pressable>
      </View>
    );
  } else if (state.stats.kind === 'advanced') {
    const { stats } = state;
    mainContent = (
      <AdvancedStatsContent
        game={stats.aggregatedGame}
        gameId="aggregate"
        myTeamName={stats.teamName}
        opponentName="Opponents"
        myScore={0}
        opponentScore={0}
        perspectiveSideId={stats.aggregatedGame.focusSideId}
        participantNames={stats.aggregatedGame.participantNames}
        routeScope="saved"
        aggregateInfo={{ games: stats.gameItems }}
        initialPullWinStats={stats.initialPullWinStats}
        flipStats={stats.flipStats ?? undefined}
      />
    );
  } else {
    const { stats } = state;
    mainContent = (
      <StatsContent
        team1Name={stats.teamName}
        team2Name=""
        events={stats.events}
        roster={stats.roster}
        routeScope="saved"
        aggregateInfo={{ teamName: stats.teamName, gameCount: stats.gameCount }}
        startingPossession={null}
        gameTo={15}
        games={stats.games}
        pointLines={stats.games.flatMap((game) => game.pointLines ?? [])}
      />
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <ScreenHeader
        title="COMBINED STATS"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>{mainContent}</ScrollView>

      <ShareConfirmModal
        visible={pendingShareAction !== null}
        onConfirm={handleConfirmShare}
        errorMessage={SHARE_DATA_UPLOAD_ERROR_MESSAGE}
        onCancel={handleCancelShare}
        onCloseReady={handleCancelShare}
      />
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: isLandscape ? 14 : 24,
      paddingTop: isLandscape ? 8 : 16,
    },
    statusState: {
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    statusTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
    statusText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
    },
    statusButton: {
      borderRadius: 8,
      marginTop: 4,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    statusButtonText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}

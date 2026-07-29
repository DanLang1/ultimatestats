import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import type { ShareImportState } from '@/hooks/useShareImport';
import { formatDate } from '@/lib/basic/statsUtils';
import { advancedGameToListItem } from '@/lib/gameListUtils';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import type { SharedPayload } from '@/lib/sharing';
import type { SavedTeam } from '@/lib/storage';

import { createImportContentMetrics, createImportContentStyles } from './importContentStyles';

type GamePayload = Extract<SharedPayload, { type: 'game' }>;
type AdvancedGamePayload = Extract<SharedPayload, { type: 'advanced-game' }>;
type GamePreviewState = Extract<
  ShareImportState,
  { status: 'preview-game' | 'preview-advanced-game' }
>;

interface ImportGamePreviewContentProps {
  state: GamePreviewState;
  savedTeams: SavedTeam[];
  onDismiss: () => void;
  onImportGame: (payload: GamePayload) => void;
  onImportAdvancedGame: (payload: AdvancedGamePayload) => void;
}

export function ImportGamePreviewContent({
  state,
  savedTeams,
  onDismiss,
  onImportGame,
  onImportAdvancedGame,
}: ImportGamePreviewContentProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createImportContentStyles(sizeClass);
  const metrics = createImportContentMetrics(sizeClass);

  let teamName: string;
  let opponentName: string;
  let score1: number;
  let score2: number;
  let timestamp: number;
  let pointsTracked: number;
  let onImport: () => void;

  if (state.status === 'preview-game') {
    const game = state.payload.data;
    teamName = resolveTeamName(game.team1.id, game.team1.name, savedTeams);
    opponentName = game.team2Name;
    score1 = game.team1Score;
    score2 = game.team2Score;
    timestamp = getGameDisplayTimestamp(game);
    pointsTracked = game.events.filter((event) => event.type === 'goal').length;
    onImport = () => onImportGame(state.payload);
  } else {
    const game = advancedGameToListItem(state.payload.data);
    teamName = game.myTeamName;
    opponentName = game.opponentName;
    score1 = game.myScore;
    score2 = game.opponentScore;
    timestamp = game.timestamp;
    pointsTracked = game.pointsTracked;
    onImport = () => onImportAdvancedGame(state.payload);
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="cloud-download-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>Import game?</ThemedText>
      {state.isUpdate && (
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          You already have this game. Importing will replace your saved copy.
        </ThemedText>
      )}
      <View style={styles.previewCard}>
        <ThemedText style={[styles.previewTeams, { color: palette.modalText }]}>
          {teamName} vs {opponentName}
        </ThemedText>
        <ScoreBadge score1={score1} score2={score2} size="large" />
        <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          {formatDate(timestamp)} &middot; {pointsTracked} point
          {pointsTracked !== 1 ? 's' : ''} tracked
        </ThemedText>
      </View>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onDismiss}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Import
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

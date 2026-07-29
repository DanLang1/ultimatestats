import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import type { ShareImportState } from '@/hooks/useShareImport';

import { createImportContentMetrics, createImportContentStyles } from './importContentStyles';

type DoneState = Extract<ShareImportState, { status: 'done' }>;

interface ImportDoneContentProps {
  state: DoneState;
  onViewGame: (gameId: string) => void;
  onViewAdvancedGame: (gameId: string) => void;
  onViewTeam: () => void;
  onViewGames: () => void;
}

function getDoneContent({
  state,
  onViewGame,
  onViewAdvancedGame,
  onViewTeam,
  onViewGames,
}: ImportDoneContentProps) {
  if (state.type === 'games' || state.type === 'advanced-games') {
    return {
      message: `${state.count} game${state.count !== 1 ? 's' : ''} imported!`,
      onAction: onViewGames,
      actionLabel: 'View Games',
    };
  }

  if (state.type === 'game') {
    return {
      message: 'Game imported!',
      onAction: () => onViewGame(state.gameId),
      actionLabel: 'View Game',
    };
  }

  if (state.type === 'advanced-game') {
    return {
      message: 'Game imported!',
      onAction: () => onViewAdvancedGame(state.gameId),
      actionLabel: 'View Game',
    };
  }

  return {
    message: 'Team imported!',
    onAction: onViewTeam,
    actionLabel: 'View Team',
  };
}

export function ImportDoneContent({
  state,
  onViewGame,
  onViewAdvancedGame,
  onViewTeam,
  onViewGames,
}: ImportDoneContentProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createImportContentStyles(sizeClass);
  const metrics = createImportContentMetrics(sizeClass);
  const { message, onAction, actionLabel } = getDoneContent({
    state,
    onViewGame,
    onViewAdvancedGame,
    onViewTeam,
    onViewGames,
  });

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={metrics.statusIconLarge}
        color={palette.success}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>{message}</ThemedText>
      <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onAction}>
        <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
          {actionLabel}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import type { ShareImportState } from '@/hooks/useShareImport';
import type { SharedPayload } from '@/lib/sharing';

import { createImportContentMetrics, createImportContentStyles } from './importContentStyles';

type TeamPayload = Extract<SharedPayload, { type: 'team' }>;
type TeamPreviewState = Extract<ShareImportState, { status: 'preview-team' | 'team-exists' }>;

interface ImportTeamPreviewContentProps {
  state: TeamPreviewState;
  onDismiss: () => void;
  onImportTeam: (payload: TeamPayload) => void;
}

export function ImportTeamPreviewContent({
  state,
  onDismiss,
  onImportTeam,
}: ImportTeamPreviewContentProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createImportContentStyles(sizeClass);
  const metrics = createImportContentMetrics(sizeClass);
  const incomingTeam = state.payload.data;

  if (state.status === 'team-exists') {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
        <MaterialCommunityIcons
          name="account-group-outline"
          size={metrics.statusIconMedium}
          color={palette.accent}
        />
        <ThemedText style={[styles.title, { color: palette.modalText }]}>
          You already have {state.existingTeam.name}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          Do you want to update your roster to match?
        </ThemedText>
        <View style={styles.previewCard}>
          <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
            Incoming: {incomingTeam.roster.length} player
            {incomingTeam.roster.length !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
            Your version: {state.existingTeam.roster.length} player
            {state.existingTeam.roster.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, { backgroundColor: palette.overlay10 }]}
            onPress={onDismiss}>
            <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
              Keep Mine
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={() => onImportTeam(state.payload)}>
            <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
              Update Roster
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  const playerCount = incomingTeam.roster.length;
  const presetCount = state.payload.presets?.length ?? 0;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="cloud-download-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>Import team?</ThemedText>
      <View style={styles.previewCard}>
        <ThemedText style={[styles.previewTeams, { color: palette.modalText }]}>
          {incomingTeam.name}
        </ThemedText>
        <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          {playerCount} player{playerCount !== 1 ? 's' : ''}
          {presetCount > 0 ? ` · ${presetCount} line preset${presetCount !== 1 ? 's' : ''}` : ''}
        </ThemedText>
      </View>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onDismiss}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: palette.accent }]}
          onPress={() => onImportTeam(state.payload)}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Import
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

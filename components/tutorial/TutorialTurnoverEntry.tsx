import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { AnimatedThemedView } from '@/components/ThemedView';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Player } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface TutorialTurnoverEntryProps {
  teamName: string;
  roster: Player[];
  currentLine: string[];
  onSelectPlayer: (playerId: string) => void;
}

export default function TutorialTurnoverEntry({
  teamName,
  roster,
  currentLine,
  onSelectPlayer,
}: TutorialTurnoverEntryProps) {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  const styles = createStyles(sizeClass);

  // Show only players on the current line, sorted alphabetically
  const linePlayers = roster
    .filter((p) => currentLine.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}>
      <View style={styles.spacer} />
      <AnimatedThemedView
        entering={SlideInDown.duration(400)}
        style={[
          styles.sheet,
          {
            shadowColor: palette.shadow,
            paddingBottom: Math.max(10, bottomInset),
            ...(isLandscape
              ? {
                  marginLeft: Math.max(12, leftInset),
                  marginRight: Math.max(12, rightInset),
                }
              : {}),
          },
        ]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={[styles.teamName, { color: palette.modalText }]}>
              {teamName}
            </ThemedText>
            <ThemedText style={[styles.question, { color: palette.modalText }]}>
              Who made the block?
            </ThemedText>
            <Animated.View
              entering={FadeIn}
              style={[
                styles.badge,
                { backgroundColor: palette.successOverlay15, borderColor: palette.success },
              ]}>
              <ThemedText style={[styles.badgeLabel, { color: palette.success }]}>EVENT</ThemedText>
              <ThemedText style={[styles.badgeValue, { color: palette.success }]}>
                My Team Block
              </ThemedText>
            </Animated.View>
          </View>

          {/* Player chips */}
          <View style={styles.chipsContainer}>
            {linePlayers.map((player) => (
              <PlayerChip
                key={player.id}
                name={player.name}
                matchingType={player.matchingType}
                onPress={() => onSelectPlayer(player.id)}
              />
            ))}
          </View>
        </View>
      </AnimatedThemedView>
    </View>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large') {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 400,
      justifyContent: 'flex-end',
    },
    spacer: {
      flex: 1,
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 10,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    header: {
      width: '100%',
      marginBottom: 8,
      gap: 8,
    },
    teamName: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    question: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.bold,
    },
    badge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    badgeLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginTop: 2,
    },
    badgeValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 10,
    },
  });
}

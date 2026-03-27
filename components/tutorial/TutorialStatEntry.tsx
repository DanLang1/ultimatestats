import { PlayerChip } from '@/components/ui/PlayerChip';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Player } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TutorialStatEntryProps {
  roster: Player[];
  currentLine: string[];
  step: 'goal' | 'assist';
  goalScorerId?: string | null;
  goalScorerName?: string;
  onSelectPlayer: (playerId: string) => void;
}

export default function TutorialStatEntry({
  roster,
  currentLine,
  step,
  goalScorerId,
  goalScorerName,
  onSelectPlayer,
}: TutorialStatEntryProps) {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  const styles = createStyles(sizeClass);

  const linePlayers = roster.filter((p) => currentLine.includes(p.id));
  const title = step === 'goal' ? 'Who Scored?' : 'Who Assisted?';

  return (
    <View style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}>
      <View style={styles.spacer} />
      <Animated.View
        key={step}
        entering={SlideInDown.duration(300)}
        style={[
          styles.sheet,
          {
            backgroundColor: palette.modalBg,
            shadowColor: palette.shadow,
            paddingBottom: Math.max(16, bottomInset),
            ...(isLandscape
              ? {
                  marginLeft: Math.max(12, leftInset),
                  marginRight: Math.max(12, rightInset),
                }
              : {}),
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: palette.modalText }]}>{title}</ThemedText>
        </View>

        {/* Previous selection badge */}
        {step === 'assist' && goalScorerName && (
          <View style={[styles.badge, { backgroundColor: palette.success + '20' }]}>
            <MaterialCommunityIcons
              name="check-circle"
              size={scaleBySizeClass(14, sizeClass)}
              color={palette.success}
            />
            <ThemedText style={[styles.badgeText, { color: palette.success }]}>
              GOAL: {goalScorerName}
            </ThemedText>
          </View>
        )}

        {/* Player chips */}
        <View style={styles.chipGrid}>
          {linePlayers.map((player) => (
            <PlayerChip
              key={player.id}
              name={player.name}
              matchingType={player.matchingType}
              sizeClass={sizeClass}
              useModalColors
              selected={step === 'assist' && player.id === goalScorerId}
              onPress={() => onSelectPlayer(player.id)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 400,
      justifyContent: 'flex-end',
    },
    spacer: {
      flex: 1,
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingHorizontal: 16,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    badgeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getSizeClassValue({ small: 8, medium: 10, large: 12 }, sizeClass),
      paddingBottom: 8,
    },
  });
}

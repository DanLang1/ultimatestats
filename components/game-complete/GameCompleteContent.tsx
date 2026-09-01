import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

type GameCompleteAction = {
  title: string;
  text: string;
  onPress: () => void | Promise<void>;
  testID?: string;
};

interface GameCompleteContentProps {
  headerTitle: string;
  heroIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  heroIconColor: string;
  eyebrow: string;
  heroTitle: string;
  heroSubhead?: string;
  leftTeamLabel: string;
  leftScore: number;
  rightTeamLabel: string;
  rightScore: number;
  primaryAction: GameCompleteAction;
  secondaryAction: GameCompleteAction;
  secondaryActionFirst?: boolean;
  primaryCopyFills?: boolean;
  children?: ReactNode;
}

export function GameCompleteContent({
  headerTitle,
  heroIcon,
  heroIconColor,
  eyebrow,
  heroTitle,
  heroSubhead,
  leftTeamLabel,
  leftScore,
  rightTeamLabel,
  rightScore,
  primaryAction,
  secondaryAction,
  secondaryActionFirst = false,
  primaryCopyFills = false,
  children,
}: GameCompleteContentProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const primaryButton = (
    <Pressable
      testID={primaryAction.testID}
      style={[styles.primaryAction, { backgroundColor: palette.success }]}
      onPress={primaryAction.onPress}>
      <View style={primaryCopyFills ? styles.actionCopy : undefined}>
        <ThemedText style={[styles.primaryActionTitle, { color: palette.textOnAccent }]}>
          {primaryAction.title}
        </ThemedText>
        <ThemedText style={[styles.primaryActionText, { color: palette.textOnAccent }]}>
          {primaryAction.text}
        </ThemedText>
      </View>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={scaleBySizeClass(22, sizeClass)}
        color={palette.textOnAccent}
      />
    </Pressable>
  );

  const secondaryButton = (
    <Pressable
      testID={secondaryAction.testID}
      style={[
        styles.secondaryAction,
        { backgroundColor: 'transparent', borderColor: palette.overlay15 },
      ]}
      onPress={secondaryAction.onPress}>
      <View style={styles.actionCopy}>
        <ThemedText style={[styles.secondaryActionTitle, { color: palette.textInverse }]}>
          {secondaryAction.title}
        </ThemedText>
        <ThemedText style={[styles.secondaryActionText, { color: palette.textMuted }]}>
          {secondaryAction.text}
        </ThemedText>
      </View>
      <MaterialCommunityIcons
        name="undo"
        size={scaleBySizeClass(22, sizeClass)}
        color={palette.textMuted}
      />
    </Pressable>
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: palette.primary }]}>
      <ScreenHeader title={headerTitle} titleColor={palette.textMuted} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <View
            style={[
              styles.trophyBadge,
              { backgroundColor: palette.overlay08, borderColor: palette.overlay15 },
            ]}>
            <MaterialCommunityIcons
              name={heroIcon}
              size={scaleBySizeClass(34, sizeClass)}
              color={heroIconColor}
            />
          </View>

          <ThemedText style={[styles.eyebrow, { color: palette.textMuted }]}>{eyebrow}</ThemedText>
          <ThemedText style={[styles.winnerName, { color: palette.textInverse }]} numberOfLines={2}>
            {heroTitle}
          </ThemedText>
          {heroSubhead ? (
            <ThemedText style={[styles.subhead, { color: palette.textMuted }]}>
              {heroSubhead}
            </ThemedText>
          ) : null}

          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <ThemedText
                style={[styles.teamLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                {leftTeamLabel}
              </ThemedText>
              <ThemedText style={[styles.scoreValue, { color: palette.textInverse }]}>
                {leftScore}
              </ThemedText>
            </View>

            <ThemedText style={[styles.scoreDivider, { color: palette.textMuted }]}>-</ThemedText>

            <View style={styles.scoreBlock}>
              <ThemedText
                style={[styles.teamLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                {rightTeamLabel}
              </ThemedText>
              <ThemedText style={[styles.scoreValue, { color: palette.textInverse }]}>
                {rightScore}
              </ThemedText>
            </View>
          </View>
        </View>

        {children}

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            WHAT NEXT
          </ThemedText>
          {secondaryActionFirst ? secondaryButton : primaryButton}
          {secondaryActionFirst ? primaryButton : secondaryButton}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingTop: scaleBySizeClass(20, sizeClass),
      paddingBottom: scaleBySizeClass(28, sizeClass),
      gap: scaleBySizeClass(22, sizeClass),
    },
    hero: {
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(22, sizeClass),
      paddingVertical: scaleBySizeClass(26, sizeClass),
      alignItems: 'center',
    },
    trophyBadge: {
      width: scaleBySizeClass(78, sizeClass),
      height: scaleBySizeClass(78, sizeClass),
      borderRadius: 999,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scaleBySizeClass(18, sizeClass),
    },
    eyebrow: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 2.5,
      marginBottom: 8,
      textAlign: 'center',
    },
    winnerName: {
      fontSize: scaleBySizeClass(isLandscape ? 34 : 30, sizeClass),
      fontFamily: Fonts.extraBold,
      textAlign: 'center',
    },
    subhead: {
      fontSize: scaleBySizeClass(16, sizeClass),
      marginTop: 6,
      textAlign: 'center',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(18, sizeClass),
      marginTop: scaleBySizeClass(24, sizeClass),
      width: '100%',
    },
    scoreBlock: {
      flex: 1,
      alignItems: 'center',
      maxWidth: isLandscape ? 260 : undefined,
    },
    teamLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
      marginBottom: 4,
    },
    scoreValue: {
      fontSize: scaleBySizeClass(isLandscape ? 58 : 52, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(isLandscape ? 62 : 56, sizeClass),
    },
    scoreDivider: {
      fontSize: scaleBySizeClass(30, sizeClass),
      paddingBottom: 6,
    },
    section: {
      gap: scaleBySizeClass(12, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 2.5,
    },
    primaryAction: {
      borderRadius: 20,
      minHeight: scaleBySizeClass(86, sizeClass),
      paddingHorizontal: scaleBySizeClass(18, sizeClass),
      paddingVertical: scaleBySizeClass(18, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    primaryActionTitle: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    primaryActionText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      marginTop: 2,
    },
    secondaryAction: {
      borderRadius: 18,
      borderWidth: 1,
      minHeight: scaleBySizeClass(84, sizeClass),
      paddingHorizontal: scaleBySizeClass(18, sizeClass),
      paddingVertical: scaleBySizeClass(16, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    actionCopy: {
      flex: 1,
    },
    secondaryActionTitle: {
      fontSize: scaleBySizeClass(19, sizeClass),
      fontFamily: Fonts.bold,
    },
    secondaryActionText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      marginTop: 3,
    },
  });
}

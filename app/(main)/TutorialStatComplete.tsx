import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

export default function TutorialStatCompleteRoute() {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const useRowLayout = isLandscape && sizeClass !== 'large';
  const styles = createStyles(sizeClass, useRowLayout);

  const handleStartGame = () => {
    useTutorialStore.getState().closeStatsTutorial();
    router.replace('/PreGameConfirm');
  };

  const iconSize = scaleBySizeClass(useRowLayout ? 24 : 28, sizeClass);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.heroSection}>
            <View style={[styles.heroIconContainer, { backgroundColor: palette.accentOverlay15 }]}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={getSizeClassValue({ small: 52, medium: 60, large: 68 }, sizeClass)}
                color={palette.accent}
              />
            </View>
            <ThemedText style={[styles.title, { color: palette.textInverse }]}>
              Stats Tutorial Complete!
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>
              {`You're all set. Configure your game settings and get started.`}
            </ThemedText>
          </Animated.View>
        </View>

        <View style={styles.rightColumnWrapper}>
          <View style={styles.rightColumn}>
            <View style={styles.optionsSection}>
              <Animated.View entering={FadeInRight.delay(400).springify()}>
                <Pressable
                  onPress={handleStartGame}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      borderColor: palette.overlay15,
                      backgroundColor: pressed ? palette.overlay08 : palette.overlay05,
                    },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}>
                  <View
                    style={[
                      styles.optionIconContainer,
                      { backgroundColor: palette.accentOverlay15 },
                    ]}>
                    <MaterialCommunityIcons
                      name="scoreboard-outline"
                      size={iconSize * 1.1}
                      color={palette.accent}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <ThemedText style={[styles.optionTitle, { color: palette.textInverse }]}>
                      Start a Game
                    </ThemedText>
                    <ThemedText style={[styles.optionDescription, { color: palette.textMuted }]}>
                      Configure your game settings and start tracking stats.
                    </ThemedText>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large', useRowLayout: boolean) {
  const isTablet = sizeClass !== 'small';
  const optionIconSize = getSizeClassValue(
    { small: useRowLayout ? 40 : 48, medium: useRowLayout ? 48 : 56, large: 64 },
    sizeClass,
  );

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 24,
      paddingBottom: 24,
      paddingHorizontal: scaleBySizeClass(24, sizeClass),
    },
    content: {
      flex: 1,
      flexDirection: useRowLayout ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: useRowLayout
        ? 0
        : getSizeClassValue({ small: 0, medium: 48, large: 64 }, sizeClass),
      gap: getSizeClassValue(
        { small: useRowLayout ? 32 : 40, medium: useRowLayout ? 40 : 56, large: 64 },
        sizeClass,
      ),
    },
    leftColumn: {
      flex: useRowLayout ? 1 : undefined,
      alignItems: useRowLayout ? 'flex-start' : 'center',
      justifyContent: 'center',
    },
    rightColumnWrapper: {
      flex: useRowLayout ? 2 : undefined,
      width: '100%',
      alignItems: useRowLayout ? undefined : 'center',
    },
    rightColumn: {
      justifyContent: useRowLayout ? 'center' : 'flex-start',
      flexGrow: useRowLayout ? 1 : undefined,
      width: '100%',
      maxWidth: useRowLayout
        ? undefined
        : getSizeClassValue({ small: 600, medium: 700, large: 800 }, sizeClass),
    },
    heroSection: {
      alignItems: useRowLayout ? 'flex-start' : 'center',
      gap: getSizeClassValue({ small: 12, medium: 16, large: 20 }, sizeClass),
      marginBottom: useRowLayout ? 0 : 24,
    },
    heroIconContainer: {
      width: getSizeClassValue({ small: 88, medium: 100, large: 112 }, sizeClass),
      height: getSizeClassValue({ small: 88, medium: 100, large: 112 }, sizeClass),
      borderRadius: getSizeClassValue({ small: 22, medium: 26, large: 30 }, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: getSizeClassValue({ small: 4, medium: 8, large: 12 }, sizeClass),
    },
    title: {
      fontSize: getSizeClassValue({ small: 28, medium: 32, large: 36 }, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: -0.5,
      textAlign: useRowLayout ? 'left' : 'center',
    },
    subtitle: {
      fontSize: getSizeClassValue({ small: 15, medium: 17, large: 19 }, sizeClass),
      textAlign: useRowLayout ? 'left' : 'center',
      lineHeight: getSizeClassValue({ small: 22, medium: 26, large: 30 }, sizeClass),
    },
    optionsSection: {
      gap: getSizeClassValue(
        { small: useRowLayout ? 12 : 32, medium: useRowLayout ? 16 : 40, large: 48 },
        sizeClass,
      ),
      paddingTop: 0,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: getSizeClassValue({ small: 16, medium: 18, large: 20 }, sizeClass),
      padding: getSizeClassValue(
        { small: useRowLayout ? 12 : 16, medium: useRowLayout ? 16 : 20, large: 24 },
        sizeClass,
      ),
      borderWidth: 1,
      gap: getSizeClassValue({ small: 16, medium: 20, large: 24 }, sizeClass),
      width: '100%',
    },
    optionIconContainer: {
      width: optionIconSize,
      height: optionIconSize,
      borderRadius: getSizeClassValue({ small: 14, medium: 16, large: 18 }, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionText: {
      flex: 1,
      gap: isTablet ? 6 : 4,
    },
    optionTitle: {
      fontSize: getSizeClassValue(
        { small: useRowLayout ? 16 : 18, medium: useRowLayout ? 18 : 20, large: 22 },
        sizeClass,
      ),
      fontFamily: Fonts.bold,
    },
    optionDescription: {
      fontSize: getSizeClassValue(
        { small: useRowLayout ? 14 : 15, medium: useRowLayout ? 16 : 17, large: 19 },
        sizeClass,
      ),
      lineHeight: getSizeClassValue(
        { small: useRowLayout ? 20 : 22, medium: useRowLayout ? 24 : 26, large: 30 },
        sizeClass,
      ),
    },
  });
}

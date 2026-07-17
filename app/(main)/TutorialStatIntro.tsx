import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

const FEATURES = [
  {
    icon: 'account-group' as const,
    title: 'Line Selection',
    description: 'Choose which players are on the field before each point starts',
  },
  {
    icon: 'target' as const,
    title: 'Goals & Assists',
    description: 'Tap your team score to record a goal, then select the scorer and assister',
  },
  {
    icon: 'hand-back-left-outline' as const,
    title: 'Blocks & Turnovers',
    description: 'Record defensive blocks and turnovers as they happen',
  },
] as const;

export default function TutorialStatIntroRoute() {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const useRowLayout = isLandscape && sizeClass !== 'large';
  const styles = createStyles(sizeClass, useRowLayout);
  const iconSize = scaleBySizeClass(28, sizeClass);

  const handleStart = () => {
    router.replace('/TutorialStatScoreboard');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.heroSection}>
            <ThemedText style={[styles.title, { color: palette.textInverse }]}>
              Stat Tracking
            </ThemedText>
            <ThemedText style={[styles.tagline, { color: palette.textMuted }]}>
              Learn to track stats during a live game.
            </ThemedText>
          </Animated.View>

          {useRowLayout && (
            <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.footer}>
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: pressed ? palette.accentOverlay30 : palette.accent },
                ]}>
                <ThemedText style={[styles.ctaText, { color: palette.textOnAccent }]}>
                  Start Tutorial
                </ThemedText>
              </Pressable>
            </Animated.View>
          )}
        </View>

        <View style={styles.rightColumnWrapper}>
          <View style={styles.rightColumn}>
            <View style={styles.featuresSection}>
              {FEATURES.map((feature, index) => (
                <Animated.View
                  entering={FadeInRight.delay(400 + index * 150).springify()}
                  key={feature.title}
                  style={styles.featureRow}>
                  <View
                    style={[
                      styles.featureIconContainer,
                      { backgroundColor: palette.accentOverlay15 },
                    ]}>
                    <MaterialCommunityIcons
                      name={feature.icon}
                      size={iconSize * 1.1}
                      color={palette.accent}
                    />
                  </View>
                  <View style={styles.featureText}>
                    <ThemedText style={[styles.featureTitle, { color: palette.textInverse }]}>
                      {feature.title}
                    </ThemedText>
                    <ThemedText style={[styles.featureDescription, { color: palette.textMuted }]}>
                      {feature.description}
                    </ThemedText>
                  </View>
                </Animated.View>
              ))}
            </View>

            {!useRowLayout && (
              <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.footer}>
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    { backgroundColor: pressed ? palette.accentOverlay30 : palette.accent },
                  ]}>
                  <ThemedText style={[styles.ctaText, { color: palette.textOnAccent }]}>
                    Start Tutorial
                  </ThemedText>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large', useRowLayout: boolean) {
  const isTablet = sizeClass !== 'small';
  const iconContainerSize = getSizeClassValue({ small: 48, medium: 56, large: 64 }, sizeClass);

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
        : getSizeClassValue({ small: 0, medium: 40, large: 50 }, sizeClass),
      gap: getSizeClassValue(
        {
          small: useRowLayout ? 32 : 40,
          medium: useRowLayout ? 40 : 56,
          large: 64,
        },
        sizeClass,
      ),
    },
    leftColumn: {
      flex: useRowLayout ? 1 : undefined,
      alignItems: useRowLayout ? 'flex-start' : 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(useRowLayout ? 32 : 0, sizeClass),
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
      gap: getSizeClassValue({ small: 4, medium: 8, large: 12 }, sizeClass),
      marginBottom: useRowLayout ? 0 : 24,
    },
    title: {
      fontSize: getSizeClassValue(
        {
          small: useRowLayout ? 32 : 44,
          medium: useRowLayout ? 38 : 52,
          large: 60,
        },
        sizeClass,
      ),
      fontFamily: Fonts.black,
      letterSpacing: -1,
    },
    tagline: {
      fontSize: getSizeClassValue({ small: 16, medium: 19, large: 22 }, sizeClass),
      fontFamily: Fonts.regular,
      textAlign: useRowLayout ? 'left' : 'center',
      lineHeight: getSizeClassValue({ small: 22, medium: 26, large: 30 }, sizeClass),
    },
    featuresSection: {
      gap: getSizeClassValue(
        {
          small: useRowLayout ? 16 : 32,
          medium: useRowLayout ? 24 : 40,
          large: 48,
        },
        sizeClass,
      ),
      paddingTop: 0,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: getSizeClassValue({ small: 20, medium: 24, large: 28 }, sizeClass),
    },
    featureIconContainer: {
      width: iconContainerSize,
      height: iconContainerSize,
      borderRadius: getSizeClassValue({ small: 14, medium: 16, large: 18 }, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaleBySizeClass(2, sizeClass),
    },
    featureText: {
      flex: 1,
      gap: isTablet ? 6 : 4,
    },
    featureTitle: {
      fontSize: getSizeClassValue({ small: 18, medium: 20, large: 22 }, sizeClass),
      fontFamily: Fonts.bold,
    },
    featureDescription: {
      fontSize: getSizeClassValue({ small: 15, medium: 17, large: 19 }, sizeClass),
      lineHeight: getSizeClassValue({ small: 22, medium: 26, large: 30 }, sizeClass),
    },
    footer: {
      width: '100%',
      alignItems: useRowLayout ? 'flex-start' : 'center',
      marginTop: useRowLayout
        ? 0
        : getSizeClassValue({ small: 40, medium: 48, large: 56 }, sizeClass),
    },
    ctaButton: {
      width: '100%',
      maxWidth: useRowLayout
        ? getSizeClassValue({ small: 300, medium: 340, large: 380 }, sizeClass)
        : getSizeClassValue({ small: 400, medium: 480, large: 540 }, sizeClass),
      paddingVertical: getSizeClassValue({ small: 16, medium: 18, large: 20 }, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      alignItems: 'center',
    },
    ctaText: {
      fontSize: getSizeClassValue({ small: 16, medium: 18, large: 20 }, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}

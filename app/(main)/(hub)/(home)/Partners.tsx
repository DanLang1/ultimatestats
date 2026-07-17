import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';

export default function PartnersScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const styles = createStyles(sizeClass, palette);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="PARTNERS"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic">
        {/* Card 1: Centered Layout */}
        <View style={styles.card}>
          <Animated.View
            entering={FadeInRight.duration(400)}
            style={{ width: '100%', alignItems: 'center' }}>
            <Image
              source={require('@/public/dh.jpg')}
              style={styles.logo}
              contentFit="contain"
              transition={400}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInRight.duration(400).delay(200)}
            style={{ width: '100%', alignItems: 'center' }}>
            <ThemedText style={styles.title}>DH Ultimate</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInRight.duration(400).delay(300)} style={{ width: '100%' }}>
            <View style={styles.badgeContainer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={scaleBySizeClass(14, sizeClass)}
                color={palette.dhYellow}
              />
              <ThemedText style={styles.badgeText}>USA Ultimate Approved Vendor</ThemedText>
            </View>
            <ThemedText style={styles.description}>
              Custom jerseys, proudly made in the Philippines.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.duration(400).delay(400)}
            style={styles.actionContainer}>
            <Pressable
              onPress={() => Linking.openURL('https://dhultimate.com')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <MaterialCommunityIcons
                name="web"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.dhButtonText}
              />
              <ThemedText style={styles.primaryButtonText}>Website</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://www.instagram.com/dhultimate/')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <MaterialCommunityIcons
                name="instagram"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.dhYellow}
              />
              <ThemedText style={styles.secondaryButtonText}>Instagram</ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass, palette: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.primary,
    },
    scrollContent: {
      padding: scaleBySizeClass(24, sizeClass),
      gap: scaleBySizeClass(24, sizeClass),
    },
    card: {
      backgroundColor: palette.dhBlack,
      borderRadius: scaleBySizeClass(16, sizeClass),
      padding: scaleBySizeClass(20, sizeClass),
      alignItems: 'center',
      gap: scaleBySizeClass(16, sizeClass),
      borderWidth: 1,
      borderColor: palette.dhYellow,
      boxShadow: `0 8px 32px ${palette.dhYellowOverlay20}`,
      alignSelf: 'center',
      width: '100%',
      maxWidth: scaleBySizeClass(400, sizeClass),
    },
    logo: {
      width: '100%',
      height: scaleBySizeClass(94, sizeClass),
      marginBottom: -scaleBySizeClass(28, sizeClass),
      opacity: 1,
    },
    title: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.black,
      color: palette.textOnAccent,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      justifyContent: 'center',
      marginBottom: scaleBySizeClass(6, sizeClass),
    },
    badgeText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      color: palette.dhYellow,
    },
    description: {
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.textOnAccentMuted,
      textAlign: 'center',
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
    actionContainer: {
      flexDirection: 'row',
      width: '100%',
      marginTop: scaleBySizeClass(4, sizeClass),
      gap: scaleBySizeClass(10, sizeClass),
    },
    primaryButton: {
      flex: 1,
      backgroundColor: palette.dhYellow,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      gap: scaleBySizeClass(6, sizeClass),
    },
    primaryButtonText: {
      color: palette.dhButtonText,
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.dhYellow,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      gap: scaleBySizeClass(6, sizeClass),
    },
    secondaryButtonText: {
      color: palette.dhYellow,
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    card2: {
      backgroundColor: palette.dhBlack,
      borderRadius: scaleBySizeClass(16, sizeClass),
      padding: scaleBySizeClass(20, sizeClass),
      alignItems: 'flex-start',
      gap: scaleBySizeClass(16, sizeClass),
      borderWidth: 1,
      borderColor: palette.dhYellow,
      boxShadow: `0 8px 32px ${palette.dhYellowOverlay20}`,
      alignSelf: 'center',
      width: '100%',
      maxWidth: scaleBySizeClass(400, sizeClass),
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: scaleBySizeClass(12, sizeClass),
      marginBottom: -scaleBySizeClass(28, sizeClass),
    },
    logoLeft: {
      width: scaleBySizeClass(94, sizeClass),
      height: scaleBySizeClass(94, sizeClass),
      opacity: 1,
    },
    badgeContainerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      flexShrink: 1,
    },
    badgeTextContainer: {
      flexDirection: 'column',
    },
    badgeTextRow1: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      color: palette.dhYellow,
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
      lineHeight: scaleBySizeClass(14, sizeClass),
    },
    badgeTextRow2: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      color: palette.dhYellow,
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
      lineHeight: scaleBySizeClass(14, sizeClass),
    },
    titleLeft: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontFamily: Fonts.black,
      color: palette.textOnAccent,
      textAlign: 'left',
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
    },
    dividerLeft: {
      width: scaleBySizeClass(32, sizeClass),
      height: scaleBySizeClass(1.5, sizeClass),
      backgroundColor: palette.dhYellow,
    },
    descriptionLeft: {
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.textOnAccentMuted,
      textAlign: 'left',
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
  });
}

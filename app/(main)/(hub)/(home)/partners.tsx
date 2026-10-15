import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { PARTNER_CONTACT_EMAIL } from '@/lib/constants';
import { Fonts, Palette } from '@/theme/theme';

const PARTNER_MAILTO_URL = `mailto:${PARTNER_CONTACT_EMAIL}?subject=${encodeURIComponent('U-Stat Partnership')}`;
const COPIED_FEEDBACK_DURATION_MS = 1000;

export default function PartnersScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const [didCopy, setDidCopy] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = createStyles(sizeClass, palette);

  const handleContactPress = async () => {
    try {
      await Linking.openURL(PARTNER_MAILTO_URL);
    } catch {
      // No mail app configured — fall back to copying the address.
      await Clipboard.setStringAsync(PARTNER_CONTACT_EMAIL);
      setDidCopy(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setDidCopy(false), COPIED_FEEDBACK_DURATION_MS);
    }
  };

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

        <Animated.View
          entering={FadeInRight.duration(400).delay(500)}
          style={styles.contactContainer}>
          <ThemedText style={styles.contactPrompt}>Want to show up here?</ThemedText>
          <Pressable
            onPress={handleContactPress}
            accessibilityRole="link"
            accessibilityLabel={`Email ${PARTNER_CONTACT_EMAIL}`}
            style={({ pressed }) => [styles.contactLink, pressed && styles.buttonPressed]}>
            <MaterialCommunityIcons
              name="email-outline"
              size={scaleBySizeClass(16, sizeClass)}
              color={palette.accent}
            />
            <ThemedText style={styles.contactEmail}>{PARTNER_CONTACT_EMAIL}</ThemedText>
          </Pressable>
          <View style={styles.copiedSlot}>
            {didCopy && (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(300)}
                style={styles.copiedBadge}>
                <MaterialCommunityIcons
                  name="check"
                  size={scaleBySizeClass(14, sizeClass)}
                  color={palette.textMuted}
                />
                <ThemedText style={styles.copiedText}>Copied</ThemedText>
              </Animated.View>
            )}
          </View>
        </Animated.View>
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
    contactContainer: {
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    contactPrompt: {
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.textMuted,
      textAlign: 'center',
    },
    contactLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      padding: scaleBySizeClass(8, sizeClass),
    },
    contactEmail: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
      color: palette.accent,
    },
    copiedSlot: {
      height: scaleBySizeClass(18, sizeClass),
      justifyContent: 'center',
    },
    copiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
    },
    copiedText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      color: palette.textMuted,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  });
}

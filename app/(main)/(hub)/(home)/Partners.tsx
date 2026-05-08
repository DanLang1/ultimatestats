import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

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
        {/* <Animated.View style={styles.card} entering={FadeIn.duration(400)}> */}
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

          <Animated.View entering={FadeInRight.duration(400).delay(200)} style={{ width: '100%' }}>
            <ThemedText style={styles.title}>DH Ultimate</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInRight.duration(400).delay(300)} style={{ width: '100%' }}>
            <ThemedText style={styles.description}>
              Custom jerseys, proudly made in the Philippines.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.duration(400).delay(400)}
            style={styles.actionContainer}>
            <Pressable
              onPress={() => Linking.openURL('https://dhultimate.com/pages/order1')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <MaterialCommunityIcons
                name="tshirt-crew"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.dhButtonText}
              />
              <ThemedText style={styles.primaryButtonText}>Start a Team Order</ThemedText>
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
      gap: scaleBySizeClass(10, sizeClass),
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
      marginBottom: -scaleBySizeClass(12, sizeClass),
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
    description: {
      fontSize: scaleBySizeClass(15, sizeClass),
      color: palette.dhYellow,
      textAlign: 'center',
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    actionContainer: {
      width: '100%',
      marginTop: scaleBySizeClass(8, sizeClass),
    },
    primaryButton: {
      backgroundColor: palette.dhYellow,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      gap: scaleBySizeClass(8, sizeClass),
    },
    primaryButtonText: {
      color: palette.dhButtonText,
      fontFamily: Fonts.extraBold,
      fontSize: scaleBySizeClass(15, sizeClass),
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  });
}

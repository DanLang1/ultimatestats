import { useTheme } from '@/context/ThemeContext';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { formatRatioFull, GenderRatio } from '@/lib/genderRatioUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PullPromptScreen() {
  const {
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    setPossession,
    gameTo,
    gameLength,
    softCapMins,
    team1Timeouts,
    autoHalftimeEnabled,
    floaterEnabled,
    team1BgColor,
    team2BgColor,
  } = useGameStore();
  const { genderRatioEnabled, setFirstPointRatio, firstPointRatio } = useSettingsStore();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const team1Name = currentTeam?.name ?? 'Team 1';

  // Determine what's needed
  const needPossession = statTrackingEnabled && possession === null;
  const needRatio = genderRatioEnabled && firstPointRatio === null;

  // Two-step flow: possession first (if needed), then ratio (if needed)
  const [step, setStep] = useState<'possession' | 'ratio'>(needPossession ? 'possession' : 'ratio');
  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | null>(null);

  // Calculate contrasting text colors for team cards
  const team1TextColor = getContrastingTextColor(team1BgColor || palette.primary);
  const team2TextColor = getContrastingTextColor(team2BgColor || palette.accent);

  // If nothing is needed, don't show the modal
  if (!needPossession && !needRatio) {
    return null;
  }

  // Derived values
  const softCapTime = gameLength - softCapMins;
  const timeoutsLabel = `${team1Timeouts.length} TOs${autoHalftimeEnabled ? '/Half' : ''}`;

  const handleSelect = (team: 'team1' | 'team2') => {
    if (genderRatioEnabled) {
      // Don't set possession yet - wait until ratio is selected
      setSelectedTeam(team);
      setStep('ratio');
    } else {
      setPossession(team);
      // Chain to PointTransition for first point line selection
      if (shouldShowLinePrompt()) {
        router.replace('/PointTransition');
      } else {
        router.dismissTo('/');
      }
    }
  };

  const handleRatioSelect = (ratio: GenderRatio) => {
    // Only set possession if we went through possession step
    if (needPossession && selectedTeam) {
      setPossession(selectedTeam);
    }
    setFirstPointRatio(ratio);
    // Chain to PointTransition for first point line selection
    if (shouldShowLinePrompt()) {
      router.replace('/PointTransition');
    } else {
      router.dismissTo('/');
    }
  };

  const handleChangeSettings = () => {
    router.replace('/Settings');
  };

  const settingsBadges = [
    <>
      <MaterialCommunityIcons name="trophy-outline" size={12} color={palette.textMuted} />
      <Text style={[styles.settingBadgeText, { color: palette.textMuted }]}>Game to {gameTo}</Text>
    </>,
    <>
      <MaterialCommunityIcons name="clock-outline" size={12} color={palette.textMuted} />
      <Text style={[styles.settingBadgeText, { color: palette.textMuted }]}>
        Hard Cap {gameLength}m
      </Text>
    </>,
    <>
      <MaterialCommunityIcons name="clock-alert-outline" size={12} color={palette.textMuted} />
      <Text style={[styles.settingBadgeText, { color: palette.textMuted }]}>
        Soft Cap {softCapTime}m
      </Text>
    </>,
    <>
      <MaterialCommunityIcons name="timer-sand" size={12} color={palette.textMuted} />
      <Text style={[styles.settingBadgeText, { color: palette.textMuted }]}>{timeoutsLabel}</Text>
    </>,
    ...(autoHalftimeEnabled
      ? [
          <>
            <MaterialCommunityIcons name="check" size={12} color={palette.textMuted} />
            <Text style={[styles.settingBadgeText, { color: palette.textMuted }]}>
              Half{floaterEnabled ? ' + Floaters' : ''}
            </Text>
          </>,
        ]
      : []),
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: palette.overlayDark60,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}>
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={[styles.sheet, { backgroundColor: palette.modalBg, shadowColor: palette.shadow }]}>
          {/* Close button - top right */}
          <Pressable
            onPress={() => router.replace('/Dashboard')}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}>
            <MaterialCommunityIcons name="close" size={20} color={palette.textMuted} />
          </Pressable>

          {/* Top Bar: Settings Pills */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.headerContainer}>
            <View style={styles.settingsBar}>
              <Pressable
                onPress={handleChangeSettings}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [styles.editIconBtn, pressed && { opacity: 0.5 }]}>
                <MaterialCommunityIcons name="pencil" size={14} color={palette.accent} />
              </Pressable>
              {settingsBadges.map((badge, index) => (
                <View
                  key={index}
                  style={[styles.settingBadge, { backgroundColor: palette.overlay05 }]}>
                  {badge}
                </View>
              ))}
            </View>

            <View style={styles.lockInfo}>
              <MaterialCommunityIcons name="lock-outline" size={12} color={palette.danger} />
              <Text style={[styles.lockText, { color: palette.danger }]}>
                Settings locked during game
              </Text>
            </View>
          </Animated.View>

          {step === 'possession' ? (
            <>
              {/* Main Matchup Stage */}
              <View style={styles.matchupContainer}>
                {/* My Team Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.teamCard,
                    {
                      backgroundColor: team1BgColor || palette.primary,
                      borderColor: palette.overlay10,
                    },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleSelect('team1')}>
                  <Text style={[styles.teamNameLarge, { color: team1TextColor }]}>{team1Name}</Text>
                </Pressable>

                {/* VS Badge */}
                <View style={styles.vsBadge}>
                  <Text style={[styles.vsText, { color: palette.textMuted }]}>VS</Text>
                </View>

                {/* Opponent Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.teamCard,
                    {
                      backgroundColor: team2BgColor || palette.accent,
                      borderColor: palette.overlay10,
                    },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleSelect('team2')}>
                  <Text style={[styles.teamNameLarge, { color: team2TextColor }]}>{team2Name}</Text>
                </Pressable>
              </View>

              {/* Footer Heading */}
              <Animated.View entering={FadeIn.delay(100)} style={styles.footer}>
                <Text style={[styles.mainQuestion, { color: palette.modalText }]}>
                  Who is receiving?
                </Text>
              </Animated.View>
            </>
          ) : (
            <>
              {/* Ratio Selection Stage */}
              <View style={styles.ratioContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.ratioCard,
                    { backgroundColor: palette.accent, borderColor: palette.overlay10 },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleRatioSelect('more-women')}>
                  <Text
                    style={[styles.ratioText, { color: getContrastingTextColor(palette.accent) }]}>
                    {formatRatioFull('more-women')}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.ratioCard,
                    { backgroundColor: palette.primary, borderColor: palette.overlay10 },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleRatioSelect('more-men')}>
                  <Text
                    style={[styles.ratioText, { color: getContrastingTextColor(palette.primary) }]}>
                    {formatRatioFull('more-men')}
                  </Text>
                </Pressable>
              </View>

              {/* Footer Heading */}
              <Animated.View entering={FadeIn.delay(100)} style={styles.footer}>
                <Text style={[styles.mainQuestion, { color: palette.modalText }]}>
                  Select ratio for Point 1
                </Text>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 700,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  settingsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  settingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  settingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editIconBtn: {
    padding: 3,
  },
  matchupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  teamCard: {
    flex: 1,
    height: 140, // Taller, more prominent cards
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    maxWidth: 280,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  teamNameLarge: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  vsBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  mainQuestion: {
    fontSize: 16,
    fontWeight: '600',
  },
  lockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 20,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  ratioCard: {
    flex: 1,
    height: 100,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    maxWidth: 200,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ratioText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
});

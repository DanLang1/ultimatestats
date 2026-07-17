import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import FlashingIcon from '@/components/ui/FlashingIcon';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface HelpContentProps {
  showActionBarLegend?: boolean;
}

export default function HelpContent({ showActionBarLegend = true }: HelpContentProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);

  return (
    <>
      {/* Action Bar Legend */}
      {showActionBarLegend && (
        <>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            ACTION BAR LEGEND
          </ThemedText>
          <View style={[styles.legendContainer, { backgroundColor: palette.overlay08 }]}>
            <ThemedText style={[styles.legendCategoryTitle, { color: palette.danger }]}>
              When Your Team Has Possession
            </ThemedText>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="hand-front-left-outline"
                  size={metrics.legendIconSize}
                  color={palette.danger}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
                  OPP D
                </ThemedText>
                <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Opponent made a defensive play
                </ThemedText>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <FontAwesome5
                  name="hands-wash"
                  size={metrics.legendDropIconSize}
                  color={palette.danger}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
                  DROP
                </ThemedText>
                <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Your team dropped the disc
                </ThemedText>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={metrics.legendIconSize}
                  color={palette.danger}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
                  T/A
                </ThemedText>
                <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Your team threw it away (incomplete pass)
                </ThemedText>
              </View>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="scale-balance"
                  size={metrics.legendIconSize}
                  color={palette.danger}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
                  50/50
                </ThemedText>
                <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Partial blame on thrower and receiver
                </ThemedText>
              </View>
            </View>

            <View style={[styles.legendDivider, { backgroundColor: palette.overlay10 }]} />

            <ThemedText style={[styles.legendCategoryTitle, { color: palette.success }]}>
              When Opponent Has Possession
            </ThemedText>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="hand-back-left-outline"
                  size={metrics.legendIconSize}
                  color={palette.success}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
                  BLOCK
                </ThemedText>
                <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Your team got a block
                </ThemedText>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="gift-outline"
                  size={metrics.legendIconSize}
                  color={palette.accent}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
                  OPP TURN
                </ThemedText>
                <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Opponent made an unforced error
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
        </>
      )}

      {/* Cap Status Legend */}
      <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
        CAP STATUS LEGEND
      </ThemedText>
      <View style={[styles.legendContainer, { backgroundColor: palette.overlay08 }]}>
        <View style={styles.legendItem}>
          <View style={styles.legendIconContainer}>
            <FlashingIcon
              name="hat-fedora"
              size={metrics.legendIconSize}
              color={palette.textMuted}
              isFlashing
            />
          </View>
          <View style={styles.legendTextContainer}>
            <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
              Softcap Pending
            </ThemedText>
            <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
              Softcap has not activated yet but will after the next score
            </ThemedText>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendIconContainer}>
            <MaterialCommunityIcons
              name="hat-fedora"
              size={metrics.legendIconSize}
              color={palette.textInverse}
            />
          </View>
          <View style={styles.legendTextContainer}>
            <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
              Softcap Active
            </ThemedText>
            <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
              Softcap is in effect - game is to current score + 1
            </ThemedText>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendIconContainer}>
            <MaterialCommunityIcons
              name="hard-hat"
              size={metrics.legendIconSize}
              color={palette.textInverse}
            />
          </View>
          <View style={styles.legendTextContainer}>
            <ThemedText style={[styles.legendLabel, { color: palette.textInverse }]}>
              Hardcap
            </ThemedText>
            <ThemedText style={[styles.legendDescription, { color: palette.textMuted }]}>
              Timer reached zero - game ends after next score unless tied
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

      {/* Help Section */}
      <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>HELP</ThemedText>
      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          router.push('/TutorialIntro');
        }}>
        <MaterialCommunityIcons
          name="school-outline"
          size={metrics.buttonIconSize}
          color={palette.accent}
        />
        <View style={styles.tutorialButtonContent}>
          <ThemedText style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            View Tutorial
          </ThemedText>
          <ThemedText style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            Learn how to use U-Stat
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={metrics.buttonIconSize}
          color={palette.textMuted}
        />
      </Pressable>

      <View style={styles.buttonSpacer} />

      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          router.push({ pathname: '/TutorialAdvancedTracker', params: { origin: 'help' } });
        }}>
        <MaterialCommunityIcons
          name="gesture-swipe-vertical"
          size={metrics.buttonIconSize}
          color={palette.accent}
        />
        <View style={styles.tutorialButtonContent}>
          <ThemedText style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Advanced Guide
          </ThemedText>
          <ThemedText style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            Advanced tracking gestures
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={metrics.buttonIconSize}
          color={palette.textMuted}
        />
      </Pressable>

      <View style={styles.buttonSpacer} />

      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          router.replace('/TutorialStatIntro');
        }}>
        <MaterialCommunityIcons
          name="chart-line"
          size={metrics.buttonIconSize}
          color={palette.accent}
        />
        <View style={styles.tutorialButtonContent}>
          <ThemedText style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Stats Guide
          </ThemedText>
          <ThemedText style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            How to track player statistics
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={metrics.buttonIconSize}
          color={palette.textMuted}
        />
      </Pressable>

      <View style={styles.buttonSpacer} />

      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          Linking.openURL('https://u-stat.app/privacy/');
        }}>
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={metrics.buttonIconSize}
          color={palette.accent}
        />
        <View style={styles.tutorialButtonContent}>
          <ThemedText style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Privacy Policy
          </ThemedText>
          <ThemedText style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            TLDR: Local first with options for sharing
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="open-in-new"
          size={metrics.buttonIconSize}
          color={palette.textMuted}
        />
      </Pressable>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(16, sizeClass),
    },
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(20, sizeClass),
    },
    tutorialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: scaleBySizeClass(12, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    tutorialButtonContent: {
      flex: 1,
    },
    tutorialButtonTitle: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    tutorialButtonSubtitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
      marginTop: scaleBySizeClass(2, sizeClass),
    },
    legendContainer: {
      borderRadius: scaleBySizeClass(12, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    legendCategoryTitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.bold,
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: scaleBySizeClass(12, sizeClass),
    },
    legendTextContainer: {
      flex: 1,
    },
    legendLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    legendDescription: {
      fontSize: scaleBySizeClass(13, sizeClass),
      marginTop: scaleBySizeClass(2, sizeClass),
    },
    legendDivider: {
      height: 1,
      marginVertical: scaleBySizeClass(8, sizeClass),
    },
    legendIconContainer: {
      width: scaleBySizeClass(28, sizeClass),
      alignItems: 'center',
    },
    buttonSpacer: {
      height: scaleBySizeClass(12, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    legendIconSize: scaleBySizeClass(20, sizeClass),
    legendDropIconSize: scaleBySizeClass(16, sizeClass),
    buttonIconSize: scaleBySizeClass(24, sizeClass),
  };
}

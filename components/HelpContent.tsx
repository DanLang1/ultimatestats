import FlashingIcon from '@/components/ui/FlashingIcon';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

interface HelpContentProps {
  showActionBarLegend?: boolean;
  sizeClass?: SizeClass;
}

export default function HelpContent({
  showActionBarLegend = true,
  sizeClass = 'small',
}: HelpContentProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);

  return (
    <>
      {/* Action Bar Legend */}
      {showActionBarLegend && (
        <>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>ACTION BAR LEGEND</Text>
          <View style={[styles.legendContainer, { backgroundColor: palette.overlay08 }]}>
            <Text style={[styles.legendCategoryTitle, { color: palette.danger }]}>
              When Your Team Has Possession
            </Text>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="hand-front-left-outline"
                  size={metrics.legendIconSize}
                  color={palette.danger}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <Text style={[styles.legendLabel, { color: palette.textInverse }]}>OPP D</Text>
                <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Opponent made a defensive play
                </Text>
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
                <Text style={[styles.legendLabel, { color: palette.textInverse }]}>DROP</Text>
                <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Your team dropped the disc
                </Text>
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
                <Text style={[styles.legendLabel, { color: palette.textInverse }]}>T/A</Text>
                <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Your team threw it away (incomplete pass)
                </Text>
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
                <Text style={[styles.legendLabel, { color: palette.textInverse }]}>50/50</Text>
                <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Partial blame on thrower and receiver
                </Text>
              </View>
            </View>

            <View style={[styles.legendDivider, { backgroundColor: palette.overlay10 }]} />

            <Text style={[styles.legendCategoryTitle, { color: palette.success }]}>
              When Opponent Has Possession
            </Text>
            <View style={styles.legendItem}>
              <View style={styles.legendIconContainer}>
                <MaterialCommunityIcons
                  name="hand-back-left-outline"
                  size={metrics.legendIconSize}
                  color={palette.success}
                />
              </View>
              <View style={styles.legendTextContainer}>
                <Text style={[styles.legendLabel, { color: palette.textInverse }]}>BLOCK</Text>
                <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Your team got a block
                </Text>
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
                <Text style={[styles.legendLabel, { color: palette.textInverse }]}>OPP TURN</Text>
                <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
                  Opponent made an unforced error
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
        </>
      )}

      {/* Cap Status Legend */}
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>CAP STATUS LEGEND</Text>
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
            <Text style={[styles.legendLabel, { color: palette.textInverse }]}>
              Softcap Pending
            </Text>
            <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
              Softcap has not activated yet but will after the next score
            </Text>
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
            <Text style={[styles.legendLabel, { color: palette.textInverse }]}>Softcap Active</Text>
            <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
              Softcap is in effect - game is to current score + 1
            </Text>
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
            <Text style={[styles.legendLabel, { color: palette.textInverse }]}>Hardcap</Text>
            <Text style={[styles.legendDescription, { color: palette.textMuted }]}>
              Timer reached zero - game ends after next score unless tied
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

      {/* Help Section */}
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>HELP</Text>
      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          useTutorialStore.getState().triggerOnboarding();
          router.replace('/');
        }}>
        <MaterialCommunityIcons
          name="school-outline"
          size={metrics.buttonIconSize}
          color={palette.accent}
        />
        <View style={styles.tutorialButtonContent}>
          <Text style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            View Tutorial
          </Text>
          <Text style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            Learn how to use U-Stat
          </Text>
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
          useTutorialStore.getState().triggerStatsTutorial();
          router.replace('/');
        }}>
        <MaterialCommunityIcons
          name="chart-line"
          size={metrics.buttonIconSize}
          color={palette.accent}
        />
        <View style={styles.tutorialButtonContent}>
          <Text style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Stats Guide
          </Text>
          <Text style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            How to track player statistics
          </Text>
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
          <Text style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            TLDR: Local first with options for sharing
          </Text>
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
      fontWeight: '700',
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
      fontWeight: '600',
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
      fontWeight: '700',
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
      fontWeight: '700',
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

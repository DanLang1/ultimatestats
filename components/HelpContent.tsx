import FlashingIcon from '@/components/ui/FlashingIcon';
import { useTheme } from '@/context/ThemeContext';
import { useTutorialStore } from '@/store/tutorialStore';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

interface HelpContentProps {
  showActionBarLegend?: boolean;
}

export default function HelpContent({ showActionBarLegend = true }: HelpContentProps) {
  const { palette } = useTheme();

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
                  size={20}
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
                <FontAwesome5 name="hands-wash" size={16} color={palette.danger} />
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
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={palette.danger} />
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
                <MaterialCommunityIcons name="scale-balance" size={20} color={palette.danger} />
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
                  size={20}
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
                <MaterialCommunityIcons name="gift-outline" size={20} color={palette.accent} />
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
            <FlashingIcon name="hat-fedora" size={20} color={palette.textMuted} isFlashing />
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
            <MaterialCommunityIcons name="hat-fedora" size={20} color={palette.textInverse} />
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
            <MaterialCommunityIcons name="hard-hat" size={20} color={palette.textInverse} />
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
        <MaterialCommunityIcons name="school-outline" size={24} color={palette.accent} />
        <View style={styles.tutorialButtonContent}>
          <Text style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            View Tutorial
          </Text>
          <Text style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            Learn how to use UltimateStats
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={palette.textMuted} />
      </Pressable>

      <View style={{ height: 12 }} />

      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          useTutorialStore.getState().triggerStatsTutorial();
          router.replace('/');
        }}>
        <MaterialCommunityIcons name="chart-line" size={24} color={palette.accent} />
        <View style={styles.tutorialButtonContent}>
          <Text style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Stats Guide
          </Text>
          <Text style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            How to track player statistics
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={palette.textMuted} />
      </Pressable>

      <View style={{ height: 12 }} />

      <Pressable
        style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
        onPress={() => {
          Linking.openURL('https://ustat.netlify.app/privacy/');
        }}>
        <MaterialCommunityIcons name="shield-lock-outline" size={24} color={palette.accent} />
        <View style={styles.tutorialButtonContent}>
          <Text style={[styles.tutorialButtonTitle, { color: palette.textInverse }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.tutorialButtonSubtitle, { color: palette.textMuted }]}>
            TLDR: Everything is stored locally on your device
          </Text>
        </View>
        <MaterialCommunityIcons name="open-in-new" size={24} color={palette.textMuted} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tutorialButtonContent: {
    flex: 1,
  },
  tutorialButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tutorialButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  legendContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  legendCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  legendDivider: {
    height: 1,
    marginVertical: 8,
  },
  legendIconContainer: {
    width: 28,
    alignItems: 'center',
  },
});

import { TimeoutCounter } from '@/components/game-info/TimeoutCounter';
import { ThemedView } from '@/components/ThemedView';
import FlashingIcon from '@/components/ui/FlashingIcon';
import { useTheme } from '@/context/ThemeContext';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameStore } from '@/store/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameInfoScreen() {
  const {
    gameTo,
    currentTeam,
    team2Name,
    team1Timeouts,
    team2Timeouts,
    team1Floater,
    team2Floater,
    team1Score,
    team2Score,
    isSoftCap,
    softCapPending,
    statTrackingEnabled,
  } = useGameStore();

  const team1Name = currentTeam?.name ?? 'Team 1';

  const { timeLeft } = useGameTimer();
  const isHardcap = timeLeft === 0;

  const { palette } = useTheme();

  const countTimeoutsRemaining = (timeouts: boolean[]) => timeouts.filter((t) => t).length;

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>MATCH STATUS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Game To Section */}
        <View style={styles.targetSection}>
          {isHardcap ? (
            <>
              <View style={styles.hardcapLabelRow}>
                <MaterialCommunityIcons name="hard-hat" size={18} color={palette.accent} />
                <Text style={[styles.targetLabel, { color: palette.accent }]}>HARDCAP</Text>
              </View>
              {/* Under hardcap: show what happens after current point */}
              {team1Score === team2Score ? (
                // Tied at hardcap = universe point
                <View style={[styles.capStatusBadge, { marginTop: 8 }]}>
                  <MaterialCommunityIcons
                    name="sword-cross"
                    size={20}
                    color={palette.textInverse}
                  />
                  <Text style={[styles.universePointText, { color: palette.textInverse }]}>
                    Universe Point
                  </Text>
                </View>
              ) : (
                // Not tied - show who wins and how
                <>
                  {(() => {
                    const leadingTeam = team1Score > team2Score ? team1Name : team2Name;
                    const trailingTeam = team1Score > team2Score ? team2Name : team1Name;
                    const scoreDiff = Math.abs(team1Score - team2Score);
                    const canTie = scoreDiff === 1;

                    return (
                      <>
                        <Text style={[styles.hardcapWinnerText, { color: palette.textInverse }]}>
                          {leadingTeam}
                        </Text>
                        <Text style={[styles.capStatusText, { color: palette.textMuted }]}>
                          {canTie ? `wins unless ${trailingTeam} scores` : 'wins after this point'}
                        </Text>
                      </>
                    );
                  })()}
                </>
              )}
            </>
          ) : (
            // Normal or softcap display
            <>
              <Text style={[styles.targetLabel, { color: palette.accent }]}>GAME TO</Text>
              <Text style={[styles.targetNumber, { color: palette.textInverse }]}>{gameTo}</Text>
              {isSoftCap && (
                <View style={styles.capStatusBadge}>
                  <MaterialCommunityIcons name="hat-fedora" size={16} color={palette.textInverse} />
                  <Text style={[styles.capStatusText, { color: palette.textInverse }]}>
                    Softcap Active
                  </Text>
                </View>
              )}
              {softCapPending && !isSoftCap && (
                <View style={styles.capStatusBadge}>
                  <FlashingIcon
                    name="hat-fedora"
                    size={16}
                    color={palette.textInverse}
                    isFlashing
                  />
                  <Text style={[styles.capStatusText, { color: palette.textInverse }]}>
                    Softcap Pending
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Current Score */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreTeam}>
            <Text style={[styles.scoreTeamName, { color: palette.textMuted }]}>{team1Name}</Text>
            <Text style={[styles.scoreValue, { color: palette.textInverse }]}>{team1Score}</Text>
          </View>
          <Text style={[styles.scoreDivider, { color: palette.textMuted }]}>-</Text>
          <View style={styles.scoreTeam}>
            <Text style={[styles.scoreValue, { color: palette.textInverse }]}>{team2Score}</Text>
            <Text style={[styles.scoreTeamName, { color: palette.textMuted }]}>{team2Name}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        {/* Timeouts Section */}
        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>TIMEOUTS REMAINING</Text>
        <View style={styles.teamsGrid}>
          <View style={styles.teamColumn}>
            <Text style={[styles.teamName, { color: palette.textInverse }]}>{team1Name}</Text>
            <TimeoutCounter
              count={countTimeoutsRemaining(team1Timeouts)}
              hasFloater={team1Floater}
            />
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: palette.overlay10 }]} />

          <View style={styles.teamColumn}>
            <Text style={[styles.teamName, { color: palette.textInverse }]}>{team2Name}</Text>
            <TimeoutCounter
              count={countTimeoutsRemaining(team2Timeouts)}
              hasFloater={team2Floater}
            />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        {/* Action Bar Legend - only show when stat tracking enabled */}
        {statTrackingEnabled && (
          <>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>
              ACTION BAR LEGEND
            </Text>
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
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
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
              <Text style={[styles.legendLabel, { color: palette.textInverse }]}>
                Softcap Active
              </Text>
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

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>HELP</Text>
        <Pressable
          style={[styles.tutorialButton, { backgroundColor: palette.overlay08 }]}
          onPress={() => {
            useTutorialStore.getState().triggerOnboarding();
            router.back();
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
            router.back();
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
  },

  // Game To
  targetSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetNumber: {
    fontSize: 56,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 64,
  },
  hardcapWinnerText: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  hardcapLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  capStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  universePointText: {
    fontSize: 24,
    fontWeight: '700',
  },

  // Current Score
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  scoreTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreTeamName: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: '300',
  },

  divider: {
    height: 1,
    marginVertical: 20,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },

  // Teams Grid
  teamsGrid: {
    flexDirection: 'row',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Tutorial Button
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

  // Legend
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
  legendEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
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
  legendFlashingNote: {
    fontSize: 9,
    marginTop: 2,
  },
});

import { ThemedText } from '@/components/ThemedText';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';
import { formatDate } from '@/lib/statsUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface AdvancedAggregateGamesListProps {
  games: AdvancedGameSummary[];
  selectedTeamId: string | null;
  selectedGameIds: Set<string>;
  onSelectTeam: (teamId: string) => void;
  onToggleGameSelection: (gameId: string) => void;
  onSelectAllGames: (gameIds: string[]) => void;
  onDeselectAllGames: () => void;
}

interface SideGroup {
  id: string;
  name: string;
  gameCount: number;
  totalPoints: number;
}

function getSideGroups(games: AdvancedGameSummary[]): SideGroup[] {
  const groupMap = new Map<string, SideGroup>();

  for (const game of games) {
    const teamId = game.focusSourceTeamId ?? game.focusSideId;
    const existing = groupMap.get(teamId);
    if (existing) {
      existing.gameCount++;
      existing.totalPoints += game.myScore;
    } else {
      groupMap.set(teamId, {
        id: teamId,
        name: game.myTeamName,
        gameCount: 1,
        totalPoints: game.myScore,
      });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => b.gameCount - a.gameCount);
}

export default function AdvancedAggregateGamesList({
  games,
  selectedTeamId,
  selectedGameIds,
  onSelectTeam,
  onToggleGameSelection,
  onSelectAllGames,
  onDeselectAllGames,
}: AdvancedAggregateGamesListProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (!hasItems(games)) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
          No advanced games yet
        </ThemedText>
      </View>
    );
  }

  if (selectedTeamId) {
    const gamesForSide = games
      .filter((game) => (game.focusSourceTeamId ?? game.focusSideId) === selectedTeamId)
      .sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    const visibleIds = gamesForSide.map((game) => game.id);
    const allVisibleSelected =
      hasItems(gamesForSide) && visibleIds.every((id) => selectedGameIds.has(id));

    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ThemedText style={[styles.instructions, { color: palette.textMuted }]}>
            Advanced Games
          </ThemedText>
          <Pressable
            hitSlop={8}
            onPress={() => {
              if (allVisibleSelected) {
                onDeselectAllGames();
              } else {
                onSelectAllGames(visibleIds);
              }
            }}>
            <ThemedText style={[styles.selectAllText, { color: palette.accent }]}>
              {allVisibleSelected ? 'Deselect All' : 'Select All'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.gamesList}>
          {gamesForSide.map((game) => {
            const isSelected = selectedGameIds.has(game.id);

            return (
              <Pressable
                key={game.id}
                style={[
                  styles.gameCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                  isSelected && { borderColor: palette.accent },
                ]}
                onPress={() => onToggleGameSelection(game.id)}>
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: palette.overlay20 },
                    isSelected && { backgroundColor: palette.accent, borderColor: palette.accent },
                  ]}>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={scaleBySizeClass(14, sizeClass)}
                      color={palette.textOnAccent}
                    />
                  )}
                </View>

                <View style={styles.gameInfo}>
                  <ThemedText style={[styles.opponentText, { color: palette.textInverse }]}>
                    vs {game.opponentName}
                  </ThemedText>
                  <View style={styles.gameDetails}>
                    <ScoreBadge score1={game.myScore} score2={game.opponentScore} size="small" />
                    <ThemedText style={[styles.dateText, { color: palette.textMuted }]}>
                      {formatDate(game.sortTimestamp)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.instructions, { color: palette.textMuted }]}>
        Select an advanced team to aggregate
      </ThemedText>

      <View style={styles.teamsList}>
        {getSideGroups(games).map((team) => (
          <Pressable
            key={team.id}
            style={[
              styles.teamCard,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}
            onPress={() => onSelectTeam(team.id)}>
            <View style={styles.teamInfo}>
              <ThemedText style={[styles.teamName, { color: palette.textInverse }]}>
                {team.name}
              </ThemedText>
              <ThemedText style={[styles.teamMeta, { color: palette.textMuted }]}>
                {team.gameCount} game{team.gameCount !== 1 ? 's' : ''} • {team.totalPoints} points
                tracked
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      gap: 16,
      marginTop: 40,
    },
    emptyText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      textAlign: 'center',
    },
    instructions: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    selectAllText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    teamsList: {
      gap: 12,
    },
    teamCard: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamInfo: {
      flex: 1,
      gap: 4,
    },
    teamName: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    teamMeta: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    gamesList: {
      gap: 10,
    },
    gameCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameInfo: {
      flex: 1,
      gap: 8,
    },
    opponentText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    gameDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dateText: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
  });
}

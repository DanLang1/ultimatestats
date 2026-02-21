import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { resolveTeamName } from '@/lib/playerUtils';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

interface SavedGamesListProps {
  games: SavedGame[];
  onSelectGame: (game: SavedGame) => void;
  selectedGameIds?: Set<string>;
  onToggleGameSelection?: (gameId: string) => void;
  onClearSelection?: () => void;
}

type SortField = 'date' | 'team' | 'score';
type SortDirection = 'asc' | 'desc';

export default function SavedGamesList({
  games,
  onSelectGame,
  selectedGameIds = new Set(),
  onToggleGameSelection,
  onClearSelection,
}: SavedGamesListProps) {
  const { palette } = useTheme();
  const { savedTeams } = useGameStore();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Helper to get live team name with snapshot fallback
  const getTeamName = (game: SavedGame) =>
    resolveTeamName(game.team1.id, game.team1.name, savedTeams);

  let filteredAndSortedGames = [...games];

  // Filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredAndSortedGames = filteredAndSortedGames.filter((game) => {
      const t1 = getTeamName(game).toLowerCase();
      const t2 = game.team2Name.toLowerCase();
      const date = formatDate(game.createdAt).toLowerCase();
      return t1.includes(query) || t2.includes(query) || date.includes(query);
    });
  }

  // Sort
  const dir = sortDirection === 'asc' ? 1 : -1;
  filteredAndSortedGames.sort((a, b) => {
    switch (sortField) {
      case 'team':
        return dir * getTeamName(a).localeCompare(getTeamName(b));
      case 'score': {
        const totalA = a.team1Score + a.team2Score;
        const totalB = b.team1Score + b.team2Score;
        return dir * (totalA - totalB);
      }
      case 'date':
      default:
        return dir * (a.createdAt - b.createdAt);
    }
  });

  if (games.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="history"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
        />
        <Text style={[styles.emptyText, { color: palette.textMuted }]}>No saved games yet</Text>
        <Text style={[styles.emptySubtext, { color: palette.textMuted }]}>
          Save games from the win screen to see them here
        </Text>
      </View>
    );
  }

  const sortFields: {
    field: SortField;
    label: string;
    ascIcon: keyof typeof MaterialCommunityIcons.glyphMap;
    descIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  }[] = [
    {
      field: 'date',
      label: 'Date',
      ascIcon: 'sort-calendar-ascending',
      descIcon: 'sort-calendar-descending',
    },
    {
      field: 'team',
      label: 'Team',
      ascIcon: 'sort-alphabetical-ascending',
      descIcon: 'sort-alphabetical-descending',
    },
    {
      field: 'score',
      label: 'Score',
      ascIcon: 'sort-numeric-ascending',
      descIcon: 'sort-numeric-descending',
    },
  ];

  const handleSortPress = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
    onClearSelection?.();
  };

  return (
    <View style={styles.container}>
      {/* Controls Header */}
      <View style={styles.controlsHeader}>
        <View
          style={[
            styles.searchWrapper,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <MaterialCommunityIcons
            name="magnify"
            size={scaleBySizeClass(20, sizeClass)}
            color={palette.textMuted}
          />
          <TextInput
            style={[styles.searchInput, { color: palette.textInverse }]}
            placeholder="Search teams or dates..."
            placeholderTextColor={palette.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              onClearSelection?.();
            }}
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.sortPills}>
          {sortFields.map((opt) => {
            const isActive = sortField === opt.field;
            const icon = isActive
              ? sortDirection === 'asc'
                ? opt.ascIcon
                : opt.descIcon
              : opt.descIcon;
            return (
              <Pressable
                key={opt.field}
                style={[
                  styles.sortPill,
                  { borderColor: palette.overlay10 },
                  isActive && { backgroundColor: palette.overlay10, borderColor: palette.accent },
                ]}
                onPress={() => handleSortPress(opt.field)}>
                <MaterialCommunityIcons
                  name={icon}
                  size={scaleBySizeClass(16, sizeClass)}
                  color={isActive ? palette.accent : palette.textMuted}
                />
                <Text
                  style={[
                    styles.sortPillText,
                    { color: isActive ? palette.accent : palette.textMuted },
                    isActive && { fontWeight: '700' },
                  ]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.savedGamesList}>
        {filteredAndSortedGames.map((game) => {
          const isSelected = selectedGameIds.has(game.id);
          return (
            <Animated.View
              key={game.id}
              exiting={FadeOut.duration(200)}
              layout={LinearTransition.duration(300)}>
              <View
                style={[
                  styles.savedGameCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                  isSelected && { borderColor: palette.accent },
                ]}>
                {/* Checkbox Section */}
                <Pressable
                  style={styles.checkboxWrapper}
                  onPress={() => onToggleGameSelection?.(game.id)}
                  hitSlop={8}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: palette.overlay20 },
                      isSelected && {
                        backgroundColor: palette.accent,
                        borderColor: palette.accent,
                      },
                    ]}>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={scaleBySizeClass(14, sizeClass)}
                        color={palette.textOnAccent}
                      />
                    )}
                  </View>
                </Pressable>

                {/* Content Section */}
                <Pressable style={styles.cardContent} onPress={() => onSelectGame(game)}>
                  <View style={styles.savedGameHeader}>
                    <Text style={[styles.savedGameDate, { color: palette.textMuted }]}>
                      {formatDate(game.createdAt)}
                    </Text>
                    {game.importedAt && (
                      <MaterialCommunityIcons
                        name="cloud-download-outline"
                        size={scaleBySizeClass(14, sizeClass)}
                        color={palette.textMuted}
                      />
                    )}
                  </View>
                  {isLandscape ? (
                    <View style={styles.savedGameTeams}>
                      <Text
                        style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                        numberOfLines={1}>
                        {getTeamName(game)}
                      </Text>
                      <ScoreBadge score1={game.team1Score} score2={game.team2Score} />
                      <Text
                        style={[
                          styles.savedGameTeamName,
                          styles.savedGameTeamRight,
                          { color: palette.textInverse },
                        ]}
                        numberOfLines={1}>
                        {game.team2Name}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.savedGameTeamsPortrait}>
                      <View style={styles.teamScoreRow}>
                        <Text
                          style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                          numberOfLines={1}>
                          {getTeamName(game)}
                        </Text>
                        <Text
                          style={[
                            styles.teamScoreValue,
                            {
                              color:
                                game.team1Score > game.team2Score
                                  ? palette.success
                                  : game.team1Score < game.team2Score
                                    ? palette.danger
                                    : palette.warning,
                            },
                          ]}>
                          {game.team1Score}
                        </Text>
                      </View>
                      <View style={styles.teamScoreRow}>
                        <Text
                          style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                          numberOfLines={1}>
                          {game.team2Name}
                        </Text>
                        <Text
                          style={[
                            styles.teamScoreValue,
                            {
                              color:
                                game.team2Score > game.team1Score
                                  ? palette.success
                                  : game.team2Score < game.team1Score
                                    ? palette.danger
                                    : palette.warning,
                            },
                          ]}>
                          {game.team2Score}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={[styles.savedGameMeta, { borderTopColor: palette.overlay08 }]}>
                    <MaterialCommunityIcons
                      name="account-multiple"
                      size={scaleBySizeClass(14, sizeClass)}
                      color={palette.textMuted}
                    />
                    <Text style={[styles.savedGameMetaText, { color: palette.textMuted }]}>
                      {game.events.filter((e) => e.type === 'goal').length} point
                      {game.events.filter((e) => e.type === 'goal').length !== 1 ? 's' : ''} tracked
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {filteredAndSortedGames.length === 0 && searchQuery.trim() !== '' && (
        <View style={styles.noResults}>
          <Text style={{ color: palette.textMuted }}>No games match &quot;{searchQuery}&quot;</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    controlsHeader: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: isLandscape ? 12 : 8,
    },
    searchWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      paddingVertical: 8,
    },
    sortPills: {
      flexDirection: 'row',
      gap: 6,
    },
    sortPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      gap: 4,
    },
    sortPillText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
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
    emptySubtext: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      opacity: 0.7,
    },
    noResults: {
      padding: 20,
      alignItems: 'center',
    },
    savedGamesList: {
      gap: 12,
    },
    savedGameCard: {
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    checkboxWrapper: {
      paddingLeft: 16,
      paddingRight: 8,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      padding: 16,
      paddingLeft: 8,
    },
    savedGameHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    savedGameDate: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    savedGameTeams: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    savedGameTeamsPortrait: {
      gap: 4,
    },
    teamScoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamScoreValue: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      minWidth: 28,
      textAlign: 'right',
    },
    savedGameTeamName: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
    },
    savedGameTeamRight: {
      textAlign: 'right',
    },
    savedGameMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    savedGameMetaText: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}

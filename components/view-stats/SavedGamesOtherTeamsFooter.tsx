import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import SavedGamesOtherTeamRow from '@/components/view-stats/SavedGamesOtherTeamRow';
import SavedGamesOtherTeamsSection from '@/components/view-stats/SavedGamesOtherTeamsSection';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { SavedGameTeam } from '@/lib/savedGamesListUtils';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

// Up to this many other teams are all listed; hiding just one or two behind a link isn't worth a tap.
const MAX_FULLY_LISTED_OTHER_TEAMS = 4;
// With more, the newest few are listed and the rest are in the team sheet.
const LISTED_OTHER_TEAMS_WHEN_TRUNCATED = 3;

interface SavedGamesOtherTeamsFooterProps {
  /** Teams other than the shown one, newest first. */
  otherTeams: SavedGameTeam[];
  onSelectTeam: (teamId: string) => void;
  onShowAllTeams: () => void;
}

/** Ends the Saved Games list with links to the other teams, so their games aren't missed. */
export default function SavedGamesOtherTeamsFooter({
  otherTeams,
  onSelectTeam,
  onShowAllTeams,
}: SavedGamesOtherTeamsFooterProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const hasUnlistedTeams = otherTeams.length > MAX_FULLY_LISTED_OTHER_TEAMS;
  const listedTeams = hasUnlistedTeams
    ? otherTeams.slice(0, LISTED_OTHER_TEAMS_WHEN_TRUNCATED)
    : otherTeams;
  const allTeamsLabel = `See all ${otherTeams.length} teams`;

  const seeAllLink = hasUnlistedTeams ? (
    <Pressable
      testID="saved-games-other-teams-all"
      accessibilityRole="button"
      accessibilityLabel={allTeamsLabel}
      // Reaches toward a 44pt target while staying inside the gap above the rows.
      hitSlop={8}
      onPress={onShowAllTeams}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
      <ThemedText style={[styles.linkLabel, { color: palette.accent }]}>See all</ThemedText>
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(18, sizeClass)}
        color={palette.accent}
      />
    </Pressable>
  ) : null;

  return (
    <SavedGamesOtherTeamsSection
      title="Other teams"
      testID="saved-games-other-teams"
      headerAction={seeAllLink}>
      {listedTeams.map((team, index) => {
        const gameCount = `${team.gameCount} ${pluralize(team.gameCount, 'game', 'games')}`;
        return (
          <SavedGamesOtherTeamRow
            key={team.id}
            testID={`saved-games-other-team-${team.id}`}
            label={team.name}
            detail={gameCount}
            accessibilityLabel={`Switch to ${team.name}, ${gameCount}`}
            showDivider={index < listedTeams.length - 1}
            onPress={() => onSelectTeam(team.id)}
          />
        );
      })}
    </SavedGamesOtherTeamsSection>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(2, sizeClass),
    },
    linkPressed: {
      opacity: 0.6,
    },
    linkLabel: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}

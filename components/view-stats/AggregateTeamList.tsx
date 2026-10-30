import { StyleSheet, View } from 'react-native';

import AggregateTeamRow from '@/components/view-stats/AggregateTeamRow';
import { useTheme } from '@/context/ThemeContext';
import { AggregateTeam } from '@/lib/gameListUtils';

interface AggregateTeamListProps {
  teams: AggregateTeam[];
  onSelectTeam: (teamId: string) => void;
}

/** The aggregate screen's first level: every tracked team in one shared surface. */
export default function AggregateTeamList({ teams, onSelectTeam }: AggregateTeamListProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.surface, { backgroundColor: palette.overlay05 }]}>
      {teams.map((team, index) => (
        <AggregateTeamRow
          key={team.id}
          team={team}
          showDivider={index < teams.length - 1}
          onPress={() => onSelectTeam(team.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

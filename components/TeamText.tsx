import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  initialTeamName: string;
  color: string;
}

export default function TeamText({ initialTeamName, color }: TeamTextProps) {
  const [teamName, setTeamName] = useState<string>(initialTeamName);

  return (
    <>
      <View style={styles.teamView}>
        <ThemedText style={{ color: color, fontSize: 40 }} type="title">
          {teamName}
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  teamView: {
    flex: 1,

    justifyContent: 'flex-end',
  },
});

import { StyleSheet, View } from 'react-native';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  teamName: string;
  color: string;
}

export default function TeamText({ teamName, color }: TeamTextProps) {
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

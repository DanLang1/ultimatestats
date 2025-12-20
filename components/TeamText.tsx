import { View } from 'react-native';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  teamName: string;
  color: string;
}

export default function TeamText({ teamName, color }: TeamTextProps) {
  return (
    <View>
      <ThemedText style={{ color: color, fontSize: 40, lineHeight: 48 }} type="title">
        {teamName}
      </ThemedText>
    </View>
  );
}

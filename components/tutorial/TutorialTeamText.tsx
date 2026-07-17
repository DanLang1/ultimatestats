import { View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { getSizeClassValue, useLayout } from '@/hooks/useLayout';

interface TutorialTeamTextProps {
  teamName: string;
  color: string;
  isCompactVertical?: boolean;
}

export default function TutorialTeamText({
  teamName,
  color,
  isCompactVertical = false,
}: TutorialTeamTextProps) {
  const { sizeClass } = useLayout();
  const baseFontSize = getSizeClassValue({ small: 40, medium: 52, large: 60 }, sizeClass);
  const minFontSize = getSizeClassValue({ small: 24, medium: 30, large: 36 }, sizeClass);
  const shrinkThreshold = 8;
  const shrinkFactor = 2;

  const fontSize =
    teamName.length > shrinkThreshold
      ? Math.max(minFontSize, baseFontSize - (teamName.length - shrinkThreshold) * shrinkFactor)
      : baseFontSize;
  const effectiveFontSize = isCompactVertical
    ? Math.max(minFontSize, Math.round(fontSize * 0.86))
    : fontSize;

  const lineHeight = getSizeClassValue({ small: 48, medium: 60, large: 68 }, sizeClass);
  const effectiveLineHeight = isCompactVertical
    ? Math.max(40, Math.round(lineHeight * 0.86))
    : lineHeight;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
      <ThemedText
        style={{
          color: color,
          fontSize: effectiveFontSize,
          lineHeight: effectiveLineHeight,
          flexShrink: 1,
        }}
        type="title"
        numberOfLines={1}>
        {teamName}
      </ThemedText>
    </View>
  );
}

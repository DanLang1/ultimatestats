import { StyleSheet, View } from 'react-native';

import { TrackerPlayerChip } from '@/components/advancedTracking/TrackerPlayerChip';
import type { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import type { PassModifier } from '@/components/advancedTracking/types';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import type { Participant, PlayerRef } from '@/lib/advancedTracking/types';

interface TutorialAdvancedPlayerGridProps {
  participants: Participant[];
  discHolderRef: PlayerRef | null;
  oppHasDisc: boolean;
  handlers: TrackerPlayerGridHandlers;
  cuePlayerId: string | null;
  cueDirection: 'up' | 'down' | 'right' | null;
  passModifier: PassModifier;
}

const PORTRAIT_MAX_CHIP_WIDTH = { small: 180, medium: 170, large: 190 } as const;
const LANDSCAPE_MAX_CHIP_WIDTH = { small: 180, medium: 220, large: 260 } as const;
const PORTRAIT_COLUMNS = 3;
const LANDSCAPE_COLUMNS = 5;

export default function TutorialAdvancedPlayerGrid({
  participants,
  discHolderRef,
  oppHasDisc,
  handlers,
  cuePlayerId,
  cueDirection,
  passModifier,
}: TutorialAdvancedPlayerGridProps) {
  const { palette } = useTheme();
  const { width, sizeClass, isLandscape } = useLayout();
  const columns = isLandscape ? LANDSCAPE_COLUMNS : PORTRAIT_COLUMNS;
  const horizontalPadding = scaleBySizeClass(20, sizeClass);
  const verticalPadding = scaleBySizeClass(12, sizeClass);
  const gap = scaleBySizeClass(isLandscape ? 10 : 12, sizeClass);
  const items: (Participant | 'unknown' | null)[] = [...participants, 'unknown'];

  while (items.length % columns !== 0) items.push(null);

  const availableChipWidth = Math.floor(
    (width - horizontalPadding * 2 - gap * (columns - 1)) / columns,
  );
  const maxChipWidths = isLandscape ? LANDSCAPE_MAX_CHIP_WIDTH : PORTRAIT_MAX_CHIP_WIDTH;
  const chipWidth = Math.min(availableChipWidth, getSizeClassValue(maxChipWidths, sizeClass));
  const gridWidth = chipWidth * columns + gap * (columns - 1) + horizontalPadding * 2;

  return (
    <View
      style={[
        styles.grid,
        {
          width: gridWidth,
          gap,
          padding: verticalPadding,
          paddingHorizontal: horizontalPadding,
        },
      ]}>
      {items.map((item, index) => {
        if (item === null) {
          return <View key={`placeholder-${index}`} style={{ width: chipWidth, aspectRatio: 1 }} />;
        }

        const playerRef: PlayerRef =
          item === 'unknown'
            ? { refType: 'unknown' }
            : { refType: 'participant', participantId: item.id };
        const label = item === 'unknown' ? 'Unknown' : item.name;
        const playerNumber = item === 'unknown' ? undefined : item.number;
        const showCue = item !== 'unknown' && item.id === cuePlayerId && cueDirection !== null;
        const cueIsOnHolder =
          item !== 'unknown' &&
          discHolderRef?.refType === 'participant' &&
          discHolderRef.participantId === item.id;

        return (
          <View key={item === 'unknown' ? 'unknown' : item.id} style={styles.chipWrap}>
            <TrackerPlayerChip
              label={label}
              playerNumber={playerNumber}
              playerRef={playerRef}
              discHolderRef={discHolderRef}
              oppHasDisc={oppHasDisc}
              canDropOpeningPull={false}
              passModifier={passModifier}
              onTap={handlers.onPlayerTap}
              onDrop={handlers.onDrop}
              onPullDrop={handlers.onPullDrop}
              onGoal={handlers.onGoal}
              onThrowaway={handlers.onThrowaway}
              chipWidth={chipWidth}
            />
            {showCue && (
              <View
                style={[
                  styles.cue,
                  cueDirection === 'down' && styles.cueDown,
                  cueDirection === 'up' && styles.cueUp,
                  cueDirection === 'right' && styles.cueRight,
                ]}
                pointerEvents="none">
                <TutorialAnimatedArrow
                  direction={cueDirection}
                  color={cueIsOnHolder ? palette.textOnAccent : palette.accent}
                  size={scaleBySizeClass(30, sizeClass)}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
  chipWrap: {
    alignSelf: 'flex-start',
  },
  cue: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    zIndex: 10,
  },
  cueDown: {
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  cueUp: {
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  cueRight: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
});

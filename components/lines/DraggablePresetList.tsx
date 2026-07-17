import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { LinePreset } from '@/lib/storage/types';

import { DraggablePresetItem } from './DraggablePresetItem';

interface DraggablePresetListProps {
  presets: LinePreset[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragActiveChange: (active: boolean) => void;
  onEditPreset: (preset: LinePreset) => void;
  onDeletePreset: (preset: LinePreset) => void;
}

export function DraggablePresetList({
  presets,
  onReorder,
  onDragActiveChange,
  onEditPreset,
  onDeletePreset,
}: DraggablePresetListProps) {
  const [draggingPresetId, setDraggingPresetId] = useState<string | null>(null);

  const draggingId = useSharedValue('');
  const dragTranslateY = useSharedValue(0);
  const dragOriginIndex = useSharedValue(-1);
  const dragCurrentIndex = useSharedValue(-1);

  const handleDragStart = (presetId: string) => {
    setDraggingPresetId(presetId);
    onDragActiveChange(true);
  };

  const handleSwap = (fromIndex: number, toIndex: number) => {
    onReorder(fromIndex, toIndex);
  };

  const handleDragEnd = () => {
    setDraggingPresetId(null);
    onDragActiveChange(false);
  };

  return (
    <View style={styles.container}>
      {presets.map((preset, index) => (
        <DraggablePresetItem
          key={preset.id}
          preset={preset}
          index={index}
          isDragging={preset.id === draggingPresetId}
          totalCount={presets.length}
          draggingId={draggingId}
          dragTranslateY={dragTranslateY}
          dragOriginIndex={dragOriginIndex}
          dragCurrentIndex={dragCurrentIndex}
          onDragStart={handleDragStart}
          onSwap={handleSwap}
          onDragEnd={handleDragEnd}
          onEditPreset={onEditPreset}
          onDeletePreset={onDeletePreset}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});

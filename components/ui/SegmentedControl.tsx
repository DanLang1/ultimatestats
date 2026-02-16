import {
  ATTENTION_RUN_DURATION_MS,
  useAttentionBorderRunner,
} from '@/components/ui/hooks/useAttentionBorderRunner';
import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface SegmentOption {
  value: string;
  label: string;
  activeColor?: string;
  activeTextColor?: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  attentionColor?: string;
  showRequired?: boolean;
  highlightBorder?: boolean;
  highlightColor?: string;
  highlightLeftColor?: string;
  highlightRightColor?: string;
  attentionRunKey?: number;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  disabled,
  attentionColor,
  showRequired = false,
  highlightBorder = false,
  highlightColor,
  highlightLeftColor,
  highlightRightColor,
  attentionRunKey,
}: SegmentedControlProps) {
  const { palette, themeMode } = useTheme();
  const [isAttentionActive, setIsAttentionActive] = useState(false);
  const { onLayout, runnerStyle, runnerOffsetStyle, enabled } = useAttentionBorderRunner(
    isAttentionActive && !disabled,
  );

  useEffect(() => {
    if (!attentionRunKey || disabled) return;

    setIsAttentionActive(true);
    const timerId = setTimeout(() => {
      setIsAttentionActive(false);
    }, ATTENTION_RUN_DURATION_MS);

    return () => {
      clearTimeout(timerId);
    };
  }, [attentionRunKey, disabled]);

  const hasSideHighlights = highlightBorder && (!!highlightLeftColor || !!highlightRightColor);
  const borderColor = hasSideHighlights
    ? palette.overlay20
    : highlightBorder
      ? (highlightColor ?? palette.warning)
      : palette.overlay20;
  const borderWidth = highlightBorder ? 2 : 1;
  const sideHighlightEdgeWidth = themeMode === 'light' ? 4 : 3;

  return (
    <View>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {disabled && <MaterialCommunityIcons name="lock" size={10} color={palette.textMuted} />}{' '}
            {label}
          </Text>
          {showRequired && (
            <View
              style={[
                styles.requiredChip,
                {
                  backgroundColor: palette.warningOverlay15,
                  borderColor: palette.warning,
                },
              ]}>
              <Text style={[styles.requiredChipText, { color: palette.warning }]}>Required</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.controlWrapper}>
        {highlightBorder && (highlightLeftColor || highlightRightColor) && (
          <View pointerEvents="none" style={styles.sideHighlightLayer}>
            {highlightLeftColor && (
              <View
                style={[
                  styles.leftHighlightEdge,
                  { backgroundColor: highlightLeftColor, width: sideHighlightEdgeWidth },
                ]}
              />
            )}
            {highlightRightColor && (
              <View
                style={[
                  styles.rightHighlightEdge,
                  { backgroundColor: highlightRightColor, width: sideHighlightEdgeWidth },
                ]}
              />
            )}
          </View>
        )}
        <View
          onLayout={onLayout}
          style={[
            styles.container,
            { borderColor, borderWidth, backgroundColor: palette.overlay08 },
          ]}>
          {options.map((option, index) => {
            const isFirst = index === 0;
            const isActive = value === option.value;

            return (
              <React.Fragment key={option.value}>
                {!isFirst && (
                  <View style={[styles.separator, { backgroundColor: palette.overlay20 }]} />
                )}
                <Pressable
                  style={[
                    styles.button,
                    isActive && { backgroundColor: option.activeColor ?? palette.accent },
                    disabled && styles.buttonDisabled,
                  ]}
                  onPress={() => onChange(option.value)}
                  disabled={disabled}>
                  <Text
                    style={[
                      styles.buttonText,
                      { color: palette.textMuted },
                      isActive && { color: option.activeTextColor ?? palette.textOnAccent },
                    ]}
                    numberOfLines={1}>
                    {option.label}
                  </Text>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {enabled && (
          <View pointerEvents="none" style={styles.attentionLayer}>
            <View style={[styles.attentionBase, { borderColor: palette.textOnAccent }]} />
            <Animated.View style={[styles.attentionRunner, runnerStyle]}>
              <View
                style={[styles.attentionRunnerOuter, { backgroundColor: palette.textOnAccent }]}>
                <View
                  style={[
                    styles.attentionRunnerInner,
                    { backgroundColor: attentionColor ?? palette.warning },
                  ]}
                />
              </View>
            </Animated.View>
            <Animated.View style={[styles.attentionRunner, runnerOffsetStyle]}>
              <View
                style={[styles.attentionRunnerOuter, { backgroundColor: palette.textOnAccent }]}>
                <View
                  style={[
                    styles.attentionRunnerInner,
                    { backgroundColor: attentionColor ?? palette.warning },
                  ]}
                />
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requiredChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  requiredChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  container: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  controlWrapper: {
    position: 'relative',
  },
  sideHighlightLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    overflow: 'hidden',
  },
  leftHighlightEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  rightHighlightEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  attentionLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    overflow: 'hidden',
  },
  attentionBase: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: 1,
  },
  attentionRunner: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 22,
    height: 5,
  },
  attentionRunnerOuter: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    paddingHorizontal: 1,
    paddingVertical: 1,
  },
  attentionRunnerInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  separator: {
    width: 1,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

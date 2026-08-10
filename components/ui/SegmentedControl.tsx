import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useState } from 'react';
import { type FocusEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import {
  ATTENTION_RUN_DURATION_MS,
  useAttentionBorderRunner,
} from '@/components/ui/hooks/useAttentionBorderRunner';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  testID?: string;
  activeColor?: string;
  activeTextColor?: string;
  actionIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  actionTestID?: string;
  onAction?: () => void;
  isEditing?: boolean;
  editValue?: string;
  editTestID?: string;
  onEditValueChange?: (value: string) => void;
  onEditComplete?: () => void;
  onEditFocus?: (event: FocusEvent) => void;
  maxEditLength?: number;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: string;
  onChange: (value: T) => void;
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

export function SegmentedControl<T extends string = string>({
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
}: SegmentedControlProps<T>) {
  const { sizeClass } = useLayout();
  const { palette, themeMode } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const [isAttentionActive, setIsAttentionActive] = useState(false);
  const { onLayout, runnerStyle, runnerOffsetStyle, enabled } = useAttentionBorderRunner(
    isAttentionActive && !disabled,
  );

  useEffect(() => {
    if (!attentionRunKey || disabled) return undefined;

    // Start the attention run immediately for this key; the timeout only ends the run.
    // eslint-disable-next-line react/react-compiler
    setIsAttentionActive(true);
    const timerId = setTimeout(() => {
      setIsAttentionActive(false);
    }, ATTENTION_RUN_DURATION_MS);

    return () => {
      clearTimeout(timerId);
    };
  }, [attentionRunKey, disabled]);

  const hasSideHighlights = highlightBorder && (!!highlightLeftColor || !!highlightRightColor);
  let borderColor: string;
  if (hasSideHighlights) {
    borderColor = palette.overlay20;
  } else if (highlightBorder) {
    borderColor = highlightColor ?? palette.warning;
  } else {
    borderColor = palette.overlay20;
  }
  const borderWidth = highlightBorder ? 2 : 1;
  const sideHighlightEdgeWidth = themeMode === 'light' ? 4 : 3;

  return (
    <View>
      {label && (
        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: palette.textMuted }]}>
            {disabled && (
              <MaterialCommunityIcons
                name="lock"
                size={metrics.labelLockSize}
                color={palette.textMuted}
              />
            )}{' '}
            {label}
          </ThemedText>
          {showRequired && (
            <View
              style={[
                styles.requiredChip,
                {
                  backgroundColor: palette.warningOverlay15,
                  borderColor: palette.warning,
                },
              ]}>
              <ThemedText style={[styles.requiredChipText, { color: palette.warning }]}>
                Required
              </ThemedText>
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
                <View
                  style={[
                    styles.segment,
                    isActive && { backgroundColor: option.activeColor ?? palette.accent },
                  ]}>
                  {option.isEditing ? (
                    <TextInput
                      autoFocus
                      testID={option.editTestID}
                      value={option.editValue}
                      onChangeText={option.onEditValueChange}
                      onBlur={option.onEditComplete}
                      onFocus={option.onEditFocus}
                      onSubmitEditing={option.onEditComplete}
                      returnKeyType="done"
                      maxLength={option.maxEditLength}
                      selectTextOnFocus
                      style={[
                        styles.editInput,
                        {
                          color: isActive
                            ? (option.activeTextColor ?? palette.textOnAccent)
                            : palette.textInverse,
                        },
                      ]}
                    />
                  ) : (
                    <Pressable
                      testID={option.testID}
                      style={[styles.button, disabled && styles.buttonDisabled]}
                      onPress={() => onChange(option.value)}
                      disabled={disabled}>
                      <ThemedText
                        style={[
                          styles.buttonText,
                          { color: palette.textMuted },
                          isActive && { color: option.activeTextColor ?? palette.textOnAccent },
                        ]}
                        numberOfLines={1}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  )}
                  {option.actionIcon && option.onAction && !option.isEditing && (
                    <Pressable
                      testID={option.actionTestID}
                      hitSlop={8}
                      onPress={option.onAction}
                      style={({ pressed }) => [
                        styles.actionButton,
                        {
                          borderLeftColor: isActive
                            ? (option.activeTextColor ?? palette.textOnAccent)
                            : palette.overlay20,
                          backgroundColor: isActive ? palette.overlay10 : palette.overlay05,
                        },
                        pressed && styles.actionButtonPressed,
                      ]}>
                      <MaterialCommunityIcons
                        name={option.actionIcon}
                        size={scaleBySizeClass(17, sizeClass)}
                        color={
                          isActive
                            ? (option.activeTextColor ?? palette.textOnAccent)
                            : palette.textMuted
                        }
                      />
                    </Pressable>
                  )}
                </View>
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

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1, sizeClass, { rounding: 'none' }),
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      marginBottom: scaleBySizeClass(6, sizeClass),
    },
    requiredChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: scaleBySizeClass(7, sizeClass),
      paddingVertical: scaleBySizeClass(2, sizeClass),
    },
    requiredChipText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(0.3, sizeClass, { rounding: 'none' }),
    },
    container: {
      flexDirection: 'row',
      height: scaleBySizeClass(48, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
      overflow: 'hidden',
    },
    controlWrapper: {
      position: 'relative',
    },
    sideHighlightLayer: {
      ...StyleSheet.absoluteFill,
      borderRadius: scaleBySizeClass(10, sizeClass),
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
      ...StyleSheet.absoluteFill,
      borderRadius: scaleBySizeClass(10, sizeClass),
      overflow: 'hidden',
    },
    attentionBase: {
      ...StyleSheet.absoluteFill,
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
    },
    attentionRunner: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: scaleBySizeClass(22, sizeClass),
      height: scaleBySizeClass(5, sizeClass),
    },
    attentionRunnerOuter: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
      paddingHorizontal: scaleBySizeClass(1, sizeClass),
      paddingVertical: scaleBySizeClass(1, sizeClass),
    },
    attentionRunnerInner: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
    },
    separator: {
      width: 1,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    actionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      borderLeftWidth: 1,
    },
    actionButtonPressed: {
      opacity: 0.65,
    },
    editInput: {
      flex: 1,
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    labelLockSize: scaleBySizeClass(10, sizeClass),
  };
}

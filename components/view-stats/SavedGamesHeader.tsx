import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

const TITLE_FONT_SIZE: Record<SizeClass, number> = { small: 14, medium: 16, large: 20 };
const BACK_BUTTON_SIZE = 40;
// A text button, so this is unseen room: fits "Cancel" at the largest allowed text size, letting
// Select and Cancel share one width.
const SELECT_BUTTON_WIDTH = 64;
const SELECT_MAX_FONT_SCALE = 1.2;

interface SavedGamesHeaderProps {
  /** The shown team's name, or the screen name when there are no games. */
  title: string;
  /** Opens the team switcher; null when there is only one team to show. */
  onSwitchTeam: (() => void) | null;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onBack: () => void;
}

/**
 * Saved Games' own header: back, the team (a switcher pill when there are several), and
 * Select/Cancel. Both side buttons have fixed widths, so plain flex layout can center the title
 * and still give a long team name the room beside the narrower back button.
 */
export default function SavedGamesHeader({
  title,
  onSwitchTeam,
  selectionMode,
  onToggleSelectionMode,
  onBack,
}: SavedGamesHeaderProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  // A switchable team reads as the screen's main control, so it gets the primary text color.
  const titleColor = onSwitchTeam ? palette.textInverse : palette.textMuted;
  const titleText = (
    <ThemedText
      style={[styles.title, { color: titleColor }]}
      numberOfLines={1}
      ellipsizeMode="tail">
      {title}
    </ThemedText>
  );

  return (
    <View style={styles.header}>
      <Pressable
        testID="screen-header-back"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        hitSlop={scaleBySizeClass(12, sizeClass)}
        style={[styles.backButton, { backgroundColor: palette.overlay10 }]}>
        <MaterialCommunityIcons
          name="arrow-left"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.textInverse}
        />
      </Pressable>

      <View style={styles.titleArea}>
        {/* Makes up for the back button being narrower than Select, so the grow spacers center the
            title on the screen. It shrinks first when a long name needs the room. */}
        <View style={styles.sideOffset} />
        <View style={styles.centeringSpacer} />
        {onSwitchTeam ? (
          <Pressable
            testID="saved-games-team-switcher"
            accessibilityRole="button"
            accessibilityLabel={`${title}, switch team`}
            // Keeps a 44pt touch target at the header's 40pt button height.
            hitSlop={2}
            onPress={onSwitchTeam}
            style={({ pressed }) => [
              styles.teamSwitcher,
              { backgroundColor: pressed ? palette.overlay12 : palette.overlay08 },
            ]}>
            {titleText}
            <MaterialCommunityIcons
              name="chevron-down"
              size={scaleBySizeClass(24, sizeClass)}
              // Blue marks it as tappable, like the header's other actions.
              color={palette.accent}
            />
          </Pressable>
        ) : (
          titleText
        )}
        <View style={styles.centeringSpacer} />
      </View>

      <Pressable
        testID="header-action-select"
        accessibilityRole="button"
        accessibilityLabel={selectionMode ? 'Cancel selection' : 'Select games'}
        onPress={onToggleSelectionMode}
        hitSlop={12}
        style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}>
        <ThemedText
          style={[styles.selectLabel, { color: palette.accent }]}
          numberOfLines={1}
          maxFontSizeMultiplier={SELECT_MAX_FONT_SCALE}>
          {selectionMode ? 'Cancel' : 'Select'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  const buttonSize = scaleBySizeClass(BACK_BUTTON_SIZE, sizeClass);
  const selectWidth = scaleBySizeClass(SELECT_BUTTON_WIDTH, sizeClass);
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      paddingBottom: scaleBySizeClass(12, sizeClass),
    },
    backButton: {
      width: buttonSize,
      height: buttonSize,
      borderRadius: buttonSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sideOffset: {
      flexBasis: selectWidth - buttonSize,
      flexGrow: 0,
      // Shrinking is weighted by flexShrink × basis, so this needs to dwarf the title's ~1 × its width
      // for the spacer to give up its room before the title loses even a fraction of a point.
      flexShrink: 1e6,
    },
    centeringSpacer: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 0,
    },
    teamSwitcher: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
      minHeight: buttonSize,
      paddingLeft: scaleBySizeClass(16, sizeClass),
      paddingRight: scaleBySizeClass(10, sizeClass),
      borderRadius: 999,
    },
    title: {
      flexShrink: 1,
      fontSize: getSizeClassValue(TITLE_FONT_SIZE, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(2, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    selectButton: {
      width: selectWidth,
      height: buttonSize,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    selectLabel: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}

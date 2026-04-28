import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getGoalInfo,
  getLastTurnoverEvent,
  getPassChainEvents,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

interface TrackerBottomCardProps {
  pointElapsedMs: number;
  onStartNextPoint: () => void;
  onMorePress: () => void;
}

export const TrackerBottomCard = ({
  pointElapsedMs,
  onStartNextPoint,
  onMorePress,
}: TrackerBottomCardProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const insets = useSafeAreaInsets();
  const styles = cardStyles(sizeClass, isLandscape, palette, insets);

  const { currentGameId, savedGames, recordPickup, recordThrow, undoLastOperation } =
    useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const lastOppPossession =
    point?.possessions.filter((p) => p.sideId !== game.focusSideId).at(-1) ?? null;
  const lastFocusPossession =
    point?.possessions.filter((p) => p.sideId === game.focusSideId).at(-1) ?? null;
  const focusHasStarted =
    !!possession && possession.sideId === game.focusSideId && possession.actions.length > 0;

  // --- Opp action handlers ---
  const handleOppTurnover = async () => {
    if (!possession || isPossessionOver(possession)) {
      await recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    await recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
  };

  const handleOppScored = async () => {
    if (!possession || isPossessionOver(possession)) {
      await recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    await recordThrow({
      thrower: { refType: 'untracked' },
      result: 'goal',
      timerElapsedMs: pointElapsedMs,
    });
  };

  // --- Build content ---
  let headerBgColor = palette.overlay08;
  let headerContent: React.ReactNode = null;
  let bottomContent: React.ReactNode = null;

  if (pointIsOver) {
    const goalInfo = getGoalInfo(point, game.focusSideId, game.participants);

    // Header
    if (goalInfo?.isFocusGoal) {
      headerBgColor = palette.accentOverlay15; // light blue tint
      headerContent = (
        <View style={styles.headerRowGroup}>
          {goalInfo.assisterName && (
            <>
              <ThemedText
                numberOfLines={1}
                style={[styles.headerBold, { color: palette.textInverse }]}>
                {goalInfo.assisterName}
              </ThemedText>
              <ThemedText style={[styles.headerSep, { color: palette.textMuted }]}>+</ThemedText>
            </>
          )}
          {goalInfo.scorerName && (
            <ThemedText
              numberOfLines={1}
              style={[styles.headerBold, { color: palette.textInverse }]}>
              {goalInfo.scorerName}
            </ThemedText>
          )}
          <ThemedText style={[styles.headerSep, { color: palette.textMuted }]}>·</ThemedText>
          <ThemedText style={[styles.headerLabel, { color: palette.textInverse }]}>
            {goalInfo.isCallahan ? 'CALLAHAN' : 'GOAL'}
          </ThemedText>
        </View>
      );
    } else {
      headerBgColor = palette.dangerOverlay10;
      headerContent = (
        <ThemedText style={[styles.headerBold, { color: palette.danger }]}>
          {goalInfo ? 'OPP GOAL / POINT OVER' : 'POINT OVER'}
        </ThemedText>
      );
    }

    // Bottom
    bottomContent = (
      <Pressable
        style={({ pressed }) => [
          styles.fullWidthBtn,
          { backgroundColor: palette.successOverlay10 },
          pressed && { opacity: 0.7 },
        ]}
        onPress={onStartNextPoint}>
        <MaterialCommunityIcons
          name="arrow-right-circle"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.success}
          style={{ marginRight: 8 }}
        />
        <ThemedText style={[styles.btnText, { color: palette.success }]}>NEXT POINT</ThemedText>
      </Pressable>
    );
  } else if (oppHasDisc) {
    const turnoverEvent = getLastTurnoverEvent(lastFocusPossession, true, game.participants);

    // Header
    if (turnoverEvent) {
      let turnoverColor = palette.textMuted;
      if (!turnoverEvent.isFocusTurnover) {
        turnoverColor = palette.success;
        headerBgColor = palette.successOverlay10;
      } else if (turnoverEvent.isDropWithSplitAttribution) {
        turnoverColor = palette.warning;
        headerBgColor = palette.warningOverlay10;
      } else {
        turnoverColor = palette.danger;
        headerBgColor = palette.dangerOverlay10;
      }

      let responsibleContent = null;
      if (
        turnoverEvent.isDropWithSplitAttribution &&
        turnoverEvent.throwerName &&
        turnoverEvent.responsibleName
      ) {
        responsibleContent = (
          <>
            <ThemedText numberOfLines={1} style={[styles.headerLabel, { color: turnoverColor }]}>
              {turnoverEvent.throwerName}
            </ThemedText>
            <ThemedText style={[styles.headerSep, { color: turnoverColor }]}>+</ThemedText>
            <ThemedText numberOfLines={1} style={[styles.headerBold, { color: turnoverColor }]}>
              {turnoverEvent.responsibleName}
            </ThemedText>
            <ThemedText style={[styles.headerSep, { color: turnoverColor }]}>·</ThemedText>
          </>
        );
      } else if (turnoverEvent.responsibleName) {
        responsibleContent = (
          <>
            <ThemedText numberOfLines={1} style={[styles.headerBold, { color: turnoverColor }]}>
              {turnoverEvent.responsibleName}
            </ThemedText>
            <ThemedText style={[styles.headerSep, { color: turnoverColor }]}>·</ThemedText>
          </>
        );
      }

      headerContent = (
        <View style={styles.headerRowGroup}>
          {responsibleContent}
          <ThemedText numberOfLines={1} style={[styles.headerLabel, { color: turnoverColor }]}>
            {turnoverEvent.label}
          </ThemedText>
        </View>
      );
    } else {
      headerBgColor = palette.overlay08;
      headerContent = (
        <ThemedText style={[styles.headerLabel, { color: palette.textMuted }]}>DEFENSE</ThemedText>
      );
    }

    // Bottom
    bottomContent = (
      <View style={styles.btnRow}>
        <Pressable
          style={({ pressed }) => [
            styles.flexBtn,
            { backgroundColor: palette.success },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleOppTurnover}>
          <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.textOnAccent }]}>
            OPP TURN
          </ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.flexBtn,
            { backgroundColor: palette.danger },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleOppScored}>
          <ThemedText numberOfLines={1} style={[styles.btnText, { color: palette.textOnAccent }]}>
            OPP GOAL
          </ThemedText>
        </Pressable>
      </View>
    );
  } else {
    // Offense
    const passChainEvents = getPassChainEvents(possession, game.participants);
    let turnoverEvent: ReturnType<typeof getLastTurnoverEvent> = null;
    if (!focusHasStarted && !oppHasDisc && !pointIsOver) {
      turnoverEvent = getLastTurnoverEvent(lastOppPossession, false, game.participants);
    }

    // Header
    if (turnoverEvent) {
      // Just after opponent turned it
      let turnoverColor = palette.success;
      if (turnoverEvent.isFocusTurnover) {
        turnoverColor = palette.danger;
        headerBgColor = palette.dangerOverlay10;
      } else {
        headerBgColor = palette.successOverlay10;
      }

      headerContent = (
        <View style={styles.headerRowGroup}>
          {turnoverEvent.responsibleName && (
            <>
              <ThemedText numberOfLines={1} style={[styles.headerBold, { color: turnoverColor }]}>
                {turnoverEvent.responsibleName}
              </ThemedText>
              <ThemedText style={[styles.headerSep, { color: turnoverColor }]}>·</ThemedText>
            </>
          )}
          <ThemedText style={[styles.headerLabel, { color: turnoverColor }]}>
            {turnoverEvent.label}
          </ThemedText>
        </View>
      );
    } else if (passChainEvents.events.length > 0) {
      const lastTwo = passChainEvents.events.slice(-2);
      headerBgColor = palette.accentOverlay15; // Light blue like screenshot

      if (lastTwo.length === 2) {
        headerContent = (
          <View style={styles.headerRowGroup}>
            <ThemedText
              numberOfLines={1}
              style={[styles.headerLabel, { color: palette.textInverse }]}>
              {lastTwo[0].name}
            </ThemedText>
            <ThemedText style={[styles.headerSep, { color: palette.textMuted }]}>→</ThemedText>
            <ThemedText
              numberOfLines={1}
              style={[styles.headerBold, { color: palette.textInverse }]}>
              {lastTwo[1].name}
            </ThemedText>
          </View>
        );
      } else {
        headerContent = (
          <View style={styles.headerRowGroup}>
            <ThemedText style={[styles.headerLabel, { color: palette.textMuted }]}>
              PICKUP
            </ThemedText>
            <ThemedText style={[styles.headerSep, { color: palette.textMuted }]}>·</ThemedText>
            <ThemedText
              numberOfLines={1}
              style={[styles.headerBold, { color: palette.textInverse }]}>
              {lastTwo[0].name}
            </ThemedText>
          </View>
        );
      }
    } else {
      headerBgColor = palette.overlay08;
      headerContent = (
        <ThemedText style={[styles.headerLabel, { color: palette.textMuted }]}>
          WAITING FOR DISC
        </ThemedText>
      );
    }

    // Bottom: empty on offense
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.card}>
        <View style={[styles.topHeader, { backgroundColor: headerBgColor }]}>
          <Pressable
            onPress={async () => await undoLastOperation()}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons
              name="undo"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>

          <View style={styles.headerCenterContent}>{headerContent}</View>

          <Pressable
            onPress={onMorePress}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
        </View>

        {bottomContent && <View style={styles.bottomRow}>{bottomContent}</View>}
      </View>
    </View>
  );
};

function cardStyles(
  sizeClass: SizeClass,
  isLandscape: boolean,
  palette: Palette,
  insets: EdgeInsets,
) {
  return StyleSheet.create({
    outerContainer: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: isLandscape ? 12 : Math.max(Math.floor(insets.bottom * 0.7), 12),
      backgroundColor: 'transparent',
    },
    card: {
      backgroundColor: palette.cardBg,
      borderRadius: 12,
      borderCurve: 'continuous',
      overflow: 'hidden',
      // Subtle shadow matching screenshot style
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: palette.overlay08,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: scaleBySizeClass(48, sizeClass),
      paddingHorizontal: 8,
    },
    iconBtn: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenterContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    headerRowGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    headerBold: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    headerLabel: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    headerSep: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    bottomRow: {
      flexDirection: 'row',
      padding: 8,
      backgroundColor: palette.cardBg,
    },
    btnRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    flexBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaleBySizeClass(56, sizeClass),
      borderRadius: 8,
      borderCurve: 'continuous',
    },
    fullWidthBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaleBySizeClass(56, sizeClass),
      borderRadius: 8,
      borderCurve: 'continuous',
    },
    btnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}

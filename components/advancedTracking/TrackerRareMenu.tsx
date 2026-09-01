import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  BottomSheetActionRow,
  BottomSheetActionRowTone,
} from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getSafeDiscHolderRef,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

interface TrackerRareMenuProps {
  visible: boolean;
  onClose: () => void;
  setPassModifier: (m: PassModifier) => void;
}

type RareAction = {
  testID: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: BottomSheetActionRowTone;
  disabled?: boolean;
  onPress: () => void;
};

export const TrackerRareMenu = ({ visible, onClose, setPassModifier }: TrackerRareMenuProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { currentGame: game, recordCaptureIntent } = useAdvancedTrackingStore();
  if (!game) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const tracksBothSides = areBothSidesFullyTracked(game);
  const oppHasDisc = !tracksBothSides && !pointIsOver && activeSideId !== game.focusSideId;
  const trackedPossessionSideId = tracksBothSides
    ? (possession?.sideId ?? game.focusSideId)
    : game.focusSideId;
  const discHolderRef = getSafeDiscHolderRef(possession, trackedPossessionSideId, point);

  const handleOppBlock = () => {
    if (!discHolderRef || pointIsOver) return;
    recordCaptureIntent({ kind: 'block' });
  };

  const handleStall = () => {
    if (!discHolderRef || pointIsOver) return;
    recordCaptureIntent({ kind: 'stall' });
    setPassModifier(null);
  };

  const handleThrownCallahan = () => {
    if (!discHolderRef || pointIsOver) return;
    recordCaptureIntent({ kind: 'callahan', scorer: { refType: 'untracked' } });
    setPassModifier(null);
  };

  const closeAnd = (fn: () => void) => () => {
    onClose();
    fn();
  };

  function getActions(): RareAction[] {
    if (!pointIsOver && oppHasDisc) {
      return [
        {
          testID: 'rare-menu-pressure',
          label: 'Pressure',
          icon: 'shield-outline',
          tone: 'success',
          onPress: closeAnd(() => setPassModifier('pressure')),
        },
        {
          testID: 'rare-menu-callahan',
          label: 'Callahan',
          icon: 'shield-alert-outline',
          tone: 'success',
          onPress: closeAnd(() => setPassModifier('callahan')),
        },
        {
          testID: 'rare-menu-stall',
          label: 'Stall',
          icon: 'timer-alert-outline',
          tone: 'success',
          onPress: closeAnd(() => setPassModifier('stall')),
        },
      ];
    }

    if (!pointIsOver) {
      return [
        ...(tracksBothSides
          ? [
              {
                testID: 'rare-menu-pressure',
                label: 'Pressure',
                icon: 'shield-outline' as const,
                tone: 'success' as const,
                disabled: !discHolderRef,
                onPress: closeAnd(() => setPassModifier('pressure')),
              },
            ]
          : []),
        {
          testID: 'rare-menu-opp-d',
          label: tracksBothSides ? 'Block' : 'Opponent Block',
          icon: 'hand-front-left-outline',
          tone: 'danger',
          disabled: !discHolderRef,
          onPress: closeAnd(tracksBothSides ? () => setPassModifier('block') : handleOppBlock),
        },
        {
          testID: 'rare-menu-50-50',
          label: '50/50 (shared fault)',
          icon: 'scale-balance',
          tone: 'danger',
          disabled: !discHolderRef,
          onPress: closeAnd(() => setPassModifier('fifty-fifty')),
        },
        {
          testID: 'rare-menu-thrown-callahan',
          label: tracksBothSides ? 'Callahan' : 'Opponent Callahan',
          icon: 'shield-alert-outline',
          tone: 'danger',
          disabled: !discHolderRef,
          onPress: closeAnd(
            tracksBothSides ? () => setPassModifier('callahan') : handleThrownCallahan,
          ),
        },
        {
          testID: 'rare-menu-stall-offense',
          label: 'Stalled',
          icon: 'timer-alert-outline',
          tone: 'danger',
          disabled: !discHolderRef,
          onPress: closeAnd(tracksBothSides ? () => setPassModifier('stall') : handleStall),
        },
      ];
    }

    return [];
  }

  const actions = getActions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
        sheetStyle={[
          styles.sheet,
          {
            backgroundColor: palette.primary,
            borderColor: palette.overlay20,
            shadowColor: palette.shadow,
          },
        ]}
        minBottomPadding={10}>
        <View accessible={false} style={styles.content}>
          <View
            accessible={false}
            style={[styles.handle, { backgroundColor: palette.overlay20 }]}
          />

          <View
            accessible={false}
            style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <ThemedText style={[styles.title, { color: palette.textMuted }]}>
              RARE ACTIONS
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={getSizeClassValue({ small: 20, medium: 22, large: 24 }, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.list}>
            {actions.map((action) => (
              <BottomSheetActionRow
                key={action.testID}
                testID={action.testID}
                icon={action.icon}
                label={action.label}
                tone={action.tone}
                disabled={action.disabled}
                onPress={action.onPress}
              />
            ))}
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      marginHorizontal: 0,
      marginBottom: 0,
      borderTopLeftRadius: getSizeClassValue({ small: 18, medium: 22, large: 26 }, sizeClass),
      borderTopRightRadius: getSizeClassValue({ small: 18, medium: 22, large: 26 }, sizeClass),
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderCurve: 'continuous',
      borderTopWidth: 1,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
      elevation: 8,
      overflow: 'hidden',
    },
    content: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: '100%',
      paddingTop: getSizeClassValue({ small: 14, medium: 18, large: 22 }, sizeClass),
      paddingHorizontal: 0,
      paddingBottom: getSizeClassValue({ small: 8, medium: 10, large: 12 }, sizeClass),
      gap: getSizeClassValue({ small: 12, medium: 16, large: 20 }, sizeClass),
    },
    handle: {
      width: getSizeClassValue({ small: 30, medium: 38, large: 46 }, sizeClass),
      height: getSizeClassValue({ small: 4, medium: 5, large: 6 }, sizeClass),
      borderRadius: 999,
      alignSelf: 'center',
      marginBottom: getSizeClassValue({ small: 2, medium: 4, large: 6 }, sizeClass),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: getSizeClassValue({ small: 16, medium: 16, large: 20 }, sizeClass),
      paddingBottom: getSizeClassValue({ small: 12, medium: 14, large: 16 }, sizeClass),
      borderBottomWidth: 1,
      gap: 12,
    },
    title: {
      fontSize: getSizeClassValue({ small: 12, medium: 13, large: 15 }, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    list: {
      width: '100%',
      gap: getSizeClassValue({ small: 4, medium: 6, large: 8 }, sizeClass),
    },
  });
}

import { ReactNode } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';

interface BasicEntryOverlayProps {
  children: ReactNode;
  onDismiss: () => void;
  testID: string;
}

export function BasicEntryOverlay({ children, onDismiss, testID }: BasicEntryOverlayProps) {
  const { palette } = useTheme();

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape-left',
        'landscape-right',
      ]}
      onRequestClose={onDismiss}>
      <GestureHandlerRootView
        testID={`${testID}-gesture-root`}
        style={styles.modalRoot}
        unstable_forceActive>
        <BottomSheet
          testID={testID}
          onDismiss={onDismiss}
          overlayColor={palette.overlayDark40}
          sheetStyle={[
            styles.sheet,
            { backgroundColor: palette.modalBg, shadowColor: palette.shadow },
          ]}
          minBottomPadding={10}>
          {children}
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
});

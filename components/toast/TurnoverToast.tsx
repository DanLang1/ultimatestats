import TurnoverToastIcon from '@/components/toast/TurnoverToastIcon';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { useToastPulse } from '@/components/toast/hooks/useToastPulse';
import { TurnoverIconInfo } from '@/components/toast/hooks/useTurnoverRecordedToast';
import { Palette } from '@/theme/theme';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TurnoverToastData = {
  visible: boolean;
  message: string;
  tone: 'success' | 'danger';
  icon: TurnoverIconInfo;
};

interface TurnoverToastProps {
  toast: TurnoverToastData;
  toastInstanceId: number;
}

function getToneBg(tone: 'success' | 'danger', palette: Palette) {
  return tone === 'success' ? palette.success : palette.danger;
}

export default function TurnoverToast({ toast, toastInstanceId }: TurnoverToastProps) {
  const { isLandscape } = useLayout();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const animatedStyle = useToastPulse(toast.visible, toastInstanceId);

  if (!toast.visible) return null;

  const topOffset = insets.top + (isLandscape ? 68 : 14);

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View
        entering={SlideInUp.duration(200)}
        exiting={SlideOutUp.duration(150)}
        style={[
          styles.banner,
          animatedStyle,
          { backgroundColor: getToneBg(toast.tone, palette), shadowColor: palette.shadow },
        ]}>
        <TurnoverToastIcon icon={toast.icon} color={palette.textOnAccent} />
        <Text style={[styles.bannerText, { color: palette.textOnAccent }]} numberOfLines={1}>
          {toast.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 350,
  },
  banner: {
    width: '88%',
    maxWidth: 400,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },
});

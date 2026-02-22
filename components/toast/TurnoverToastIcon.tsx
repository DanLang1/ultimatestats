import { TurnoverIconInfo } from '@/components/toast/hooks/useTurnoverRecordedToast';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface TurnoverToastIconProps {
  icon: TurnoverIconInfo;
  color: string;
}

export default function TurnoverToastIcon({ icon, color }: TurnoverToastIconProps) {
  const { sizeClass } = useLayout();
  const fontAwesomeSize = scaleBySizeClass(16, sizeClass);
  const materialSize = scaleBySizeClass(18, sizeClass);

  if (icon.library === 'fontawesome5') {
    return <FontAwesome5 name={icon.name} size={fontAwesomeSize} color={color} />;
  }

  return (
    <MaterialCommunityIcons
      name={icon.name as keyof typeof MaterialCommunityIcons.glyphMap}
      size={materialSize}
      color={color}
    />
  );
}

import { TurnoverIconInfo } from '@/components/toast/hooks/useTurnoverRecordedToast';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface TurnoverToastIconProps {
  icon: TurnoverIconInfo;
  color: string;
}

export default function TurnoverToastIcon({ icon, color }: TurnoverToastIconProps) {
  if (icon.library === 'fontawesome5') {
    return <FontAwesome5 name={icon.name} size={16} color={color} />;
  }

  return (
    <MaterialCommunityIcons
      name={icon.name as keyof typeof MaterialCommunityIcons.glyphMap}
      size={18}
      color={color}
    />
  );
}

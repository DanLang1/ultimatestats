import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { EventIconInfo } from '@/components/toast/hooks/useEventToast';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';

interface EventToastIconProps {
  icon: EventIconInfo;
  color: string;
}

export default function EventToastIcon({ icon, color }: EventToastIconProps) {
  const { sizeClass } = useLayout();
  const fontAwesomeSize = scaleBySizeClass(16, sizeClass);
  const materialSize = scaleBySizeClass(18, sizeClass);

  if (icon.library === 'fontawesome5') {
    return <FontAwesome5 name={icon.name} size={fontAwesomeSize} color={color} />;
  }

  return <MaterialCommunityIcons name={icon.name} size={materialSize} color={color} />;
}

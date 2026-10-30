import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';

import { EventIconInfo } from '@/components/toast/hooks/useEventToast';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';

interface EventToastIconProps {
  icon: EventIconInfo;
  color: string;
}

export default function EventToastIcon({ icon, color }: EventToastIconProps) {
  const { sizeClass } = useLayout();
  const materialSize = scaleBySizeClass(18, sizeClass);

  return <MaterialCommunityIcons name={icon.name} size={materialSize} color={color} />;
}

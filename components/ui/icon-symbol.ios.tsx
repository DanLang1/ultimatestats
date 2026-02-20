import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  sizeClass = 'small',
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  sizeClass?: SizeClass;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const scaledSize = scaleBySizeClass(size, sizeClass);
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: scaledSize,
          height: scaledSize,
        },
        style,
      ]}
    />
  );
}

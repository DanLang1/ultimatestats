import React, { useRef } from 'react';
import { Pressable } from 'react-native';

interface TimelineInteractiveRowProps {
  canTap: boolean;
  onTap: () => void;
  canLongPress?: boolean;
  onLongPress?: () => void;
  children: React.ReactNode;
}

export default function TimelineInteractiveRow({
  canTap,
  onTap,
  canLongPress = false,
  onLongPress,
  children,
}: TimelineInteractiveRowProps) {
  const suppressNextPressRef = useRef(false);

  const handlePress = () => {
    if (suppressNextPressRef.current) {
      suppressNextPressRef.current = false;
      return;
    }
    onTap();
  };

  const handleLongPress = () => {
    suppressNextPressRef.current = true;
    onLongPress?.();
  };

  if (!canTap && !canLongPress) {
    return <>{children}</>;
  }

  return (
    <Pressable
      onPress={canTap ? handlePress : undefined}
      onLongPress={canLongPress ? handleLongPress : undefined}
      delayLongPress={400}>
      {children}
    </Pressable>
  );
}

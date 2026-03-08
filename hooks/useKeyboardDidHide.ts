import { useFocusEffect } from 'expo-router';
import { useRef } from 'react';
import { Keyboard } from 'react-native';

/**
 * Hook that calls a callback when the keyboard is hidden while the current
 * screen is focused.
 * This is needed because on Android, pressing the back button to dismiss
 * the keyboard doesn't trigger onBlur on TextInputs.
 */
export function useKeyboardDidHide(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useFocusEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      callbackRef.current();
    });
    return () => subscription.remove();
  });
}

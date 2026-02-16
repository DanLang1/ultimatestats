import { useEffect } from 'react';
import { Keyboard } from 'react-native';

/**
 * Hook that calls a callback when the keyboard is hidden.
 * This is needed because on Android, pressing the back button to dismiss
 * the keyboard doesn't trigger onBlur on TextInputs.
 */
export function useKeyboardDidHide(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const subscription = Keyboard.addListener('keyboardDidHide', callback);
    return () => subscription.remove();
  }, [callback, enabled]);
}

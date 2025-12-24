import { palette } from '@/theme/theme';
import React, { createContext, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = (alertOptions: AlertOptions) => {
    setOptions(alertOptions);
    setVisible(true);
  };

  const handleButtonPress = (button: AlertButton) => {
    setVisible(false);
    button.onPress?.();
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  const buttons = options?.buttons ?? [{ text: 'OK', style: 'default' }];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.title}>{options?.title}</Text>
            {options?.message && <Text style={styles.message}>{options.message}</Text>}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.button,
                    button.style === 'cancel' && styles.cancelButton,
                    button.style === 'destructive' && styles.destructiveButton,
                    button.style === 'default' && styles.defaultButton,
                    !button.style && styles.defaultButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleButtonPress(button)}>
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelButtonText,
                      button.style === 'destructive' && styles.destructiveButtonText,
                    ]}>
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    backgroundColor: palette.secondary,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.textInverse,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: palette.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: palette.accent,
  },
  cancelButton: {
    backgroundColor: palette.overlay10,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  destructiveButton: {
    backgroundColor: palette.danger,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.textInverse,
  },
  cancelButtonText: {
    color: palette.textInverse,
  },
  destructiveButtonText: {
    color: palette.textInverse,
  },
});

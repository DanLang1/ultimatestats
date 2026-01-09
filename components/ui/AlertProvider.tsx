import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { createContext, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive' | 'success';
  onPress?: () => void;
  icon?: React.ReactNode;
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  // For prompt mode
  prompt?: {
    placeholder?: string;
    defaultValue?: string;
    onSubmit: (value: string) => void;
  };
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
  const [inputValue, setInputValue] = useState('');
  const { palette } = useTheme();

  const showAlert = (alertOptions: AlertOptions) => {
    setOptions(alertOptions);
    setInputValue(alertOptions.prompt?.defaultValue || '');
    setVisible(true);
  };

  const handleButtonPress = (button: AlertButton) => {
    setVisible(false);
    button.onPress?.();
  };

  const handlePromptSubmit = () => {
    setVisible(false);
    options?.prompt?.onSubmit(inputValue);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  const buttons =
    options?.buttons ?? (options?.prompt ? [] : [{ text: 'OK', style: 'default' as const }]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.container,
              { backgroundColor: palette.secondary, borderColor: palette.overlay20 },
            ]}>
            {/* Close icon */}
            <Pressable
              style={[styles.closeButton, { backgroundColor: palette.overlay10 }]}
              onPress={handleDismiss}
              hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />
            </Pressable>

            <Text style={[styles.title, { color: palette.textInverse }]}>{options?.title}</Text>
            {options?.message && (
              <Text style={[styles.message, { color: palette.textMuted }]}>{options.message}</Text>
            )}
            {options?.prompt && (
              <TextInput
                style={[
                  styles.input,
                  {
                    color: palette.textInverse,
                    borderColor: palette.overlay20,
                    backgroundColor: palette.overlay05,
                  },
                ]}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={options.prompt.placeholder}
                placeholderTextColor={palette.textMuted}
                autoFocus
                selectTextOnFocus
              />
            )}
            <View style={styles.buttonContainer}>
              {options?.prompt ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                      styles.cancelButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleDismiss}>
                    <Text style={[styles.buttonText, { color: palette.textInverse }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: palette.accent },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handlePromptSubmit}>
                    <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>Export</Text>
                  </Pressable>
                </>
              ) : (
                buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  return (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.button,
                        isCancel && [
                          styles.cancelButton,
                          { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                        ],
                        button.style === 'destructive' && { backgroundColor: palette.danger },
                        button.style === 'success' && { backgroundColor: palette.success },
                        button.style === 'default' && { backgroundColor: palette.accent },
                        !button.style && { backgroundColor: palette.accent },
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => handleButtonPress(button)}>
                      <View style={styles.buttonContent}>
                        {button.icon}
                        <Text
                          style={[
                            styles.buttonText,
                            { color: isCancel ? palette.textInverse : palette.textOnAccent },
                          ]}>
                          {button.text}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
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
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

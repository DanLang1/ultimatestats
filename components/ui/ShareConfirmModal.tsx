import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

import { AlertModal } from './AlertModal';

interface ShareConfirmModalProps {
  visible: boolean;
  onConfirm: () => Promise<string>;
  errorMessage: string;
  onCancel: () => void;
  onCloseReady?: () => void;
}

export function ShareConfirmModal({
  visible,
  onConfirm,
  errorMessage,
  onCancel,
  onCloseReady,
}: ShareConfirmModalProps) {
  if (!visible) return null;

  return (
    <ShareConfirmModalContent
      onConfirm={onConfirm}
      errorMessage={errorMessage}
      onCancel={onCancel}
      onCloseReady={onCloseReady}
    />
  );
}

function ShareConfirmModalContent({
  onConfirm,
  errorMessage,
  onCancel,
  onCloseReady,
}: Omit<ShareConfirmModalProps, 'visible'>) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [didCopy, setDidCopy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleProceed = async () => {
    setIsLoading(true);
    setInlineError(null);
    try {
      const url = await onConfirm();
      if (url.trim().length > 0) {
        setShareUrl(url);
      }
      setDidCopy(false);
    } catch (error) {
      console.error('[ShareConfirmModal] share link creation failed', error);
      setInlineError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    if (shareUrl) {
      onCloseReady?.();
      return;
    }
    onCancel();
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setDidCopy(true);
  };

  const title = shareUrl ? 'Share Link Ready' : 'Share Data?';
  let primaryButtonLabel = 'Proceed';
  if (shareUrl) {
    primaryButtonLabel = didCopy ? 'Copied' : 'Copy';
  }

  return (
    <AlertModal visible title={title} onClose={handleCancel}>
      {shareUrl ? (
        <View style={styles.readyContent}>
          <View
            style={[
              styles.linkBox,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}>
            <ThemedText style={[styles.linkText, { color: palette.modalText }]} numberOfLines={2}>
              {shareUrl}
            </ThemedText>
          </View>
          <ThemedText style={[styles.body, styles.readyBody, { color: palette.textMuted }]}>
            Anyone with this link can view the shared data. The link expires after 30 days.
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedText style={[styles.body, { color: palette.textMuted }]}>
            By proceeding, anyone with the generated link can view your game/team data including
            names, lines, and stats.
          </ThemedText>
          <ThemedText style={[styles.body, { color: palette.textMuted }]}>
            The link expires after 30 days.
          </ThemedText>
          {inlineError && (
            <ThemedText style={[styles.errorText, { color: palette.danger }]}>
              {inlineError}
            </ThemedText>
          )}
        </>
      )}

      <View style={styles.buttonContainer}>
        {shareUrl ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleCancel}>
            <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Close</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
              pressed && !isLoading && styles.buttonPressed,
              isLoading && { opacity: 0.5 },
            ]}
            onPress={handleCancel}
            disabled={isLoading}>
            <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
              Cancel
            </ThemedText>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.accent },
            pressed && !isLoading && styles.buttonPressed,
            isLoading && { opacity: 0.8 },
          ]}
          onPress={shareUrl ? handleCopy : handleProceed}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={palette.textOnAccent} />
          ) : (
            <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
              {primaryButtonLabel}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </AlertModal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    body: {
      fontSize: scaleBySizeClass(14, sizeClass),
      lineHeight: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
      marginBottom: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    errorText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
      textAlign: 'center',
      marginBottom: 16,
      fontFamily: Fonts.semiBold,
    },
    readyContent: {
      gap: 14,
    },
    readyBody: {
      marginBottom: 4,
    },
    linkBox: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
    },
    linkText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    cancelButton: {
      borderWidth: 1,
    },
    buttonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  });
}

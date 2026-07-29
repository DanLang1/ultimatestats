import {
  ShareConfirmModalContent,
  type ShareConfirmModalContentProps,
} from './ShareConfirmModalContent';

export interface ShareConfirmModalProps extends ShareConfirmModalContentProps {
  visible: boolean;
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

import { DateTimePicker, type DateTimePickerProps } from '@expo/ui/community/datetime-picker';
import { StyleSheet } from 'react-native';

type AndroidPickerDialogProps = Omit<DateTimePickerProps, 'presentation' | 'style'>;

// Opens on mount; the caller unmounts it from onValueChange and onDismiss.
export function AndroidPickerDialog(props: AndroidPickerDialogProps) {
  return <DateTimePicker {...props} presentation="dialog" style={styles.dialogHost} />;
}

const styles = StyleSheet.create({
  // The dialog still mounts an empty host view; keep it out of flow so parent `gap` ignores it.
  dialogHost: { position: 'absolute' },
});

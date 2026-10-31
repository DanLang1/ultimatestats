import { type DateTimePickerChangeEvent } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';

import { AndroidPickerDialog } from '@/components/ui/AndroidPickerDialog';

interface AndroidDateTimeDialogProps {
  value: Date;
  minimumDate: Date;
  maximumDate: Date;
  accentColor: string;
  onValueChange: (event: DateTimePickerChangeEvent, date: Date) => void;
  onClose: () => void;
}

// Android has no combined date-and-time dialog, so the date dialog hands off to a time dialog.
// The caller unmounts this component from onClose.
export function AndroidDateTimeDialog({
  value,
  minimumDate,
  maximumDate,
  accentColor,
  onValueChange,
  onClose,
}: AndroidDateTimeDialogProps) {
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  // Distinct keys give each step a fresh host, so the time dialog opens on its own mount.
  if (!pickedDate) {
    return (
      <AndroidPickerDialog
        key="date"
        mode="date"
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        accentColor={accentColor}
        onValueChange={(_event, date) => setPickedDate(date)}
        onDismiss={onClose}
      />
    );
  }

  return (
    <AndroidPickerDialog
      key="time"
      mode="time"
      is24Hour={false}
      value={pickedDate}
      accentColor={accentColor}
      onValueChange={(event, date) => {
        onClose();
        onValueChange(event, date);
      }}
      onDismiss={onClose}
    />
  );
}

import { AdvancedGameNoteModal } from './AdvancedGameNoteModal';

interface AdvancedPointNoteModalProps {
  initialNote?: string;
  context?: string;
  onClose: () => void;
  onSave: (note: string) => void | Promise<void>;
}

export function AdvancedPointNoteModal(props: AdvancedPointNoteModalProps) {
  return <AdvancedGameNoteModal {...props} title="Point Note" testIDPrefix="advanced-point-note" />;
}

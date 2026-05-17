import type { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareFileAndDelete(file: File): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return false;
    }

    await Sharing.shareAsync(file.uri);
    return true;
  } finally {
    try {
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Cache cleanup is best-effort and should not mask sharing errors.
    }
  }
}

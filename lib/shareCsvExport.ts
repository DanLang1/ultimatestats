import { File, Paths } from 'expo-file-system';

import type { AlertOptions } from '@/components/ui/AlertProvider';
import { reportError } from '@/lib/sentry';
import { shareFileAndDelete } from '@/lib/shareFileAndDelete';

export interface CsvExport {
  csv: string;
  /** File name without the `.csv` extension. */
  filename: string;
}

/**
 * Writes a CSV export to the cache, opens the share sheet, and alerts when sharing is
 * unavailable or any step fails.
 */
export async function shareCsvExport(
  buildExport: () => CsvExport,
  showAlert: (options: AlertOptions) => void,
): Promise<void> {
  try {
    const { csv, filename } = buildExport();
    const file = new File(Paths.cache, `${filename}.csv`);
    file.write(csv);

    if (await shareFileAndDelete(file)) {
      return;
    }

    showAlert({
      title: 'Sharing not available',
      message: 'Sharing is not available on this device.',
    });
  } catch (error) {
    reportError('csv-export', error);
    showAlert({
      title: 'Export failed',
      message: 'Could not export stats to CSV.',
    });
  }
}

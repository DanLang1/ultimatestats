import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { shareFileAndDelete } from '../shareFileAndDelete';

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    exists = true;
    constructor(uri: string) {
      this.uri = uri;
    }
    delete() {
      this.exists = false;
    }
  },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const isAvailable = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);

describe('shareFileAndDelete', () => {
  beforeEach(() => {
    isAvailable.mockResolvedValue(true);
    share.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the export until sharing finishes, then removes it', async () => {
    const file = new File('file:///cache/stats.csv');
    let finishSharing!: () => void;
    share.mockImplementationOnce(
      async () =>
        new Promise<void>((resolve) => {
          finishSharing = resolve;
        }),
    );
    const result = shareFileAndDelete(file);
    // Availability resolves before the share sheet opens.
    await Promise.resolve();
    expect(share).toHaveBeenCalledWith(file.uri);
    expect(file.exists).toBe(true);
    finishSharing();
    await expect(result).resolves.toBe(true);
    expect(file.exists).toBe(false);
  });

  it('removes the export without opening a share sheet when sharing is unavailable', async () => {
    isAvailable.mockResolvedValueOnce(false);
    const file = new File('file:///cache/stats.csv');
    await expect(shareFileAndDelete(file)).resolves.toBe(false);
    expect(share).not.toHaveBeenCalled();
    expect(file.exists).toBe(false);
  });

  it.each(['availability', 'sharing'] as const)('cleans up after a %s failure', async (stage) => {
    const error = new Error('Native sharing failed');
    if (stage === 'availability') isAvailable.mockRejectedValueOnce(error);
    else share.mockRejectedValueOnce(error);
    const file = new File('file:///cache/stats.csv');
    await expect(shareFileAndDelete(file)).rejects.toBe(error);
    expect(file.exists).toBe(false);
  });

  it('does not delete a file already removed by the share destination', async () => {
    const file = new File('file:///cache/stats.csv');
    share.mockImplementationOnce(async () => {
      file.delete();
    });
    const remove = jest.spyOn(file, 'delete');
    await expect(shareFileAndDelete(file)).resolves.toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'cleanup failure preserves the sharing outcome (failed: %s)',
    async (failed) => {
      const file = new File('file:///cache/stats.csv');
      jest.spyOn(file, 'delete').mockImplementationOnce(() => {
        throw new Error('Cleanup failed');
      });
      const error = new Error('Sharing failed');
      if (failed) share.mockRejectedValueOnce(error);
      const result = shareFileAndDelete(file);
      if (failed) await expect(result).rejects.toBe(error);
      else await expect(result).resolves.toBe(true);
    },
  );
});

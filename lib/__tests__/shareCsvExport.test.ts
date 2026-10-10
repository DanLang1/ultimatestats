import { File, Paths } from 'expo-file-system';

import { shareCsvExport } from '../shareCsvExport';
import { shareFileAndDelete } from '../shareFileAndDelete';

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: jest.fn(),
}));
jest.mock('../shareFileAndDelete', () => ({ shareFileAndDelete: jest.fn() }));

const share = jest.mocked(shareFileAndDelete);
const write = jest.fn();
const showAlert = jest.fn();
const buildExport = () => ({ csv: 'a,b', filename: 'stats' });

describe('shareCsvExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(File).mockImplementation(() => ({ write }) as unknown as File);
    share.mockResolvedValue(true);
  });

  it('writes the CSV to the cache and shares it without alerting', async () => {
    await shareCsvExport(buildExport, showAlert);
    expect(File).toHaveBeenCalledWith(Paths.cache, 'stats.csv');
    expect(write).toHaveBeenCalledWith('a,b');
    expect(share).toHaveBeenCalledTimes(1);
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('alerts when sharing is unavailable on the device', async () => {
    share.mockResolvedValueOnce(false);
    await shareCsvExport(buildExport, showAlert);
    expect(showAlert).toHaveBeenCalledWith({
      title: 'Sharing not available',
      message: 'Sharing is not available on this device.',
    });
  });

  it.each([
    [
      'building the CSV',
      () => {},
      () => {
        throw new Error('bad csv');
      },
    ],
    [
      'writing the file',
      () =>
        write.mockImplementationOnce(() => {
          throw new Error('Cache full');
        }),
      buildExport,
    ],
    ['sharing', () => share.mockRejectedValueOnce(new Error('Native sharing failed')), buildExport],
  ] as const)('alerts when %s fails', async (_stage, arrange, build) => {
    arrange();
    await shareCsvExport(build, showAlert);
    expect(showAlert).toHaveBeenCalledTimes(1);
    expect(showAlert).toHaveBeenCalledWith({
      title: 'Export failed',
      message: 'Could not export stats to CSV.',
    });
  });
});

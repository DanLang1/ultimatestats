export class SavedGamesStorageCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SavedGamesStorageCorruptionError';
  }
}

export function isSavedGamesStorageCorruptionError(
  error: unknown,
): error is SavedGamesStorageCorruptionError {
  return error instanceof SavedGamesStorageCorruptionError;
}

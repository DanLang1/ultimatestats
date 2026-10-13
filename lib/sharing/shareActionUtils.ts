import { ShareUploadError } from './share';
import { InvalidSharePayloadError } from './validate';

export type PendingShareAction = (() => Promise<string>) | null;

export const SHARE_DATA_UPLOAD_ERROR_MESSAGE =
  'Could not upload data for sharing. Please try again.';
export const SHARE_TEAM_UPLOAD_ERROR_MESSAGE =
  'Could not upload team for sharing. Please try again.';
export const SHARE_TOO_LARGE_ERROR_MESSAGE =
  'This is more data than one share link supports. If you selected several games, try sharing fewer at once.';
export const SHARE_NETWORK_ERROR_MESSAGE =
  "Couldn't reach the share server. Check your connection and try again.";
export const SHARE_INVALID_DATA_ERROR_MESSAGE =
  "Some of this data couldn't be prepared for sharing.";

function isTooLargeError(error: unknown): boolean {
  return (
    (error instanceof InvalidSharePayloadError && error.reason === 'exceeds-limit') ||
    (error instanceof ShareUploadError && error.reason === 'too-large')
  );
}

/** Maps a failed share upload to user-facing copy; `fallbackMessage` covers server and unknown errors. */
export function getShareUploadErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isTooLargeError(error)) return SHARE_TOO_LARGE_ERROR_MESSAGE;
  if (error instanceof ShareUploadError && error.reason === 'network') {
    return SHARE_NETWORK_ERROR_MESSAGE;
  }
  if (error instanceof InvalidSharePayloadError) return SHARE_INVALID_DATA_ERROR_MESSAGE;
  return fallbackMessage;
}

/**
 * Offline failures and local data over the share limits are expected outcomes. Malformed local data
 * is still reported because it means our own records fail our validation, and server size refusals
 * are reported with the payload length until uploads are size-checked before sending.
 */
export function getShareUploadErrorReport(
  error: unknown,
): { shouldReport: false } | { shouldReport: true; extra?: Record<string, unknown> } {
  if (error instanceof InvalidSharePayloadError && error.reason === 'exceeds-limit') {
    return { shouldReport: false };
  }
  if (!(error instanceof ShareUploadError)) return { shouldReport: true };
  if (error.reason === 'network') return { shouldReport: false };
  return {
    shouldReport: true,
    extra: {
      status: error.status,
      code: error.code,
      payloadLength: error.payloadLength,
    },
  };
}

export function runPendingShareAction(shareAction: PendingShareAction): Promise<string> {
  if (!shareAction) {
    throw new Error('Missing pending share action.');
  }

  return shareAction();
}

export type PendingShareAction = (() => Promise<string>) | null;

export const SHARE_DATA_UPLOAD_ERROR_MESSAGE =
  'Could not upload data for sharing. Please try again.';
export const SHARE_TEAM_UPLOAD_ERROR_MESSAGE =
  'Could not upload team for sharing. Please try again.';

export function runPendingShareAction(shareAction: PendingShareAction): Promise<string> {
  if (!shareAction) {
    throw new Error('Missing pending share action.');
  }

  return shareAction();
}

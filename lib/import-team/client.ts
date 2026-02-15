import { callImportTeamApi } from '@/lib/api/importTeamApi';
import {
  ImportApiErrorPayload,
  ImportApiPayload,
  ImportApiSuccessPayload,
  NameFormatOption,
} from '@/lib/import-team/types';

type ImportTeamApiResponse = {
  requestUrl: string;
  status: number;
  ok: boolean;
  payload: ImportApiPayload;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isImportApiErrorPayload(payload: ImportApiPayload): payload is ImportApiErrorPayload {
  return isRecord(payload) && ('message' in payload || 'detail' in payload);
}

function parseApiPayload(responseText: string): ImportApiPayload {
  try {
    return JSON.parse(responseText) as ImportApiPayload;
  } catch {
    return responseText;
  }
}

export function isImportApiSuccessPayload(
  payload: ImportApiPayload,
): payload is ImportApiSuccessPayload {
  if (!isRecord(payload)) {
    return false;
  }

  if (!('players' in payload) || !Array.isArray(payload.players)) {
    return false;
  }

  return payload.players.every(
    (player) =>
      isRecord(player) &&
      typeof player.name === 'string' &&
      (player.position === undefined || typeof player.position === 'string') &&
      (player.pronouns === undefined || typeof player.pronouns === 'string'),
  );
}

export function extractApiErrorMessage(payload: ImportApiPayload): string | undefined {
  if (typeof payload === 'string') {
    return payload;
  }
  if (!payload || !isImportApiErrorPayload(payload)) {
    return undefined;
  }
  if (typeof payload.message === 'string') {
    return payload.message;
  }
  if (typeof payload.detail === 'string') {
    return payload.detail;
  }
  if (isRecord(payload.detail) && typeof payload.detail.message === 'string') {
    return payload.detail.message;
  }
  return undefined;
}

export async function fetchImportTeamPayload(
  teamLink: string,
  nameFormat: NameFormatOption,
): Promise<ImportTeamApiResponse> {
  const response = await callImportTeamApi(teamLink, nameFormat);
  const payload = parseApiPayload(response.responseText);

  return {
    requestUrl: response.requestUrl,
    status: response.status,
    ok: response.ok,
    payload,
  };
}

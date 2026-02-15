import { NameFormatOption } from '@/lib/import-team/types';

// Local dev endpoint:
// const IMPORT_API_URL = 'http://127.0.0.1:8000/scrape';
const IMPORT_API_URL = 'https://ustatscraper-831518529550.us-central1.run.app/scrape';
const IMPORT_API_KEY = process.env.EXPO_PUBLIC_IMPORT_API_KEY;

export type ImportTeamApiRawResponse = {
  requestUrl: string;
  status: number;
  ok: boolean;
  responseText: string;
};

export async function callImportTeamApi(
  teamLink: string,
  nameFormat: NameFormatOption,
): Promise<ImportTeamApiRawResponse> {
  const query = `?url=${encodeURIComponent(teamLink)}&format=${encodeURIComponent(nameFormat)}`;
  const requestUrl = `${IMPORT_API_URL}${query}`;

  const headers: Record<string, string> = {};
  if (IMPORT_API_KEY) {
    headers['X-API-Key'] = IMPORT_API_KEY;
  }

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers,
  });

  return {
    requestUrl,
    status: response.status,
    ok: response.ok,
    responseText: await response.text(),
  };
}

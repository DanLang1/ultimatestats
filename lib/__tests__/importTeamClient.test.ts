import {
  extractApiErrorMessage,
  fetchImportTeamPayload,
  isImportApiSuccessPayload,
} from '../import-team/client';
import type { ImportApiPayload } from '../import-team/types';

describe('team import API boundary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('encodes the source URL and parses the returned roster', async () => {
    const payload = { players: [{ name: 'Sam', position: 'Handler', pronouns: 'they/them' }] };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    const source = 'https://example.com/team?id=5&name=Chicago Union';
    const result = await fetchImportTeamPayload(source, 'first');
    const request = new URL(result.requestUrl);
    expect(request.searchParams.get('url')).toBe(source);
    expect(request.searchParams.get('format')).toBe('first');
    expect(fetchMock).toHaveBeenCalledWith(result.requestUrl, {
      method: 'GET',
      headers: expect.any(Object),
    });
    expect(result).toMatchObject({ status: 200, ok: true, payload });
    expect(isImportApiSuccessPayload(result.payload)).toBe(true);
  });

  it.each([undefined, 'test-import-key'])(
    'sends the configured API credential only when present (%s)',
    async (apiKey) => {
      jest.replaceProperty(process, 'env', {
        ...process.env,
        EXPO_PUBLIC_IMPORT_API_KEY: apiKey,
      });
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response('{"players":[]}', { status: 200 }));
      await jest.isolateModulesAsync(async () => {
        const { callImportTeamApi } =
          jest.requireActual<typeof import('../api/importTeamApi')>('../api/importTeamApi');
        await callImportTeamApi('https://example.com/team', 'full');
      });
      expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
        method: 'GET',
        headers: apiKey ? { 'X-API-Key': 'test-import-key' } : {},
      });
    },
  );

  it.each([
    ['Service unavailable', 'Service unavailable'],
    [JSON.stringify({ detail: { message: 'Roster is private' } }), 'Roster is private'],
  ])('preserves an unsuccessful response for actionable feedback: %s', async (body, message) => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(body, { status: 503 }));
    const result = await fetchImportTeamPayload('https://example.com/team', 'full');
    expect(result.status).toBe(503);
    expect(result.ok).toBe(false);
    expect(extractApiErrorMessage(result.payload)).toBe(message);
  });

  it('propagates network failure rather than returning an empty roster', async () => {
    const error = new Error('Offline');
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(error);
    await expect(fetchImportTeamPayload('https://example.com/team', 'last')).rejects.toBe(error);
  });

  it.each([
    null,
    'unavailable',
    {},
    { players: {} },
    { players: [null] },
    { players: [{ name: 42 }] },
    { players: [{ name: 'Sam', position: 42 }] },
    { players: [{ name: 'Sam', pronouns: false }] },
  ])('rejects malformed roster payload %j', (payload) => {
    // Network payloads can violate the compile-time API type.
    expect(isImportApiSuccessPayload(payload as ImportApiPayload)).toBe(false);
  });

  it('accepts roster entries without optional position or pronouns', () => {
    expect(isImportApiSuccessPayload({ players: [{ name: 'Sam' }] })).toBe(true);
  });

  it.each([
    [{ message: 'Primary message', detail: 'Secondary message' }, 'Primary message'],
    [{ detail: 'Team not found' }, 'Team not found'],
    [null, undefined],
    [{ players: [] }, undefined],
    [{ detail: {} }, undefined],
  ])('extracts the best available server error from %j', (payload, expected) => {
    expect(extractApiErrorMessage(payload)).toBe(expected);
  });
});

import { createSavedBasicGame, testTeam } from '@/test/fixtures/domain';

import { serializeGame, serializeGames, serializeTeam } from '../sharing/serialize';
import { fetchPayload, SharePayloadNotFoundError, uploadPayload } from '../sharing/share';
import { runPendingShareAction } from '../sharing/shareActionUtils';
import {
  fetchShowcaseList,
  fetchShowcasePayload,
  incrementShowcaseImportCount,
} from '../sharing/showcase';
import type { LinePreset } from '../storage/types';

jest.mock('@/lib/supabase', () => {
  const { createClient } =
    jest.requireActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');
  return {
    supabase: createClient('https://example.supabase.co', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (...args) => global.fetch(...args) },
    }),
  };
});

function respond(data: unknown, status = 200) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function requestedUrl(fetchMock: jest.SpyInstance): URL {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

describe('sharing transport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads the snapshot and returns a link identifying the stored record', async () => {
    const payload = serializeGame(createSavedBasicGame());
    const fetchMock = respond(null, 201);
    const result = await uploadPayload(payload);
    expect(result.id).toMatch(/^[a-z0-9]{6}$/);
    expect(result.url).toBe(`https://u-stat.app/s/game/${result.id}`);
    expect(requestedUrl(fetchMock).pathname).toBe('/rest/v1/shared_payloads');
    const request = fetchMock.mock.calls[0][1]!;
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body as string)).toEqual({ id: result.id, type: 'game', payload });
  });

  it('rejects an upload when storage refuses it', async () => {
    respond({ message: 'Permission denied' }, 403);
    await expect(uploadPayload(serializeTeam(testTeam, []))).rejects.toThrow(
      'Failed to upload shared payload: Permission denied',
    );
  });

  it('downloads only the requested record and validates its envelope', async () => {
    const payload = serializeTeam(testTeam, []);
    const fetchMock = respond({ payload: { ...payload, appVersion: 123 } });
    await expect(fetchPayload('abc123')).resolves.toMatchObject({
      type: 'team',
      appVersion: '',
      data: testTeam,
    });
    expect(requestedUrl(fetchMock).searchParams.get('id')).toBe('eq.abc123');
    expect(requestedUrl(fetchMock).searchParams.get('select')).toBe('payload');
  });

  it('rejects corrupt downloaded data instead of returning it to the importer', async () => {
    respond({ payload: { ...serializeTeam(testTeam, []), data: null } });
    await expect(fetchPayload('abc123')).rejects.toThrow('Invalid team: missing data');
  });

  it('distinguishes a share ID with no stored record', async () => {
    respond(
      { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      406,
    );
    await expect(fetchPayload('abc123')).rejects.toBeInstanceOf(SharePayloadNotFoundError);
  });

  it('reports a failed shared record request', async () => {
    respond({ message: 'Record not found' }, 404);
    await expect(fetchPayload('abc123')).rejects.toThrow(
      'Failed to fetch shared payload: Record not found',
    );
  });

  it('rejects an absent pending action', () => {
    expect(() => runPendingShareAction(null)).toThrow('Missing pending share action');
  });
});

describe('showcase transport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests only published games ordered by popularity then recency', async () => {
    const fetchMock = respond([]);
    await expect(fetchShowcaseList()).resolves.toEqual([]);
    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/rest/v1/showcase_games');
    expect(url.searchParams.get('is_published')).toBe('eq.true');
    expect(url.searchParams.get('order')).toBe('import_count.desc,created_at.desc');
  });

  it('requires a published record when downloading a showcase game', async () => {
    const payload = serializeGame(createSavedBasicGame());
    const fetchMock = respond({ payload });
    await expect(fetchShowcasePayload('showcase-1')).resolves.toEqual(payload);
    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get('id')).toBe('eq.showcase-1');
    expect(url.searchParams.get('is_published')).toBe('eq.true');
  });

  it.each([serializeTeam(testTeam, []), serializeGames([createSavedBasicGame()])])(
    'rejects a %s payload in the single-game showcase',
    async (payload) => {
      respond({ payload });
      await expect(fetchShowcasePayload('showcase-1')).rejects.toThrow(
        'Expected a single game payload in showcase',
      );
    },
  );

  it.each([
    ['list', () => fetchShowcaseList()],
    ['download', () => fetchShowcasePayload('showcase-1')],
  ] as const)('propagates a showcase %s failure', async (_operation, fetchData) => {
    respond({ message: 'Permission denied' }, 403);
    await expect(fetchData()).rejects.toThrow('Permission denied');
  });

  it('increments the requested showcase import count through the server operation', async () => {
    let requestStarted!: () => void;
    const requested = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      requestStarted();
      return new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    incrementShowcaseImportCount('showcase-1');
    await requested;
    expect(requestedUrl(fetchMock).pathname).toBe('/rest/v1/rpc/increment_showcase_import_count');
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ p_id: 'showcase-1' });
  });
});

describe('team share presets', () => {
  it('includes only the shared team presets and omits the field when none match', () => {
    const selected: LinePreset = {
      id: 'line-1',
      teamId: testTeam.id,
      name: 'Offense',
      playerIds: ['player-alex'],
    };
    const other: LinePreset = { ...selected, id: 'line-2', teamId: 'other-team' };
    expect(serializeTeam(testTeam, [other, selected])).toMatchObject({ presets: [selected] });
    expect(serializeTeam(testTeam, [other])).not.toHaveProperty('presets');
  });
});

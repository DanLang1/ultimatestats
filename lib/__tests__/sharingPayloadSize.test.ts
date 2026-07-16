import {
  CURRENT_SCHEMA_VERSION,
  GameEvent,
  Player,
  PointLineRecord,
  SavedGame,
  SavedTeam,
} from '@/lib/storage';
import { generateId } from '@/lib/utils';

/**
 * Measure realistic SharedPayload sizes to determine whether
 * a backend is needed for the sharing feature, or if payloads
 * are small enough to share without one (e.g. file attachment).
 */

function makePlayer(name: string): Player {
  return {
    id: generateId(),
    name,
    isActive: true,
    matchingType: Math.random() > 0.5 ? 'fmp' : 'mmp',
    role: (['handler', 'cutter', 'hybrid'] as const)[Math.floor(Math.random() * 3)],
  };
}

function makeTeam(name: string, playerCount: number): SavedTeam {
  const roster = Array.from({ length: playerCount }, (_, i) => makePlayer(`Player ${i + 1}`));
  return { id: generateId(), name, roster };
}

function makeGameEvents(team: SavedTeam, pointCount: number): GameEvent[] {
  const events: GameEvent[] = [];
  const gameId = generateId();
  const roster = team.roster;

  for (let point = 0; point < pointCount; point++) {
    // Simulate 2-4 turnovers per point
    const turnovers = Math.floor(Math.random() * 3) + 1;
    for (let t = 0; t < turnovers; t++) {
      const subtypes: GameEvent['type'] extends 'turnover'
        ? never
        : ('block' | 'throwaway' | 'drop' | 'fiftyfifty')[] = [
        'block',
        'throwaway',
        'drop',
        'fiftyfifty',
      ];
      const subtype = subtypes[Math.floor(Math.random() * subtypes.length)];
      const team1Turn = Math.random() > 0.5;
      events.push({
        type: 'turnover',
        team: team1Turn ? 'team1' : 'team2',
        subtype,
        playerId: roster[Math.floor(Math.random() * roster.length)].id,
        player2Id:
          subtype === 'fiftyfifty' ? roster[Math.floor(Math.random() * roster.length)].id : null,
        gameId,
        elapsedMs: point * 180000 + t * 30000 + Math.floor(Math.random() * 20000),
      });
    }

    // Goal to end the point
    const scorer = roster[Math.floor(Math.random() * roster.length)];
    const assister = roster.filter((p) => p.id !== scorer.id)[
      Math.floor(Math.random() * (roster.length - 1))
    ];
    events.push({
      type: 'goal',
      team: Math.random() > 0.4 ? 'team1' : 'team2',
      goalPlayerId: scorer.id,
      assistPlayerId: assister.id,
      gameId,
      elapsedMs: point * 180000 + turnovers * 30000 + Math.floor(Math.random() * 20000),
    });
  }

  return events;
}

function makePointLines(team: SavedTeam, pointCount: number): PointLineRecord[] {
  const roster = team.roster;
  return Array.from({ length: pointCount }, (_, i) => ({
    pointNumber: i + 1,
    playerIds: roster
      .slice(0, 7)
      .map((p) => p.id)
      .sort(() => Math.random() - 0.5),
    timestamp: Date.now() - (pointCount - i) * 180000,
  }));
}

function makePointStartTimestamps(pointCount: number): Record<number, number> {
  const timestamps: Record<number, number> = {};
  for (let i = 1; i <= pointCount; i++) {
    timestamps[i] = Date.now() - (pointCount - i) * 180000;
  }
  return timestamps;
}

function makeSavedGame(opts: { rosterSize: number; pointCount: number }): SavedGame {
  const team1 = makeTeam('Thunderbirds', opts.rosterSize);
  const events = makeGameEvents(team1, opts.pointCount);
  const halfScore = Math.floor(opts.pointCount / 2);

  return {
    id: generateId(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: Date.now(),
    team1,
    team2Name: 'Rival Squad',
    team1Score: halfScore + Math.floor(Math.random() * 3),
    team2Score: opts.pointCount - halfScore - Math.floor(Math.random() * 3),
    events,
    gameTo: 15,
    startingPossession: 'team1',
    pointStartTimestamps: makePointStartTimestamps(opts.pointCount),
    pointLines: makePointLines(team1, opts.pointCount),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

describe('Sharing Payload Size Measurement', () => {
  const scenarios = [
    { label: 'Short game (11 points, 14 players)', rosterSize: 14, pointCount: 11 },
    { label: 'Normal game (25 points, 14 players)', rosterSize: 14, pointCount: 25 },
    { label: 'Long game (35 points, 20 players)', rosterSize: 20, pointCount: 35 },
    { label: 'Marathon game (45 points, 25 players)', rosterSize: 25, pointCount: 45 },
  ];

  it.each(scenarios)('$label', ({ rosterSize, pointCount }) => {
    const game = makeSavedGame({ rosterSize, pointCount });

    const payload = {
      type: 'game' as const,
      appVersion: '1.0.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      sharedAt: Date.now(),
      data: game,
    };
    const payloadJson = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadJson).length;

    // Sanity check - should be under 100KB even for extreme cases
    expect(payloadBytes).toBeLessThan(100 * 1024);
  });

  it('Team-only payload', () => {
    const team = makeTeam('Thunderbirds', 20);
    const payload = {
      type: 'team' as const,
      appVersion: '1.0.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      sharedAt: Date.now(),
      data: team,
    };
    const payloadJson = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadJson).length;

    console.log(`\n--- Team only (20 players) ---`);
    console.log(`SharedPayload JSON: ${formatBytes(payloadBytes)}`);
    console.log(`Base64 (for URL): ${formatBytes(Math.ceil((payloadBytes * 4) / 3))}`);

    expect(payloadBytes).toBeLessThan(10 * 1024);
  });
});

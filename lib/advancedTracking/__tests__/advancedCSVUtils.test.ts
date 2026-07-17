import { generateAdvancedGameCSV } from '../advancedCSVUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

describe('advancedCSVUtils', () => {
  it('exports pressure team totals, player counts, and fractional plus/minus', () => {
    const august = { refType: 'participant' as const, participantId: 'august' };
    const meves = { refType: 'participant' as const, participantId: 'meves' };
    const untracked = { refType: 'untracked' as const };
    const game: AdvancedTrackedGame = {
      id: 'game1',
      schemaVersion: 2,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'game',
      status: 'final',
      focusSideId: 'zoo',
      initialReceivingSideId: 'rivals',
      settings: { locationMode: 'none' },
      sides: [
        { id: 'zoo', label: 'Zoo', trackingMode: 'full-roster' },
        { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
      ],
      participants: [
        { id: 'august', name: 'August' },
        { id: 'meves', name: 'Meves' },
      ],
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: 'zoo', participantIds: ['august', 'meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: 'rivals',
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull',
                  sideId: 'zoo',
                  receivingSideId: 'rivals',
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'pressure1',
                  kind: 'throw',
                  sideId: 'rivals',
                  thrower: untracked,
                  defender: august,
                  result: 'pressure',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: 'zoo',
              actions: [
                {
                  id: 'goal1',
                  kind: 'throw',
                  sideId: 'zoo',
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const csv = generateAdvancedGameCSV(buildAnalyticsGame(game));
    expect(csv).toContain('Total Pressures,1');
    expect(csv).toContain('Pressures per D-Point,1');
    expect(csv).toContain('Blocks,Pressures,Receptions');

    const header = csv.split('\n').find((line) => line.startsWith('Player,Goals'));
    const augustRow = csv.split('\n').find((line) => line.startsWith('August,'));
    expect(header).toBeDefined();
    expect(augustRow).toBeDefined();
    const columns = header!.split(',');
    const cells = augustRow!.split(',');
    expect(cells[columns.indexOf('Pressures')]).toBe('1');
    expect(cells[columns.indexOf('Plus/Minus')]).toBe('1.5');
  });
});

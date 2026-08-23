import { generateAdvancedGameCSV } from '../advancedCSVUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

describe('advancedCSVUtils', () => {
  it('exports a throwaway classification in the action log', () => {
    const player = { refType: 'participant' as const, participantId: 'alex' };
    const game: AdvancedTrackedGame = {
      id: 'classified-throwaway',
      schemaVersion: 3,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'game',
      status: 'terminated',
      focusSideId: 'home',
      initialReceivingSideId: 'home',
      settings: { locationMode: 'none' },
      sides: [
        { id: 'home', label: 'Home', trackingMode: 'full-roster' },
        { id: 'away', label: 'Away', trackingMode: 'anonymous' },
      ],
      participants: [{ id: 'alex', name: 'Alex' }],
      points: [
        {
          id: 'point-1',
          lines: [{ sideId: 'home', participantIds: ['alex'] }],
          possessions: [
            {
              id: 'possession-1',
              sideId: 'home',
              actions: [
                {
                  id: 'throw-0',
                  kind: 'throw',
                  sideId: 'home',
                  thrower: player,
                  toPlayer: player,
                  result: 'complete',
                  details: { type: 'huck' },
                },
                {
                  id: 'throw-1',
                  kind: 'throw',
                  sideId: 'home',
                  thrower: player,
                  result: 'throwaway',
                  details: { type: 'backfield_reset' },
                },
              ],
            },
          ],
        },
      ],
    };

    const csv = generateAdvancedGameCSV(buildAnalyticsGame(game));

    expect(csv).toContain('Point,Action,Player,Result,Throw Type,Receiver,Defender');
    expect(csv).toContain('1,Throw,Alex,complete,Huck,Alex,');
    expect(csv).toContain('1,Throw,Alex,throwaway,Backfield Reset,,');
    expect(csv).toContain('Huck Attempts,1');
    expect(csv).toContain('Huck Completion %,100.0%');
    expect(csv).toContain('Backfield Reset Turnovers,1');
  });

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
    expect(csv).not.toContain('Huck Attempts');
    expect(csv).not.toContain('Backfield Reset Turnovers');
    expect(csv).toContain('Total Pressures,1');
    expect(csv).toContain('Pressures per D-Point,1');
    expect(csv).toContain('Hold Rate,-,0/0');
    expect(csv).toContain('O-Possession Conversion,-,0/0');
    expect(csv).toContain('Break Efficiency,100.0%,1/1');
    expect(csv).toContain('D-Possession Conversion,100.0%,1/1');
    expect(csv).toContain('D-Efficiency,100.0%,1/1');
    expect(csv).toContain('Overall Conversion,100.0%,1/1');
    expect(csv).not.toContain('\nPossession Conversion,');
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

  it('exports a scrimmage from the requested side perspective', () => {
    const lightPlayer = { refType: 'participant' as const, participantId: 'light-player' };
    const darkPlayer = { refType: 'participant' as const, participantId: 'dark-player' };
    const game: AdvancedTrackedGame = {
      id: 'scrimmage',
      schemaVersion: 2,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'scrimmage',
      status: 'final',
      focusSideId: 'light',
      initialReceivingSideId: 'light',
      settings: { locationMode: 'none' },
      sides: [
        { id: 'light', label: 'Light', trackingMode: 'full-roster' },
        { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
      ],
      participants: [
        { id: 'light-player', name: 'Light Player' },
        { id: 'dark-player', name: 'Dark Player' },
      ],
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: 'light', participantIds: ['light-player'] },
            { sideId: 'dark', participantIds: ['dark-player'] },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: 'light',
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull',
                  sideId: 'dark',
                  receivingSideId: 'light',
                  puller: darkPlayer,
                  result: 'inbound',
                },
                {
                  id: 'goal1',
                  kind: 'throw',
                  sideId: 'light',
                  thrower: lightPlayer,
                  toPlayer: lightPlayer,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          lines: [
            { sideId: 'light', participantIds: ['light-player'] },
            { sideId: 'dark', participantIds: ['dark-player'] },
          ],
          possessions: [
            {
              id: 'pos2',
              sideId: 'dark',
              actions: [
                {
                  id: 'pull2',
                  kind: 'pull',
                  sideId: 'light',
                  receivingSideId: 'dark',
                  puller: lightPlayer,
                  result: 'inbound',
                },
                {
                  id: 'goal2',
                  kind: 'throw',
                  sideId: 'dark',
                  thrower: darkPlayer,
                  toPlayer: darkPlayer,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const csv = generateAdvancedGameCSV(buildAnalyticsGame(game), 'dark');
    const playerSummary = csv.split('# Player Summary\n')[1].split('\n\n# Point-by-Point')[0];

    expect(csv).toContain('# Game: Dark vs Light');
    expect(playerSummary).toContain('Dark Player,');
    expect(playerSummary).not.toContain('Light Player,');
    expect(csv).toContain('1,0-0,1,Dark,Light,Opp Hold');
    expect(csv).toContain('2,0-1,1,Light,Dark,Hold');
  });
});

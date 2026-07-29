export const MAESTRO_SEED_GAME_ID = 'maestro-seed-advanced-game';
export const MAESTRO_SEED_TEAM_ID = 'maestro-seed-team';
export const MAESTRO_SEED_PLAYERS = ['Joe', 'Jon', 'Mike', 'Molly', 'Kelly', 'Rachel', 'Joel'];
export const MAESTRO_SCRIMMAGE_BENCH_PLAYERS = ['Heidi', 'Ivan'];
export const MAESTRO_SCRIMMAGE_PLAYERS = [
  ...MAESTRO_SEED_PLAYERS,
  'Anna',
  'Ben',
  'Cara',
  'Drew',
  'Emma',
  'Finn',
  'Grace',
  ...MAESTRO_SCRIMMAGE_BENCH_PLAYERS,
];

export function getMaestroSeedPlayerId(name: string) {
  return `maestro-seed-player-${name.toLowerCase()}`;
}

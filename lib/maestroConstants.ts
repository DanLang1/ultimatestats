export const MAESTRO_SEED_GAME_ID = 'maestro-seed-advanced-game';
export const MAESTRO_SEED_TEAM_ID = 'maestro-seed-team';
export const MAESTRO_SEED_PLAYERS = ['Joe', 'Jon', 'Mike', 'Molly', 'Kelly', 'Rachel', 'Joel'];

export function getMaestroSeedPlayerId(name: string) {
  return `maestro-seed-player-${name.toLowerCase()}`;
}

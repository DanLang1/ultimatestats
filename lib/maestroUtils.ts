import { generateId } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';
import type { SavedTeam } from '@/lib/storage/types';

const SEED_PLAYERS = ['Joe', 'Jon', 'Mike', 'Molly', 'Kelly', 'Rachel', 'Joel'];

export function buildSeedTeam(): SavedTeam {
  return {
    id: generateId(),
    name: 'Zoboomafoo',
    roster: SEED_PLAYERS.map((name) => ({
      id: generateId(),
      name,
      isActive: true,
      matchingType: null,
      role: null,
    })),
  };
}

export function seedTestTeam() {
  const { saveCurrentTeam, setCurrentTeam } = useGameStore.getState();
  const team = buildSeedTeam();
  saveCurrentTeam(team);
  setCurrentTeam(team);
}

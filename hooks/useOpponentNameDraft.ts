import { useState } from 'react';

import { useGameStore } from '@/store/basic/gameStore';

export function useOpponentNameDraft() {
  const team2Name = useGameStore((state) => state.team2Name);
  const [opponentNameDraft, setOpponentNameDraft] = useState(team2Name);

  const [isEditingOpponentName, setIsEditingOpponentName] = useState(false);

  const startEditingOpponentName = () => {
    setOpponentNameDraft(team2Name);
    setIsEditingOpponentName(true);
  };

  const commitOpponentName = () => {
    const store = useGameStore.getState();
    const name = opponentNameDraft.trim() || store.team2Name;
    store.setTeam2Name(name);
    setOpponentNameDraft(name);
    setIsEditingOpponentName(false);
    return name;
  };

  return {
    opponentNameDraft,
    setOpponentNameDraft,
    commitOpponentName,
    isEditingOpponentName,
    startEditingOpponentName,
  };
}

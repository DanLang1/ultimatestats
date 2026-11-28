import { useState } from 'react';

import { useSettingsStore } from '@/store/settingsStore';

export function useOpponentNameDraft() {
  const otherSideTeamName = useSettingsStore((state) => state.otherSideTeamName);
  const [opponentNameDraft, setOpponentNameDraft] = useState(otherSideTeamName);

  const [isEditingOpponentName, setIsEditingOpponentName] = useState(false);

  const startEditingOpponentName = () => {
    setOpponentNameDraft(otherSideTeamName);
    setIsEditingOpponentName(true);
  };

  const commitOpponentName = () => {
    const settings = useSettingsStore.getState();
    const name = opponentNameDraft.trim() || settings.otherSideTeamName;
    settings.setOtherSideTeamName(name);
    setOpponentNameDraft(name);
    setIsEditingOpponentName(false);
    return name;
  };

  return {
    otherSideTeamName,
    opponentNameDraft,
    setOpponentNameDraft,
    commitOpponentName,
    isEditingOpponentName,
    startEditingOpponentName,
  };
}

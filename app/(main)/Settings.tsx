import { SettingsContent } from '@/components/settings/SettingsContent';
import { useGameStore } from '@/store/basic/gameStore';

export default function SettingsScreen() {
  const { currentTeam } = useGameStore();
  const settingsKey = `${currentTeam.id}:${currentTeam.name}`;
  return <SettingsContent key={settingsKey} />;
}

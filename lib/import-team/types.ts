import { PlayerRole } from '@/lib/storage/types';

export type NameFormatOption = 'full' | 'first' | 'last';

export type ImportedPlayerDraft = {
  name: string;
  pronouns: string | null;
  role: PlayerRole | null;
};

export type ImportApiPlayer = {
  name: string;
  position?: string;
  pronouns?: string;
};

export type ImportApiTeam = {
  teamname?: string;
  division?: string;
};

export type ImportApiSuccessPayload = {
  count?: number;
  team?: ImportApiTeam;
  players?: ImportApiPlayer[];
};

export type ImportApiErrorPayload = {
  message?: string;
  detail?: string | { message?: string };
};

export type ImportApiPayload = ImportApiSuccessPayload | ImportApiErrorPayload | string | null;

export const NAME_FORMAT_OPTIONS: { value: NameFormatOption; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'first', label: 'First' },
  { value: 'last', label: 'Last' },
];

import { MAX_PLAYER_NAME_LENGTH, MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { ImportApiSuccessPayload, ImportedPlayerDraft } from '@/lib/import-team/types';
import { SavedTeam } from '@/lib/storage';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { generateId } from '@/lib/utils';

const DEFAULT_IMPORTED_TEAM_NAME = 'Imported Team';

function getRoleFromPosition(position?: string): PlayerRole | null {
  if (!position) return null;
  const normalized = position.trim().toLowerCase();
  if (normalized === 'handler') return 'handler';
  if (normalized === 'cutter') return 'cutter';
  if (normalized === 'hybrid') return 'hybrid';
  return null;
}

function parseImportedPlayers(payload: ImportApiSuccessPayload): ImportedPlayerDraft[] {
  if (!payload.players?.length) {
    return [];
  }

  const importedPlayers = payload.players
    .map((player) => {
      const normalizedName = normalizeName(player.name, MAX_PLAYER_NAME_LENGTH);
      if (!normalizedName) {
        return null;
      }

      return {
        name: normalizedName,
        pronouns: player.pronouns ?? null,
        role: getRoleFromPosition(player.position),
      };
    })
    .filter((player): player is ImportedPlayerDraft => player !== null);

  return withUniquePlayerNames(importedPlayers);
}

function normalizeName(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

function withSuffixWithinLimit(baseName: string, suffix: number, maxLength: number): string {
  if (suffix <= 1) {
    return baseName.slice(0, maxLength);
  }

  const suffixText = ` (${suffix})`;
  const availableLength = Math.max(0, maxLength - suffixText.length);
  const base = baseName.slice(0, availableLength).trimEnd();
  return `${base}${suffixText}`.slice(0, maxLength);
}

function withUniquePlayerNames(players: ImportedPlayerDraft[]): ImportedPlayerDraft[] {
  const usedNames = new Set<string>();
  const baseNameCounts = new Map<string, number>();

  return players.map((player) => {
    const baseName = player.name;
    const baseKey = baseName.toLowerCase();
    let suffix = (baseNameCounts.get(baseKey) ?? 0) + 1;
    let uniqueName = withSuffixWithinLimit(baseName, suffix, MAX_PLAYER_NAME_LENGTH);

    while (usedNames.has(uniqueName.toLowerCase())) {
      suffix += 1;
      uniqueName = withSuffixWithinLimit(baseName, suffix, MAX_PLAYER_NAME_LENGTH);
    }

    baseNameCounts.set(baseKey, suffix);
    usedNames.add(uniqueName.toLowerCase());

    return {
      ...player,
      name: uniqueName,
    };
  });
}

function extractImportedDivision(payload: ImportApiSuccessPayload): string | null {
  return payload.team?.division ?? null;
}

function getPronounMatchingType(pronouns: string | null): MatchingType | null {
  if (!pronouns) return null;
  const normalized = pronouns.trim().toLowerCase();
  if (normalized === 'h') return 'mmp';
  if (normalized === 's') return 'fmp';
  return null;
}

function getDivisionDefaultMatchingType(division: string | null): MatchingType | null {
  if (!division) return null;
  const normalized = division.trim().toLowerCase();
  if (normalized === 'men' || normalized === 'boys') return 'mmp';
  if (normalized === 'women' || normalized === 'girls') return 'fmp';
  return null;
}

function extractImportedTeamName(payload: ImportApiSuccessPayload): string | null {
  const teamName = payload.team?.teamname;
  if (typeof teamName !== 'string') return null;
  const normalizedName = normalizeName(teamName, MAX_TEAM_NAME_LENGTH);
  return normalizedName || null;
}

function resolveUniqueTeamName(baseName: string, savedTeams: SavedTeam[]): string {
  const normalizedBase =
    normalizeName(baseName, MAX_TEAM_NAME_LENGTH) || DEFAULT_IMPORTED_TEAM_NAME;
  const existingNames = new Set(savedTeams.map((team) => team.name.trim().toLowerCase()));
  if (!existingNames.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  let suffix = 2;
  let candidate = withSuffixWithinLimit(normalizedBase, suffix, MAX_TEAM_NAME_LENGTH);
  while (existingNames.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = withSuffixWithinLimit(normalizedBase, suffix, MAX_TEAM_NAME_LENGTH);
  }
  return candidate;
}

export function buildImportedTeam(
  payload: ImportApiSuccessPayload,
  savedTeams: SavedTeam[],
  fallbackTeamName: string,
): SavedTeam {
  const importedPlayers = parseImportedPlayers(payload);
  const importedDivision = extractImportedDivision(payload);
  const divisionDefaultMatchingType = getDivisionDefaultMatchingType(importedDivision);
  const apiTeamName = extractImportedTeamName(payload);
  const teamName = resolveUniqueTeamName(
    apiTeamName ?? fallbackTeamName ?? DEFAULT_IMPORTED_TEAM_NAME,
    savedTeams,
  );

  return {
    id: generateId(),
    name: teamName,
    roster: importedPlayers.map((player) => ({
      id: generateId(),
      name: player.name,
      isActive: true,
      matchingType:
        importedDivision?.trim().toLowerCase() === 'mixed'
          ? getPronounMatchingType(player.pronouns)
          : divisionDefaultMatchingType,
      role: player.role,
    })),
  };
}

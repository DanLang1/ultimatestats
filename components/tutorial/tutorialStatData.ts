import { GenderRatio } from '@/lib/genderRatioUtils';
import { Player } from '@/lib/storage/types';
import { TutorialColors } from '@/theme/theme';

// ── Team Names & Colors ──────────────────────────────────────────────
export const TUTORIAL_STAT_TEAM1_NAME = 'USA';
export const TUTORIAL_STAT_TEAM2_NAME = 'Canada';
export const TUTORIAL_STAT_TEAM1_BG = TutorialColors.team1Bg;
export const TUTORIAL_STAT_TEAM2_BG = TutorialColors.team2Bg;

// ── Initial Game State ───────────────────────────────────────────────
export const TUTORIAL_STAT_INITIAL_SCORE_TEAM1 = 3;
export const TUTORIAL_STAT_INITIAL_SCORE_TEAM2 = 2;
export const TUTORIAL_STAT_CURRENT_POINT = 6;
export const TUTORIAL_STAT_EXPECTED_RATIO: GenderRatio = 'more-women'; // FMP point
export const TUTORIAL_STAT_GAME_TIMER = 90 * 60; // 90 minutes

// ── Roster ───────────────────────────────────────────────────────────
// 14 players: 7 FMP, 7 MMP — evenly spread across handler/cutter/hybrid

export const TUTORIAL_STAT_ROSTER: Player[] = [
  // FMP
  { id: 'f1', name: 'Helton', isActive: true, matchingType: 'fmp', role: 'cutter' },
  { id: 'f2', name: 'Trop', isActive: true, matchingType: 'fmp', role: 'cutter' },
  { id: 'f3', name: 'Groom', isActive: true, matchingType: 'fmp', role: 'cutter' },
  { id: 'f4', name: 'Thompson', isActive: true, matchingType: 'fmp', role: 'handler' },
  { id: 'f5', name: 'Chastain', isActive: true, matchingType: 'fmp', role: 'hybrid' },
  { id: 'f6', name: 'Culton', isActive: true, matchingType: 'fmp', role: 'hybrid' },
  { id: 'f7', name: 'Finney', isActive: true, matchingType: 'fmp', role: 'handler' },
  // MMP
  { id: 'm1', name: 'M Ing', isActive: true, matchingType: 'mmp', role: 'cutter' },
  { id: 'm2', name: 'H Ing', isActive: true, matchingType: 'mmp', role: 'cutter' },
  { id: 'm3', name: 'Brownlee', isActive: true, matchingType: 'mmp', role: 'hybrid' },
  { id: 'm4', name: 'Freechild', isActive: true, matchingType: 'mmp', role: 'handler' },
  { id: 'm5', name: 'Kocher', isActive: true, matchingType: 'mmp', role: 'cutter' },
  { id: 'm6', name: 'Hayes', isActive: true, matchingType: 'mmp', role: 'cutter' },
  { id: 'm7', name: 'Lindsley', isActive: true, matchingType: 'mmp', role: 'hybrid' },
];

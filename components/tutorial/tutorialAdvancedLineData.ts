import type { Player } from '@/lib/storage/types';

export interface TutorialAdvancedLinePreset {
  id: string;
  name: string;
  playerIds: string[];
}

export const TUTORIAL_ADVANCED_LINE_PLAYERS: Player[] = [
  {
    id: 'line-kelly',
    name: 'Kelly',
    number: '7',
    isActive: true,
    matchingType: 'fmp',
    role: 'handler',
  },
  {
    id: 'line-rachel',
    name: 'Rachel',
    number: '12',
    isActive: true,
    matchingType: 'fmp',
    role: 'cutter',
  },
  {
    id: 'line-jules',
    name: 'Jules',
    number: '34',
    isActive: true,
    matchingType: 'fmp',
    role: 'hybrid',
  },
  {
    id: 'line-harper',
    name: 'Harper',
    number: '18',
    isActive: true,
    matchingType: 'fmp',
    role: 'handler',
  },
  {
    id: 'line-erin',
    name: 'Erin',
    number: '22',
    isActive: true,
    matchingType: 'fmp',
    role: 'cutter',
  },
  {
    id: 'line-mark',
    name: 'Mark',
    number: '5',
    isActive: true,
    matchingType: 'mmp',
    role: 'hybrid',
  },
  {
    id: 'line-jerry',
    name: 'Jerry',
    number: '41',
    isActive: true,
    matchingType: 'mmp',
    role: 'cutter',
  },
  {
    id: 'line-frank',
    name: 'Frank',
    number: '9',
    isActive: true,
    matchingType: 'mmp',
    role: 'handler',
  },
  {
    id: 'line-joe',
    name: 'Joe',
    number: '15',
    isActive: true,
    matchingType: 'mmp',
    role: 'cutter',
  },
  {
    id: 'line-bryan',
    name: 'Bryan',
    number: '27',
    isActive: true,
    matchingType: 'mmp',
    role: 'handler',
  },
];

export const TUTORIAL_ADVANCED_LINE_PRESET: TutorialAdvancedLinePreset = {
  id: 'tutorial-d-line',
  name: 'D-Line',
  playerIds: [
    'line-kelly',
    'line-rachel',
    'line-jules',
    'line-harper',
    'line-erin',
    'line-mark',
    'line-jerry',
  ],
};

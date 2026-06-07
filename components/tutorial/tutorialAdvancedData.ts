import type { Participant, PlayerRef } from '@/lib/advancedTracking/types';

export const TUTORIAL_ADVANCED_PARTICIPANTS: Participant[] = [
  { id: 'alex', name: 'Alex', number: '7' },
  { id: 'blair', name: 'Blair', number: '12' },
  { id: 'carl', name: 'Carl', number: '34' },
  { id: 'devon', name: 'Devon', number: '18' },
  { id: 'erin', name: 'Erin', number: '22' },
  { id: 'frankie', name: 'Frankie', number: '5' },
  { id: 'gray', name: 'Gray', number: '41' },
];

export const ALEX_REF: PlayerRef = { refType: 'participant', participantId: 'alex' };
export const BLAIR_REF: PlayerRef = { refType: 'participant', participantId: 'blair' };
export const CARL_REF: PlayerRef = { refType: 'participant', participantId: 'carl' };

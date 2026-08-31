import type {
  AdvancedTrackedGame,
  GameSide,
  Participant,
  PointLine,
} from '@/lib/advancedTracking/types';
import {
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

export const ZOO_SIDE_ID = 'zoo';
export const RIVALS_SIDE_ID = 'rivals';

export const ZOO_PARTICIPANTS: Participant[] = [
  { id: 'p-august', name: 'August', matchingType: 'fmp' },
  { id: 'p-meves', name: 'Meves', matchingType: 'fmp' },
  { id: 'p-joah', name: 'Joah', matchingType: 'mmp' },
  { id: 'p-max', name: 'Max', matchingType: 'mmp' },
  { id: 'p-casey', name: 'Casey', matchingType: 'fmp' },
  { id: 'p-dana', name: 'Dana', matchingType: 'fmp' },
  { id: 'p-eli', name: 'Eli', matchingType: 'mmp' },
  { id: 'p-sam', name: 'Sam', matchingType: 'mmp' },
];

const SINGLE_TEAM_SIDES: GameSide[] = [
  {
    id: ZOO_SIDE_ID,
    label: 'Zoo',
    trackingMode: 'full-roster',
    sourceTeamId: 'team-zoo',
  },
  { id: RIVALS_SIDE_ID, label: 'Rivals', trackingMode: 'anonymous' },
];

const ZOO_LINE: PointLine[] = [
  {
    sideId: ZOO_SIDE_ID,
    participantIds: ZOO_PARTICIPANTS.slice(0, 7).map((participant) => participant.id),
  },
];

const august = participantRef('p-august');
const meves = participantRef('p-meves');
const joah = participantRef('p-joah');
const max = participantRef('p-max');
const sam = participantRef('p-sam');

function singleTeamScenario(options: {
  id: string;
  initialReceivingSideId?: string;
  participants?: Participant[];
}) {
  return createAdvancedGameScenario({
    id: options.id,
    focusSideId: ZOO_SIDE_ID,
    initialReceivingSideId: options.initialReceivingSideId ?? ZOO_SIDE_ID,
    sides: SINGLE_TEAM_SIDES,
    participants: options.participants ?? ZOO_PARTICIPANTS,
    defaultLines: ZOO_LINE,
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
    },
  });
}

export function cleanHoldScenario(): AdvancedTrackedGame {
  return singleTeamScenario({ id: 'scenario-clean-hold' })
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: august })
    .complete(meves)
    .complete(joah)
    .goal(max)
    .build();
}

export function dirtyHoldScenario(): AdvancedTrackedGame {
  return singleTeamScenario({ id: 'scenario-dirty-hold' })
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: august })
    .complete(meves)
    .turnover('throwaway')
    .startPossession(RIVALS_SIDE_ID)
    .pickup(UNTRACKED_PLAYER)
    .turnover('block', { defender: joah })
    .startPossession(ZOO_SIDE_ID)
    .pickup(joah)
    .complete(august)
    .goal(max)
    .build();
}

export function breakScenario(): AdvancedTrackedGame {
  return singleTeamScenario({
    id: 'scenario-break',
    initialReceivingSideId: RIVALS_SIDE_ID,
  })
    .startPoint({ puller: august, receiver: UNTRACKED_PLAYER })
    .complete(UNTRACKED_PLAYER)
    .turnover('block', { defender: meves })
    .startPossession(ZOO_SIDE_ID)
    .pickup(meves)
    .complete(joah)
    .goal(max)
    .build();
}

export function callahanScenario(): AdvancedTrackedGame {
  return singleTeamScenario({
    id: 'scenario-callahan',
    initialReceivingSideId: RIVALS_SIDE_ID,
  })
    .startPoint({ puller: joah, receiver: UNTRACKED_PLAYER })
    .complete(UNTRACKED_PLAYER)
    .callahan(max)
    .build();
}

export function blockWithDifferentPickupScenario(): AdvancedTrackedGame {
  return singleTeamScenario({
    id: 'scenario-block-different-pickup',
    initialReceivingSideId: RIVALS_SIDE_ID,
  })
    .startPoint({ puller: august, receiver: UNTRACKED_PLAYER })
    .turnover('block', { defender: august })
    .startPossession(ZOO_SIDE_ID)
    .pickup(joah)
    .complete(meves)
    .goal(max)
    .build();
}

export function caughtBlockScenario(): AdvancedTrackedGame {
  return singleTeamScenario({
    id: 'scenario-caught-block',
    initialReceivingSideId: RIVALS_SIDE_ID,
  })
    .startPoint({ puller: august, receiver: UNTRACKED_PLAYER })
    .turnover('block', { defender: meves })
    .startPossession(ZOO_SIDE_ID, { holder: meves })
    .complete(joah)
    .goal(max)
    .build();
}

export function offDiscInjuryScenario(): AdvancedTrackedGame {
  return singleTeamScenario({ id: 'scenario-injury-off-disc' })
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: august })
    .complete(meves)
    .stoppage('injury', { sideId: ZOO_SIDE_ID })
    .injurySub({ sideId: ZOO_SIDE_ID, inIds: ['p-sam'], outIds: ['p-august'] })
    .goal(max)
    .build();
}

export function holderInjuryScenario(): AdvancedTrackedGame {
  return singleTeamScenario({ id: 'scenario-injury-holder' })
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: august })
    .complete(meves)
    .stoppage('injury', { sideId: ZOO_SIDE_ID })
    .injurySub({ sideId: ZOO_SIDE_ID, inIds: ['p-sam'], outIds: ['p-meves'] })
    .pickup(sam)
    .goal(max)
    .build();
}

export function stallScenario(): AdvancedTrackedGame {
  return singleTeamScenario({ id: 'scenario-stall' })
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: august })
    .complete(meves)
    .turnover('stall')
    .startPossession(RIVALS_SIDE_ID)
    .pickup(UNTRACKED_PLAYER)
    .goal()
    .build();
}

export function obPullScenario(): AdvancedTrackedGame {
  return singleTeamScenario({
    id: 'scenario-ob-pull',
    initialReceivingSideId: RIVALS_SIDE_ID,
  })
    .startPoint({ puller: august, pullResult: 'ob' })
    .pickup(UNTRACKED_PLAYER)
    .turnover('throwaway')
    .startPossession(ZOO_SIDE_ID)
    .pickup(meves)
    .goal(joah)
    .build();
}

export function genderRatioScenario(): AdvancedTrackedGame {
  return singleTeamScenario({ id: 'scenario-gender-ratio' })
    .startPoint({
      puller: UNTRACKED_PLAYER,
      receiver: august,
      genderRatio: 'more-women',
    })
    .goal(meves)
    .startPoint({
      puller: joah,
      receiver: UNTRACKED_PLAYER,
      genderRatio: 'more-men',
      lines: [
        {
          sideId: ZOO_SIDE_ID,
          participantIds: ['p-august', 'p-meves', 'p-casey', 'p-joah', 'p-max', 'p-eli', 'p-sam'],
        },
      ],
    })
    .turnover('throwaway')
    .startPossession(ZOO_SIDE_ID)
    .pickup(joah)
    .goal(max)
    .build();
}

const RIVALS_PARTICIPANTS: Participant[] = [
  { id: 'r-ryan', name: 'Ryan' },
  { id: 'r-sam', name: 'Sam R.' },
  { id: 'r-taylor', name: 'Taylor' },
  { id: 'r-robin', name: 'Robin' },
  { id: 'r-morgan', name: 'Morgan' },
  { id: 'r-quinn', name: 'Quinn' },
  { id: 'r-parker', name: 'Parker' },
];

export function fullGameScenario(): AdvancedTrackedGame {
  const participants = [...ZOO_PARTICIPANTS, ...RIVALS_PARTICIPANTS];
  const sides: GameSide[] = [
    { ...SINGLE_TEAM_SIDES[0], colorToken: 'blue' },
    { id: RIVALS_SIDE_ID, label: 'Rivals', trackingMode: 'full-roster', colorToken: 'red' },
  ];
  const lines: PointLine[] = [
    {
      sideId: ZOO_SIDE_ID,
      participantIds: ZOO_PARTICIPANTS.slice(0, 7).map((participant) => participant.id),
    },
    {
      sideId: RIVALS_SIDE_ID,
      participantIds: RIVALS_PARTICIPANTS.map((participant) => participant.id),
    },
  ];
  const ryan = participantRef('r-ryan');
  const rivalSam = participantRef('r-sam');
  const taylor = participantRef('r-taylor');

  return createAdvancedGameScenario({
    id: 'scenario-full-game',
    status: 'final',
    focusSideId: ZOO_SIDE_ID,
    initialReceivingSideId: ZOO_SIDE_ID,
    sides,
    participants,
    defaultLines: lines,
    metadata: {
      title: 'Zoo vs Rivals — Finals',
      location: 'Main Field',
      date: '2026-04-01',
      notes: 'Windy conditions',
    },
    settings: {
      locationMode: 'none',
      format: { formatType: 'standard', gameTo: 7, halftimeAt: 4 },
    },
  })
    .startPoint({ puller: ryan, receiver: meves, hangTimeMs: 2100 })
    .complete(joah)
    .complete(max)
    .goal(august)
    .startPoint({ puller: august, receiver: ryan, hangTimeMs: 1950 })
    .complete(rivalSam)
    .stoppage('injury', { sideId: RIVALS_SIDE_ID })
    .pickup(rivalSam)
    .turnover('drop', { toPlayer: taylor, splitAttribution: true })
    .startPossession(ZOO_SIDE_ID)
    .pickup(joah)
    .turnover('throwaway')
    .startPossession(RIVALS_SIDE_ID)
    .pickup(ryan)
    .complete(taylor)
    .goal(rivalSam)
    .transitionAfterPoint({ transitionType: 'timeout', sideId: ZOO_SIDE_ID })
    .gameTransition({ transitionType: 'halftime', triggeredEarly: true })
    .startPoint({ puller: joah, receiver: rivalSam, hangTimeMs: 2300 })
    .complete(ryan)
    .turnover('block', { defender: meves })
    .startPossession(ZOO_SIDE_ID)
    .pickup(meves)
    .complete(august)
    .goal(max)
    .transitionAfterPoint({ transitionType: 'spirit_timeout' })
    .gameTransition({ transitionType: 'soft_cap' })
    .startPoint({ puller: august, receiver: taylor, hangTimeMs: 2050 })
    .complete(ryan)
    .callahan(max)
    .build();
}

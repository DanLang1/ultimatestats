import { CapStatus, CapStatusInput, getCapStatusMessage } from '@/lib/basic/capStatusUtils';

const base: CapStatusInput = {
  isHardcap: false,
  isSoftCap: false,
  softCapPending: false,
  team1Score: 0,
  team2Score: 0,
  team1Name: 'Windchill',
  team2Name: 'Rivals',
};

describe('getCapStatusMessage', () => {
  it.each<[string, Partial<CapStatusInput>, CapStatus]>([
    [
      'hard cap tied',
      { isHardcap: true, team1Score: 2, team2Score: 2 },
      { kind: 'universe-point' },
    ],
    [
      'hard cap team 1 one ahead',
      { isHardcap: true, team1Score: 3, team2Score: 2 },
      {
        kind: 'hardcap-lead',
        leadingTeam: 'Windchill',
        message: 'wins unless Rivals scores',
      },
    ],
    [
      'hard cap team 2 one ahead',
      { isHardcap: true, team1Score: 2, team2Score: 3 },
      {
        kind: 'hardcap-lead',
        leadingTeam: 'Rivals',
        message: 'wins unless Windchill scores',
      },
    ],
    [
      'hard cap two or more ahead',
      { isHardcap: true, team1Score: 1, team2Score: 3 },
      {
        kind: 'hardcap-lead',
        leadingTeam: 'Rivals',
        message: 'wins after this point',
      },
    ],
    ['soft cap active', { isSoftCap: true }, { kind: 'softcap-active', message: 'Softcap Active' }],
    [
      'soft cap pending',
      { softCapPending: true },
      { kind: 'softcap-pending', message: 'Softcap Pending' },
    ],
    [
      'soft cap active wins over pending',
      { isSoftCap: true, softCapPending: true },
      { kind: 'softcap-active', message: 'Softcap Active' },
    ],
    [
      'hard cap overrides soft cap',
      { isHardcap: true, isSoftCap: true },
      { kind: 'universe-point' },
    ],
    ['no cap', {}, { kind: 'none' }],
  ])('%s', (_name, overrides, expected) => {
    expect(getCapStatusMessage({ ...base, ...overrides })).toEqual(expected);
  });
});

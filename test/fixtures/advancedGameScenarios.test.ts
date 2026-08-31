import {
  blockWithDifferentPickupScenario,
  breakScenario,
  callahanScenario,
  caughtBlockScenario,
  cleanHoldScenario,
  dirtyHoldScenario,
  fullGameScenario,
  genderRatioScenario,
  holderInjuryScenario,
  obPullScenario,
  offDiscInjuryScenario,
  stallScenario,
} from '@/test/fixtures/advancedGameScenarios';

const scenarioCatalog = [
  ['clean hold', cleanHoldScenario],
  ['dirty hold', dirtyHoldScenario],
  ['break', breakScenario],
  ['Callahan', callahanScenario],
  ['block with a different pickup player', blockWithDifferentPickupScenario],
  ['caught block', caughtBlockScenario],
  ['off-disc injury', offDiscInjuryScenario],
  ['holder injury', holderInjuryScenario],
  ['stall', stallScenario],
  ['out-of-bounds pull', obPullScenario],
  ['gender-ratio progression', genderRatioScenario],
  ['full game', fullGameScenario],
] as const;

describe('advanced game scenario catalog', () => {
  it.each(scenarioCatalog)('keeps the %s scenario canonical', (_name, createScenario) => {
    expect(createScenario()).toBeDefined();
  });
});

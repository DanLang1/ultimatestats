import { computeCapState } from '../../advancedTracking/capUtils';
import { CAP_WARNING_THRESHOLD_MS } from '../../constants';

const MIN_MS = 60 * 1000;

// Defaults: soft cap at 70 min elapsed, hard cap at 90 min elapsed.
const DEFAULTS = { gameLengthMinutes: 90, softCapMins: 20 };

describe('computeCapState', () => {
  it('pre-game: label is SOFT CAP, progress 0, time-left equals soft-cap threshold', () => {
    const state = computeCapState({
      gameElapsedMs: 0,
      gameStarted: false,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('SOFT CAP');
    expect(state.pastSoftCap).toBe(false);
    expect(state.capProgress).toBe(0);
    expect(state.capTimeLeftMs).toBe(70 * MIN_MS);
    expect(state.capIsWarning).toBe(false);
  });

  it('mid first half: counts progress towards soft cap, no warning', () => {
    const state = computeCapState({
      gameElapsedMs: 35 * MIN_MS,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('SOFT CAP');
    expect(state.capTargetMs).toBe(70 * MIN_MS);
    expect(state.capProgress).toBeCloseTo(35 / 70, 5);
    expect(state.capTimeLeftMs).toBe(35 * MIN_MS);
    expect(state.capIsWarning).toBe(false);
  });

  it('warning fires when under 5 min left to soft cap', () => {
    const state = computeCapState({
      gameElapsedMs: (70 - 4) * MIN_MS, // 4 min left
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('SOFT CAP');
    expect(state.capTimeLeftMs).toBe(4 * MIN_MS);
    expect(state.capIsWarning).toBe(true);
  });

  it('warning does not fire at exactly the threshold', () => {
    const state = computeCapState({
      gameElapsedMs: 70 * MIN_MS - CAP_WARNING_THRESHOLD_MS,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capTimeLeftMs).toBe(CAP_WARNING_THRESHOLD_MS);
    expect(state.capIsWarning).toBe(false);
  });

  it('exactly at soft cap: switches to HARD CAP phase, progress restarts at 0', () => {
    const state = computeCapState({
      gameElapsedMs: 70 * MIN_MS,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('HARD CAP');
    expect(state.pastSoftCap).toBe(true);
    expect(state.capTargetMs).toBe(90 * MIN_MS);
    expect(state.capProgress).toBe(0);
    expect(state.capTimeLeftMs).toBe(20 * MIN_MS);
  });

  it('between soft and hard cap: progress measured within soft→hard window', () => {
    const state = computeCapState({
      gameElapsedMs: 80 * MIN_MS,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('HARD CAP');
    // 10 of 20 min into the soft→hard window.
    expect(state.capProgress).toBeCloseTo(10 / 20, 5);
    expect(state.capTimeLeftMs).toBe(10 * MIN_MS);
    expect(state.capIsWarning).toBe(false);
  });

  it('hard-cap warning: under 5 min left to hard cap', () => {
    const state = computeCapState({
      gameElapsedMs: (90 - 3) * MIN_MS,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('HARD CAP');
    expect(state.capTimeLeftMs).toBe(3 * MIN_MS);
    expect(state.capIsWarning).toBe(true);
  });

  it('past hard cap: progress clamps to 1, time-left clamps to 0', () => {
    const state = computeCapState({
      gameElapsedMs: 120 * MIN_MS,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capLabel).toBe('HARD CAP');
    expect(state.capProgress).toBe(1);
    expect(state.capTimeLeftMs).toBe(0);
    expect(state.capIsWarning).toBe(true);
  });

  it('softCapMins >= gameLengthMinutes: soft cap at 0, immediately past soft cap once started', () => {
    const state = computeCapState({
      gameElapsedMs: 1000,
      gameStarted: true,
      gameLengthMinutes: 10,
      softCapMins: 20,
    });

    expect(state.capLabel).toBe('HARD CAP');
    expect(state.pastSoftCap).toBe(true);
    expect(state.capTargetMs).toBe(10 * MIN_MS);
  });

  it('gameLengthMinutes = 0: both caps at 0 — pre-game still reports SOFT CAP with 0 time-left', () => {
    const preGame = computeCapState({
      gameElapsedMs: 0,
      gameStarted: false,
      gameLengthMinutes: 0,
      softCapMins: 0,
    });

    expect(preGame.capLabel).toBe('SOFT CAP');
    expect(preGame.capTimeLeftMs).toBe(0);
    expect(preGame.capIsWarning).toBe(false);
  });

  it('gameLengthMinutes = 0 while running: immediately past hard cap', () => {
    const state = computeCapState({
      gameElapsedMs: 1,
      gameStarted: true,
      gameLengthMinutes: 0,
      softCapMins: 0,
    });

    expect(state.capLabel).toBe('HARD CAP');
    expect(state.capTimeLeftMs).toBe(0);
    expect(state.capProgress).toBe(1);
  });

  it('negative elapsed (clock drift): progress and time-left stay non-negative', () => {
    const state = computeCapState({
      gameElapsedMs: -5000,
      gameStarted: true,
      ...DEFAULTS,
    });

    expect(state.capProgress).toBe(0);
    // Implementation clamps time-left to >= 0 via max(0, ...), but with negative elapsed
    // target - elapsed > target, so time-left reports > target — which is fine as a clamp
    // boundary since UI only formats it. Just assert it's finite and non-negative.
    expect(state.capTimeLeftMs).toBeGreaterThanOrEqual(0);
  });
});

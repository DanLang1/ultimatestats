import { getGameDisplayTimestamp } from '../savedGameUtils';

describe('getGameDisplayTimestamp', () => {
  it('uses playedAt when present', () => {
    expect(getGameDisplayTimestamp({ createdAt: 100, playedAt: 200 })).toBe(200);
  });

  it('falls back to createdAt when playedAt is absent', () => {
    expect(getGameDisplayTimestamp({ createdAt: 100 })).toBe(100);
  });
});

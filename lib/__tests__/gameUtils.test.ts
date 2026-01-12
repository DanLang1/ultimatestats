import { checkGameOver, GameOverState, getWinner } from '../gameUtils';

describe('checkGameOver', () => {
  const baseState: GameOverState = {
    team1Score: 0,
    team2Score: 0,
    gameTo: 15,
    timerTimeLeft: 3600, // 1 hour remaining
  };

  describe('Normal game (no caps)', () => {
    it('returns false when neither team has reached gameTo', () => {
      expect(checkGameOver({ ...baseState, team1Score: 7, team2Score: 6 })).toBe(false);
    });

    it('returns true when team1 reaches gameTo and is ahead', () => {
      expect(checkGameOver({ ...baseState, team1Score: 15, team2Score: 12 })).toBe(true);
    });

    it('returns true when team2 reaches gameTo and is ahead', () => {
      expect(checkGameOver({ ...baseState, team1Score: 10, team2Score: 15 })).toBe(true);
    });
  });

  describe('Softcap game', () => {
    it('returns true when team reaches reduced gameTo and is ahead', () => {
      // Softcap activated, gameTo reduced to 10
      expect(checkGameOver({ ...baseState, gameTo: 10, team1Score: 10, team2Score: 8 })).toBe(true);
    });

    it('returns false when neither team reaches reduced gameTo', () => {
      expect(checkGameOver({ ...baseState, gameTo: 10, team1Score: 8, team2Score: 7 })).toBe(false);
    });
  });

  describe('Hardcap game (timer = 0)', () => {
    // At hardcap, game ends immediately if one team is ahead (universe point rule)
    const hardcapState = { ...baseState, timerTimeLeft: 0 };

    it('returns true when one team is ahead (even if below gameTo)', () => {
      expect(checkGameOver({ ...hardcapState, team1Score: 3, team2Score: 1 })).toBe(true);
    });

    it('returns false when teams are tied (universe point)', () => {
      expect(checkGameOver({ ...hardcapState, team1Score: 5, team2Score: 5 })).toBe(false);
    });

    it('returns true after universe point when one team scores', () => {
      // After tie at 5-5, team1 scored to make it 6-5
      expect(checkGameOver({ ...hardcapState, team1Score: 6, team2Score: 5 })).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('returns true when team exceeds gameTo', () => {
      expect(checkGameOver({ ...baseState, team1Score: 16, team2Score: 14 })).toBe(true);
    });

    it('returns false at 0-0', () => {
      expect(checkGameOver(baseState)).toBe(false);
    });

    it('handles game to 1', () => {
      expect(checkGameOver({ ...baseState, gameTo: 1, team1Score: 1, team2Score: 0 })).toBe(true);
    });

    it('returns true when game is forced over', () => {
      expect(checkGameOver({ ...baseState, isGameForcedOver: true })).toBe(true);
    });

    it('returns true when game is forced over even if scores are 0-0', () => {
      expect(checkGameOver({ ...baseState, team1Score: 0, team2Score: 0, isGameForcedOver: true })).toBe(true);
    });
  });
});

describe('getWinner', () => {
  it('returns team1 when team1 has more points', () => {
    expect(getWinner(15, 12)).toBe('team1');
  });

  it('returns team2 when team2 has more points', () => {
    expect(getWinner(10, 15)).toBe('team2');
  });

  it('returns team2 when tied (edge case - should not happen in practice)', () => {
    // When tied, team1 is not > team2, so returns team2
    // This is an edge case that shouldn't occur if checkGameOver is used properly
    expect(getWinner(10, 10)).toBe('team2');
  });
});

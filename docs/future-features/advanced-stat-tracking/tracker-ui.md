# Advanced Stat Tracking — Tracker UI

> **Status**: Brainstorm / Future Feature

## Design Inversion

The basic tracker is **scoreboard → record event**. The advanced tracker should be **disc holder → tap next player**. The score is a badge, not the hero. Possession state is the primary content.

## V1 Scope: Standard Mode Only

Lock v1 to a single mode:

- Focus team tracked with full roster
- Opponent is anonymous (no opponent player identity required)
- Location tracking: TBD

This eliminates the opponent setup burden, removes all conditional UI branching, and validates the core interaction before expanding to scrimmage and both-team modes. Nothing about shipping Standard v1 closes off those modes — the store and data model already support them.

## Flow State Grid

The primary interaction model for v1.

```
┌─────────────────────────────────┐
│  ← 2      🔴 5 – 4 🔵     12 ▶ │  ← score badge + point #, small
├─────────────────────────────────┤
│                                 │
│    ┌──────┐     ┌──────┐        │
│    │ Kyle │     │ Mike │        │
│    └──────┘     └──────┘        │
│                                 │
│  ┌──────┐  ┌●●●●●●┐  ┌──────┐  │
│  │ Alex │  │ Dan  │  │ Sam  │  │  ← disc holder, large + glowing
│  └──────┘  └●●●●●●┘  └──────┘  │
│                                 │
│    ┌──────┐     ┌──────┐        │
│    │  Jo  │     │Chris │        │
│    └──────┘     └──────┘        │
│                                 │
├─────────────────────────────────┤
│  Alex → Dan ●                   │  ← mini pass chain, last 3 actions
├─────────────────────────────────┤
│   [GOAL]  [TURNOVER]  [⟲ UNDO]  │
│         [⏸ STOPPAGE]            │
└─────────────────────────────────┘
```

### Interaction rules

- **Tap any player chip** = complete throw, that player becomes disc holder. One tap, no confirm.
- **Tap GOAL then player** = goal logged. Two taps.
- **Tap TURNOVER** = expands to: drop / throwaway / stall / block. One more tap.
- The 7 chips stay in fixed positions for the entire point. No searching.
- There is no confirm step for completions. It logs on tap.

The common case (completion) is a single tap. Special outcomes (turnover, goal, stoppage) cost one or two more taps. The ratio of tap cost to frequency is right.

## Capture Now, Refine Later

Speed and attribution accuracy are in conflict. The resolution is to decouple them.

**During the point:** log the disc chain as fast as possible. No optional fields, no defender, no location. All optional attribution is skipped.

**Between points:** a brief review window shows the pass chain. The coach can optionally fix a wrong player, add a defender on a block, or mark the throwaway target. Most of the time they just tap "Start Next Point" and skip it.

This maps directly to the data model — `toPlayer`, `defender`, and location are genuinely optional on `ThrowAction`. The UI surfaces that optionality honestly rather than requiring it upfront.

## Future Modes (Post-V1)

These are deferred, not closed off.

### Both-team / Scrimmage

The grid interaction does not change for two-sided tracking — the grid always shows the 7 players with possession, and it auto-flips on turnover. The problem is setup cost: full both-team tracking requires the opponent's names entered upfront, which is friction before a game against an unknown team. Scrimmages are more tractable since both rosters are already known.

The right approach is to treat these as distinct **modes** chosen at game creation, not as independent toggles:

| Mode          | What it means                          |
| ------------- | -------------------------------------- |
| **Standard**  | Focus team tracked, opponent anonymous |
| **Scrimmage** | Both rosters known, two full sides     |
| **Full**      | Both rosters + location                |

Each mode has a fixed, opinionated UI contract. No mid-game settings. No conditional rendering based on a combination of flags. This avoids the settings complexity problem that made the basic tracker harder to reason about over time.

### Voice Input

A coach who is calling plays cannot look down to tap. Two sub-modes worth exploring:

- **Tap-to-talk**: tap anywhere on screen → 2 second window → say player name or outcome. Works better in crowd noise than ambient listening.
- **Continuous**: always listening, wake on player name. Higher ambient noise risk but truly hands-free.

The grammar is small — 7 player names plus a handful of outcomes — so recognition accuracy should be high. Would benefit from letting the coach confirm/correct name matching at roster setup.

### Location

TBD — held until the core flow is validated.

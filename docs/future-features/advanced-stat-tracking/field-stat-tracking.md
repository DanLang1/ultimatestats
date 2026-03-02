# Advanced Stat Tracking UI Concept

> **Status**: Older brainstorm / Future Feature
> **Use this for**: Interaction and flow ideas
> **Start here for current schema direction**: [data-model.md](./data-model.md)
> **Monetization**: Paid feature (one-time purchase)
> **Access**: Settings → "Advanced Stat Tracking" → Opens dedicated screen

## Overview

Full pass-by-pass tracking with optional field location data. Track every throw and catch during a point, with voice input support and real-time timeline editing.

---

## Core Requirements

1. **Active 7 Selection** - Select 7 players from roster for each point
2. **Pass-by-Pass Tracking** - Record every throw and catch
3. **Optional Location** - Track where passes occur (when convenient)
4. **Voice Support** - Say player names instead of tapping
5. **Real-time Timeline** - Review and edit during the game

---

## Input Modes

Three ways to log a pass, all equally valid:

| Mode                   | Action                      | Result                        |
| ---------------------- | --------------------------- | ----------------------------- |
| **Tap player only**    | Tap player chip             | Pass logged, no location      |
| **Tap field + player** | Tap field, then tap player  | Pass logged with x,y location |
| **Tap field + voice**  | Tap field, say "Mike catch" | Pass logged with x,y location |

**Key insight:** Location is optional per-pass. Add it when convenient, skip when rushed.

---

## Landscape Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  Point 3                                               [Your Team] 5 - 4      │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌────────────────────────────────────────────────────┐  ┌──────────────────┐ │
│  │                                                    │  │ Timeline         │ │
│  │  YOUR ENDZONE                     THEIR ENDZONE    │  │                  │ │
│  │      │                                  │          │  │ 1. Kyle      📍  │ │
│  │      ▼                                  ▼          │  │ 2. Mike      📍  │ │
│  │  ┌──────────────────────────────────────────────┐  │  │ 3. Dan ●        │ │
│  │  │                                              │  │  │                  │ │
│  │  │     ●──────●                                 │  │  │ [Edit]           │ │
│  │  │             ╲                                │  │  │                  │ │
│  │  │              ●  ← optional: tap for location │  │  └──────────────────┘ │
│  │  │                                              │  │                       │
│  │  └──────────────────────────────────────────────┘  │                       │
│  └────────────────────────────────────────────────────┘                       │
│                                                                                │
│  🎤 Say name    ──OR──    Tap player:                                          │
│                                                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Kyle │ │ Mike │ │ Dan● │ │ Alex │ │ Sam  │ │ Jo   │ │Chris │              │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                                                │
│                              [GOAL]  [TURNOVER ▼]  [UNDO]                     │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

● = current disc holder    📍 = has location data
```

---

## Flow

### Point Start

1. Select 7 active players (or use last line + quick subs)
2. Indicate who catches the pull (tap field + player, or just player)

### During Point

3. Each pass: tap receiving player (optionally tap field first for location)
4. Voice alternative: tap field, say "Mike catch"
5. Timeline updates on right side

### Point End

6. Tap GOAL or TURNOVER
7. Edit timeline if needed before moving on

---

## Line Selection (Start of Point)

Use "Last Line + Subs" approach:

```
┌──────────────────────────────────────────────────┐
│  On Field (from last point)       [Clear All]    │
├──────────────────────────────────────────────────┤
│   Kyle ✕  Mike ✕  Dan ✕  Alex ✕  Sam ✕          │
│   Jo ✕    Chris ✕                                │
│                                                  │
│   ─────────── Sub in from bench ───────────      │
│                                                  │
│   Pat    Riley    Lee    Morgan    Casey         │
│                                                  │
│   Tap ✕ to sub out, tap name to sub in           │
│                                                  │
│           [Start Point]                          │
└──────────────────────────────────────────────────┘
```

---

## Voice Activation

Mic activates when you **tap the field**:

- Short listen window (~3 seconds)
- Say player name + optional event
- Deactivates after recognition or timeout

| Say                   | Result               |
| --------------------- | -------------------- |
| "Mike" / "Mike catch" | Mike caught the disc |
| "Mike goal"           | Mike scored          |
| "Mike drop"           | Turnover - drop      |
| "Undo" / "Cancel"     | Remove last entry    |

---

## Timeline Panel

Always visible, shows current point's pass chain:

```
┌───────────────────┐
│ Timeline          │
├───────────────────┤
│ 1. Kyle      📍   │  ← has location
│ 2. Mike      📍   │
│ 3. Dan ●          │  ← current holder
│                   │
│ [+ Add]           │
└───────────────────┘
```

- Tap entry to edit player or location
- Current holder highlighted
- 📍 indicates location data exists

---

## Older Data Model Sketch

```typescript
interface PassEvent {
  type: 'pass';
  fromPlayerId: string;
  toPlayerId: string;
  caught: boolean; // false = turnover
  timestamp: number;
  location?: {
    // optional
    x: number; // 0-100, % of field length
    y: number; // 0-100, % of field width
  };
}

interface PointEvent {
  type: 'point_start' | 'point_end';
  activePlayerIds: string[]; // the 7 on field
  lineType?: 'offense' | 'defense';
}
```

---

## Derived Stats

With pass-level data:

| Stat           | Description                            |
| -------------- | -------------------------------------- |
| Completions    | Passes caught per player               |
| Completion %   | Catches / Targets                      |
| Touches        | Times player had the disc              |
| Hockey Assists | Pass before the assist                 |
| Plus/Minus     | Score differential while on field      |
| Points Played  | Count of points each player was active |

With location data:

| Stat                | Description                     |
| ------------------- | ------------------------------- |
| Heat Map            | Where catches cluster           |
| Throw Distance      | Short vs deep throws            |
| Field Progression   | How point moved up field        |
| Red Zone Conversion | Scoring efficiency near endzone |

---

## Implementation Phases

| Phase       | Description                            |
| ----------- | -------------------------------------- |
| **Phase 1** | Active 7 selection + tap-to-log passes |
| **Phase 2** | Voice input support                    |
| **Phase 3** | Optional field location tracking       |
| **Phase 4** | Advanced stats dashboard               |
| **Phase 5** | Heat maps / visualizations             |

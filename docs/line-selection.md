# Line Selection System

Documentation for the line selection and preset management features.

## Overview

The line selection system allows users to:

1. **Select 7 players** for each point (line calling)
2. **Create and manage line presets** for quick selection (e.g., "O-Line", "D-Line")
3. **View playing time** to balance player usage during a game
4. **Make mid-point substitutions**

## Architecture

### Component Hierarchy

```
app/
├── LinePromptModal.tsx      # In-game line selection modal
├── LinePresetEditor.tsx     # Full-page preset management (list + edit)

components/lines/
├── PresetListView.tsx       # List of existing presets (grid + reorder mode)
├── PresetEditView.tsx       # Edit/create a single preset
├── DraggablePresetList.tsx  # Container for drag-to-reorder mode
├── DraggablePresetItem.tsx  # Individual draggable preset row
├── ModalPlayerGrid.tsx      # 4-column player selection grid

store/
├── linePresetsStore.ts      # Zustand store for preset persistence

lib/
├── lineUtils.ts             # Player grouping & playing time utilities
├── storage/types.ts         # LinePreset, PointLineRecord types
```

---

## Key Components

### ModalPlayerGrid

**File**: [ModalPlayerGrid.tsx](file:///home/langd/coding/ultimatestats/components/lines/ModalPlayerGrid.tsx)

The core player selection grid used by both `LinePromptModal` and `PresetEditView`.

#### Features

- **Mixed team layout**: Shows 7 columns organized by gender (FMP/MMP) and role (Handler/Cutter/Hybrid/Unassigned)
  - Primary row: `mmp-handler`, `fmp-handler`, `fmp-cutter`, `mmp-cutter`
  - Secondary row: `mmp-hybrid`, `fmp-hybrid`, `unassigned`
- **Single-gender team layout**: Shows 4 generic columns (Handler, Cutter, Hybrid, Unassigned)
- **Dynamic column hiding**: Only shows columns that have players
- **Sorting**: Players sorted by playing time (asc/desc), with selected players always at top
- **Playing time display**: Shows "Xpts" subtitle when `gameActive` is true

#### Props

```typescript
interface ModalPlayerGridProps {
  roster: Player[];
  pointLines: PointLineRecord[];
  selectedIds: string[];
  onTogglePlayer: (playerId: string) => void;
  sortDirection?: 'asc' | 'desc';
  useModalColors?: boolean; // Modal vs page color scheme
  gameActive?: boolean; // Show playing time subtitles
}
```

#### Column Logic

The component determines team type automatically:

```typescript
const hasMmpPlayers = roster.some((p) => p.matchingType === 'mmp');
const hasFmpPlayers = roster.some((p) => p.matchingType === 'fmp');
const isMixedTeam = hasMmpPlayers && hasFmpPlayers;
```

- **Mixed teams**: Uses `getColumnKey()` → `${matchingType}-${role}` (e.g., `mmp-handler`)
- **Single-gender teams**: Uses `getGenericColumnKey()` → just the `role` (e.g., `handler`)

---

### PresetEditView

**File**: [PresetEditView.tsx](file:///home/langd/coding/ultimatestats/components/lines/PresetEditView.tsx)

Reusable view for editing or creating a preset. Used by `LinePresetEditor`.

#### Features

- **Inline name editing**: TextInput for preset name (max 20 chars)
- **Player count badge**: Shows selected count on save button
- **Delete button**: Only shown when editing existing preset
- **Sort toggle**: Only shown when `gameActive` (during a game)
- **Back with unsaved changes**: Handled by parent (`LinePresetEditor`)

#### Props

```typescript
interface PresetEditViewProps {
  roster: Player[];
  pointLines: PointLineRecord[];
  editingPreset: LinePreset | null; // null = creating new
  presetName: string;
  selectedIds: string[];
  gameActive: boolean;
  onPresetNameChange: (name: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onBack: () => void;
}
```

---

### PresetListView

**File**: [PresetListView.tsx](file:///home/langd/coding/ultimatestats/components/lines/PresetListView.tsx)

List of existing presets with two display modes: grid view and reorder mode.

#### Features

- **2-column grid**: Presets displayed as cards in a responsive 2-column layout (48% width each)
- **Order badges**: Each card shows its position number (1, 2, 3...)
- **Reorder mode**: Toggle via swap-vertical icon in header (only shown with 2+ presets)
  - Switches to single-column draggable list
  - Shows info text explaining that order affects in-game display
  - Presets can be edited/deleted directly in reorder mode
- **Empty state**: Shows "No presets yet" message with hint
- **Add button**: Creates new preset via header button

#### Props

```typescript
interface PresetListViewProps {
  presets: LinePreset[];
  onClose: () => void;
  onCreateNew: () => void;
  onEditPreset: (preset: LinePreset) => void;
  onDeletePreset: (preset: LinePreset) => void;
  onReorderPresets: (fromIndex: number, toIndex: number) => void;
}
```

---

### DraggablePresetList

**File**: [DraggablePresetList.tsx](file:///home/langd/coding/ultimatestats/components/lines/DraggablePresetList.tsx)

Container that manages shared animation values and drag state for the reorder view.

#### Responsibilities

- Creates and owns reanimated `SharedValue`s for gesture tracking (`draggingId`, `dragTranslateY`, `dragOriginIndex`, `dragCurrentIndex`)
- Tracks which preset is being dragged via React state (`draggingPresetId`) to conditionally disable `LinearTransition` on the active item
- Bridges drag callbacks between UI thread gestures and JS thread state updates

---

### DraggablePresetItem

**File**: [DraggablePresetItem.tsx](file:///home/langd/coding/ultimatestats/components/lines/DraggablePresetItem.tsx)

Individual draggable row in the reorder view. See [Drag-to-Reorder](#drag-to-reorder-implementation) for detailed architecture.

---

### LinePresetEditor

**File**: [LinePresetEditor.tsx](file:///home/langd/coding/ultimatestats/app/LinePresetEditor.tsx)

Full-page route for managing presets. Handles navigation and state between list/edit views.

#### Features

- **Mode switching**: Toggles between `list` and `edit` views
- **Deep linking**: Accepts `presetId` param to open directly in edit mode
- **Unsaved changes detection**: Prompts before discarding changes
- **CRUD operations**: Add, update, delete presets via `linePresetsStore`

#### URL Params

```typescript
{ presetId?: string }  // If provided, opens directly to edit that preset
```

---

### LinePromptModal

**File**: [LinePromptModal.tsx](file:///home/langd/coding/ultimatestats/app/LinePromptModal.tsx)

Modal shown during gameplay for selecting the line.

#### Features

- **Preset chips**: Quick-select from saved presets (horizontal scroll)
- **Edit presets button**: Opens `LinePresetEditor`
- **Point indicator**: Shows current point number
- **Gender ratio warning**: Shows warning when line doesn't match expected ratio
- **Substitution mode**: When `mode=substitution`, pre-fills with current line
- **7-player requirement**: Confirm button only enabled at exactly 7 players

#### URL Params

```typescript
{ mode?: 'substitution' }  // Pre-fills current line, records as substitution
```

---

## Data Types

### LinePreset

```typescript
// lib/storage/types.ts
interface LinePreset {
  id: string;
  name: string; // "O-Line", "D-Line", "Pod A"
  playerIds: string[]; // Array of player IDs in the preset
  teamId: string; // Team this preset belongs to
}
```

### PointLineRecord

```typescript
// lib/storage/types.ts
interface PointLineRecord {
  pointNumber: number;
  playerIds: string[];
  timestamp: number;
  isSubstitution?: boolean; // true if mid-point sub
}
```

---

## State Management

### linePresetsStore

**File**: [linePresetsStore.ts](file:///home/langd/coding/ultimatestats/store/linePresetsStore.ts)

Zustand store with AsyncStorage persistence.

```typescript
interface LinePresetsState {
  presets: LinePreset[];
  addPreset: (name: string, playerIds: string[], teamId: string) => string;
  updatePreset: (id: string, updates: Partial<Omit<LinePreset, 'id'>>) => void;
  deletePreset: (id: string) => void;
  removePlayerFromPresets: (playerId: string) => void;
  reorderPresets: (teamId: string, fromIndex: number, toIndex: number) => void;
  clearPresetsForTeam: (teamId: string) => void;
}
```

**Persistence Key**: `ultimatestats-line-presets`

---

## Utility Functions

### lineUtils.ts

**File**: [lineUtils.ts](file:///home/langd/coding/ultimatestats/lib/lineUtils.ts)

#### `computePlayingTime(pointLines: PointLineRecord[]): Map<string, number>`

Counts points played per player. Includes all players from substitutions.

#### `formatPlayingTime(playerId: string, playingTime: Map<string, number>): string`

Formats as "Xpts" or "Xpt" for display.

#### `sortByPointsPlayed(players: Player[], playingTime: Map<string, number>): Player[]`

Sorts ascending (least played first), then alphabetically.

#### `groupPlayersByGenderRole(roster: Player[]): PlayerGroup[]`

Groups active players by gender + role. Returns only non-empty groups in consistent order.

---

## Design Decisions

### Column Layout (ModalPlayerGrid)

1. **Mixed teams**: Full 7-column layout split into 2 rows
   - This accommodates the USAU rule where gender matching type AND role matter
   - Unassigned players are grouped separately

2. **Single-gender teams**: Simple 4-column layout
   - No gender matching type needed, just role-based columns
   - More space-efficient for men's/women's teams

3. **Dynamic columns**: Only shows columns with players
   - Avoids empty column space
   - Better use of limited screen real estate

### Playing Time Sorting (ModalPlayerGrid.sortPlayers)

1. **Selected players always first**: Makes it easy to see current selection
2. **Then by playing time**: Helps balance player usage
3. **Then alphabetically**: Stable sort for players with equal time

### Preset Selection Toggle (LinePromptModal)

- Clicking an already-selected preset **deselects** it (clears selection)
- This allows users to quickly reset and manually pick players

---

## Usage Patterns

### Opening Line Selection Modal

```typescript
// After a point ends (automatic)
router.push('/LinePromptModal');

// For substitution (manual button in GameInfo)
router.push('/LinePromptModal?mode=substitution');
```

### Opening Preset Editor

```typescript
// From LinePromptModal (edit button in presets area)
router.push('/LinePresetEditor');

// To edit a specific preset directly
router.push(`/LinePresetEditor?presetId=${preset.id}`);
```

### Filtering Presets by Team

```typescript
const teamPresets = presets.filter((p) => p.teamId === currentTeam?.id);
```

---

## Drag-to-Reorder Implementation

### Overview

Presets can be reordered via drag-and-drop in the PresetListView reorder mode. The order determines how presets appear in `PointTransition.tsx` and `LinePromptModal.tsx` during games.

### Architecture: Real-Time Swap with LinearTransition

The implementation uses a **"commit during drag"** approach rather than "commit on drop". Items swap positions in the Zustand store in real-time as the user drags, and `LinearTransition` layout animations handle the visual transitions for non-dragged items.

This was chosen over an absolute-positioning approach to avoid a visual flicker/pop on drop caused by the timing gap between resetting shared values on the UI thread and React re-rendering new positions on the JS thread.

### How It Works

1. **Gesture starts** (`onStart`): Records the item's initial index, sets `draggingId` to the preset ID
2. **During drag** (`onUpdate`): Calculates the desired index from `dragOriginIndex + round(translationY / ROW_HEIGHT)`. When the desired index crosses a threshold, triggers a **single-step swap** via `scheduleOnRN(onSwap, from, to)` which calls `reorderPresets` in the store
3. **Gesture ends** (`onEnd`): Resets all shared values. Since all swaps already happened during drag, items are at their final positions — no post-drop repositioning needed

### Key Techniques

#### Compensating translateY for layout changes

When the dragged item swaps with neighbors, its flex layout position changes (because the store array order changed). To keep the item visually glued to the user's finger:

```typescript
const layoutOffset = (dragCurrentIndex.value - dragOriginIndex.value) * ROW_HEIGHT;
transform: [{ translateY: dragTranslateY.value - layoutOffset }]
```

`layoutOffset` accounts for how far the item's natural position has shifted from swaps.

#### Conditional LinearTransition

`LinearTransition.duration(150)` is applied to all items **except** the one being dragged:

```typescript
layout={isDraggingProp ? undefined : LinearTransition.duration(150)}
```

Without this, `LinearTransition` would fight the gesture-driven `translateY` on the dragged item.

#### Single-step swaps

Instead of jumping directly to the desired index (which would skip items), swaps happen one step at a time:

```typescript
const to = from + (clamped > from ? 1 : -1);
```

This ensures every intermediate item animates smoothly via `LinearTransition`.

#### scheduleOnRN bridge

`scheduleOnRN` (from `react-native-worklets`) bridges gesture callbacks running on the UI thread to JS-thread state updates (Zustand store, React setState). This replaces the deprecated `runOnJS`.

### Store: reorderPresets

The `reorderPresets` method in `linePresetsStore.ts` filters presets by team, splices the moved item, and reconstructs the full array:

```typescript
reorderPresets: (teamId, fromIndex, toIndex) => {
  set((state) => {
    const teamPresets = state.presets.filter((p) => p.teamId === teamId);
    const others = state.presets.filter((p) => p.teamId !== teamId);
    const [moved] = teamPresets.splice(fromIndex, 1);
    teamPresets.splice(toIndex, 0, moved);
    state.presets = [...others, ...teamPresets];
  });
},
```

---

## Related Files

- [PlayerChip.tsx](file:///home/langd/coding/ultimatestats/components/ui/PlayerChip.tsx) - Individual player chip component
- [genderRatioUtils.ts](file:///home/langd/coding/ultimatestats/lib/genderRatioUtils.ts) - Gender ratio checking logic
- [gameStore.ts](file:///home/langd/coding/ultimatestats/store/gameStore.ts) - Game state including `currentLine` and `pointLines`

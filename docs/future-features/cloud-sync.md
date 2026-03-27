# Cloud Sync (Cross-Device)

> **Status**: Brainstorm / Future Feature

## Overview

Allow a user to sign in and sync their data across multiple devices. This is a **personal sync** feature — syncing _my_ data between _my_ devices. Sharing data with other people is a separate feature (see [sharing.md](./sharing.md)).

---

## Auth

- **Sign in with Apple / Google** (one-tap, minimal friction)
- Apple requires this if you offer any sign-in option on iOS
- Provides identity + account recovery for free
- Foundation for future team member management if needed
- Backend options: Supabase Auth or Firebase Auth

---

## Sync Strategy

### Games (Immutable — Union Merge)

Games are immutable once saved and have stable UUIDs. Sync is a simple union:

- Device A has games `{1, 2, 3}`, device B has `{2, 3, 4}`
- After sync, both have `{1, 2, 3, 4}`
- No conflicts possible — games are never edited after creation
- Deduplication by `game.id`

### Teams (Editable — Last-Write-Wins)

Teams can be edited, but in cross-device sync you're the only editor:

- Single-user editing means you won't be editing the same team on two devices simultaneously
- Last-write-wins by timestamp is sufficient
- On conflict (same team edited on both devices offline), use the most recent `updatedAt`

### Settings & Presets

- Last-write-wins by timestamp
- Low-stakes data, conflicts are rare and easy to re-set

---

## Sync Flow

1. User signs in on device → initial sync pulls all cloud data
2. Local changes are queued for upload
3. When online, push local changes to cloud
4. Periodically pull remote changes (or on app foreground)
5. Show last sync timestamp in UI

### Offline Behavior

- App works fully offline as it does today
- Changes queue locally until connection is available
- Background sync uploads when connection detected

---

## Schema Additions

```typescript
interface SavedGame {
  // ... existing fields
  schemaVersion: number; // ✅ Already added
  cloudSyncedAt?: number; // Last time this game was synced
}

interface SavedTeam {
  // ... existing fields
  updatedAt?: number; // For last-write-wins conflict resolution
  cloudSyncedAt?: number;
}
```

---

## Implementation Phases

| Phase | Description                               | Status  |
| ----- | ----------------------------------------- | ------- |
| 1     | Add `schemaVersion` to SavedGame          | ✅ Done |
| 2     | Add `updatedAt` to SavedTeam              | Future  |
| 3     | Integrate auth (Apple/Google sign-in)     | Future  |
| 4     | Cloud storage for games (union merge)     | Future  |
| 5     | Cloud storage for teams (last-write-wins) | Future  |
| 6     | Background sync + offline queue           | Future  |

---

## Tech Stack Options

| Need    | Option                                 |
| ------- | -------------------------------------- |
| Auth    | Supabase Auth or Firebase Auth         |
| Backend | Supabase (Postgres) or Firebase        |
| Sync    | Custom queue with AsyncStorage markers |

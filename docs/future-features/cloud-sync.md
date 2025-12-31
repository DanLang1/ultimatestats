# Cloud Sync & Team Sharing

> **Status**: Brainstorm / Future Feature

## Overview

Enable multiple users to share stats for the same team with an offline-first approach.

---

## Core Architecture: Offline-First with Sync

### Team as Source of Truth

```
Team (cloud)
├── id: string (UUID)
├── name: string
├── roster: string[] (canonical player names)
├── createdBy: userId
├── members: userId[] (people who can upload games)
└── games: SavedGame[] (uploaded by any member)
```

The **Team** becomes the shared entity. Users "join" a team, and any member can upload games.

---

## Sync Strategy: Last-Write-Wins with Conflict Avoidance

### Upload Flow

1. User finishes a game → saves locally
2. When internet available, user taps "Upload to Team"
3. Game gets `uploadedAt` server timestamp + `uploadedBy` userId
4. Server stores game under the team

### Roster Sync

- **Problem**: Two users might add different players offline
- **Solution**: **Additive merge** - rosters are unioned, not replaced

### Game Deduplication

- Use composite key: `team1Name + team2Name + createdAt (within 10 min) + finalScore`
- Or use local `gameUUID` generated at game start, checked server-side

---

## User Flows

### Joining a Team

1. Team owner shares invite code/link
2. New user enters code → becomes member
3. User gets synced roster + game history

### Recording Offline

1. Select team (loads cached roster)
2. Record game as normal
3. App queues for upload when online
4. Background sync uploads when connection detected

### Viewing Team Stats

- Aggregate from cloud (online) or cached games (offline)
- Show last sync timestamp

---

## Schema Additions

```typescript
interface SavedGame {
  // ... existing fields
  schemaVersion: number; // ✅ Added in MVP
  uploadedAt?: number; // Server timestamp
  uploadedBy?: string; // User ID
  teamId?: string; // Links to cloud team
}

interface CloudTeam {
  id: string;
  name: string;
  roster: string[];
  memberIds: string[];
  inviteCode: string;
}
```

---

## Implementation Phases

| Phase | Description                               | Status  |
| ----- | ----------------------------------------- | ------- |
| 1     | Add `schemaVersion` to SavedGame          | ✅ Done |
| 2     | Add Firebase/Supabase with anonymous auth | Future  |
| 3     | "Upload to Cloud" button                  | Future  |
| 4     | Roster sync + member management           | Future  |

---

## Tech Stack Options

| Need             | Option                                     |
| ---------------- | ------------------------------------------ |
| Offline-first DB | WatermelonDB or PowerSync                  |
| Backend          | Supabase (Postgres + Auth) or Firebase     |
| Sync             | Built-in sync or custom AsyncStorage queue |

# Sharing (Games & Teams)

> **Status**: Complete — pending Android App Links fingerprint setup

## Overview

Allow users to share games and teams with other people via universal links. This is **no-auth sharing** — recipients don't need an account to receive data. This is separate from cross-device sync (see [cloud-sync.md](./cloud-sync.md)).

---

## Core Approach: Snapshot Sharing via Universal Links

Shared data is a **point-in-time copy**. The sender shares their current version, the recipient gets an independent copy. No ongoing sync between sender and recipient.

**Delivery mechanism**: Universal links (`https://u-stat.app/s/game/<id>` or `https://u-stat.app/s/team/<id>`)

- Looks like a normal URL in messages, email, etc.
- If app is installed: opens directly in U-Stat → import screen
- If app is not installed: opens in browser → landing page with "Download U-Stat" + app store links
- Same link works on both iOS and Android

---

## Decisions Made

- **Deep links over file sharing** — least friction for users, one tap to import
- **Universal links over custom scheme** — works even if app isn't installed, looks clean
- **Server-hosted payloads** — all shared data stored as cloud blobs, link contains just an ID
- **Snapshot model** — shared data is a copy, no ongoing sync between sender and recipient
- **Team re-share prompts user** — if recipient already has the team, ask: Update Roster / Keep Mine
- **6-character alphanumeric share IDs** — short and clean in URLs (like BTD6 share codes)
- **Separate routes for game/team** — `/s/game/<id>` and `/s/team/<id>` so the Astro fallback site can differentiate without querying Supabase
- **Manual payload validation** — no Zod, manual validation in `lib/sharing/validate.ts` with caps on events (500), roster (50), and string lengths (200 chars)
- **Full page import screen** — `app/Import.tsx` is a dedicated page (not a modal) to avoid conflicts with other modals on the root route

---

## How It Works

### Sharing Flow (Sender)

1. User taps "Share" on a game or team
2. App serializes data into a `SharedPayload` JSON object (`lib/sharing/serialize.ts`)
3. App uploads payload to Supabase → receives a 6-char ID (`lib/sharing/share.ts`)
4. App builds link: `https://u-stat.app/s/game/<id>` or `https://u-stat.app/s/team/<id>`
5. Native share sheet opens → user sends via Messages, AirDrop, email, Slack, etc.

### Import Flow (Recipient)

1. Recipient taps link
2. If app installed → app opens via deep link, navigates to `app/Import.tsx`
3. If app not installed → browser opens u-stat.app → fallback landing page with download links
4. App fetches payload from Supabase, validates it, shows import confirmation with preview
5. On confirm, data saved locally (games get `importedAt` timestamp)

### Server Component

Supabase `shared_payloads` table (direct, no custom backend):

- Accepts JSON payload uploads (anonymous, no auth required)
- Returns a unique 6-char alphanumeric ID
- Serves payloads by ID
- 30-day TTL via `expires_at` column (cleanup not yet automated)
- 256KB payload size constraint
- RLS policies for anonymous insert/select

---

## Sharing Games

Games are immutable once recorded — natural fit for snapshots.

### Payload

Full `SavedGame` object (events, scores, teams, timestamps).

### Deduplication

- On import, check if a game with the same `id` already exists locally
- If duplicate found: "You already have this game" → skip import

### Payload Size — Measured

Tested with realistic mock data (`lib/__tests__/sharingPayloadSize.test.ts`):

| Scenario | Events | SharedPayload JSON |
|---|---|---|
| Short game (11 pts, 14 players) | 33 | **9.2 KB** |
| Normal game (25 pts, 14 players) | 78 | **19.4 KB** |
| Long game (35 pts, 20 players) | 102 | **26.2 KB** |
| Marathon game (45 pts, 25 players) | 134 | **33.6 KB** |
| Team only (20 players) | — | **2.1 KB** |

**Conclusion**: All payloads well under 100KB. No compression needed.

---

## Sharing Teams

### Payload

`SavedTeam` (id, name, roster with player details) + line presets for the team. Presets are included in the `SharedPayload` as an optional `presets` field. On import, existing presets for the team are replaced with the incoming ones via `importPresetsForTeam`.

### First-Time Import

No matching team `id` locally → simple confirmation → team added. After import, user can navigate directly to the team roster.

### Re-Sharing & Roster Updates

When recipient already has a team with the same `id` (captain re-shared after roster changes):

> "You already have **[Team Name]**. Do you want to update your roster to match?"
> [Update Roster] [Keep Mine]

- **Update Roster**: Replace local team with incoming version (full replace, not merge)
- **Keep Mine**: Dismiss, keep local version

---

## Share Data Format

```typescript
interface SharedPayload {
  type: 'game' | 'team';
  appVersion: string;        // sender's app version
  schemaVersion: number;     // for forward/backward compat
  sharedAt: number;          // timestamp
  data: SavedGame | SavedTeam;
}
```

### Schema Version Handling

- Recipient on older app gets data with unknown fields → ignore extra fields (forward compat)
- Recipient on newer app gets data missing new fields → fill defaults (backward compat)
- `schemaVersion` in the payload tells the recipient what to expect
- If schema gap is too large: "Update your app to import this"

---

## Link Structure

```
https://u-stat.app/s/game/<id>
https://u-stat.app/s/team/<id>
```

- `<id>` is a 6-character alphanumeric identifier
- Server returns the `SharedPayload` JSON when fetched
- Fallback landing page at same URL for browsers (app not installed)

### Deep Link Handling

`hooks/useShareLink.ts` handles both cold start (app opened via link) and warm start (link tapped while app is open). Parses both universal links (`u-stat.app/s/...`) and custom scheme (`ultimatestats://s/...`). Navigates to `app/Import.tsx` with the share ID.

### Android App Links Setup

**App side** (`app.config.js`): `intentFilters` configured with `autoVerify: true` for `u-stat.app/s/game/*` and `u-stat.app/s/team/*`.

**Website side**: Host `assetlinks.json` at `https://u-stat.app/.well-known/assetlinks.json` with the app's signing certificate SHA-256 fingerprint. Get fingerprint via `eas credentials -p android`.

> **Status**: `intentFilters` added to app config. Fingerprint setup pending — will be done when deploying to production. Currently uses custom scheme fallback via Astro landing page button.

### iOS Universal Links (Future)

Host `apple-app-site-association` file at `https://u-stat.app/.well-known/apple-app-site-association`. Not needed until iOS build exists.

---

## Security

- **Payload validation**: `lib/sharing/validate.ts` validates structure, types, and required fields without Zod
- **Size limits**: 256KB check constraint on Supabase `payload` column, plus caps on events (500), roster (50), string lengths (200 chars)
- **XSS**: Low risk — React Native `Text` components don't render HTML
- **No auth required**: Anonymous insert/select via Supabase RLS. Rate limiting via Supabase built-in protections.
- **Future considerations**: App attestation, custom rate limiting if abuse occurs

---

## Future DB Considerations

Fields to add to `SavedTeam` when cloud sync is implemented:

- `updatedAt?: number` — track last edit time (useful for last-write-wins sync)
- `importedAt?: number` — when this team was imported (vs locally created)

`SavedGame` already has `importedAt` for distinguishing imported vs locally-recorded games.

---

## Import UX

Dedicated import page (`app/Import.tsx`):

**Game import:**
> "Import game?"
> **Thunderbirds vs Rivals** — 15-12
> Recorded Jan 15, 2026 • 47 points tracked
> [Import] [Cancel]

**Team import (new):**
> "Import team?"
> **Thunderbirds** — 14 players
> [Import] [Cancel]

**Team import (existing):**
> "You already have **Thunderbirds**"
> "Do you want to update your roster to match?"
> Incoming: 16 players • Your version: 14 players
> [Update Roster] [Keep Mine]

**After import:**
- Game: "Game imported!" → Done button returns home
- Team: "Team imported!" → View Team button navigates to EditRoster

---

## Share Button Placement

**Games:**
- ViewStats screen header — share icon alongside CSV export

**Teams:**
- EditRoster sidebar — Share Team button

---

## Implementation Phases

| Phase | Description                                          | Status    |
| ----- | ---------------------------------------------------- | --------- |
| 1     | Test payload sizes with real game data               | **Done**  |
| 2     | Set up Supabase project + `shared_payloads` table    | **Done**  |
| 3     | Add `updatedAt` / `importedAt` fields to teams       | Future (when cloud sync is built) |
| 4     | Create `SharedPayload` type + serialize/deserialize  | **Done**  |
| 5     | Wire up Supabase JS SDK in app (upload/fetch)        | **Done**  |
| 6     | Android App Links (assetlinks.json + intentFilters)  | Pending fingerprint |
| 7     | Deep link handling in app (useShareLink hook)         | **Done**  |
| 8     | Build import page (app/Import.tsx)                   | **Done**  |
| 9     | Share button for teams (EditRoster sidebar)           | **Done**  |
| 10    | Share button for games (ViewStats header)             | **Done**  |
| 11    | Fallback landing page on u-stat.app                  | **Done**  |
| 12    | Payload validation + size constraints                | **Done**  |
| 13    | iOS universal links (AASA file)                      | Future (needs Mac/iOS build) |
| 14    | TTL cleanup for expired payloads                     | Future    |

---

## Key Files

- `lib/supabase.ts` — Supabase client config
- `lib/sharing/types.ts` — SharedPayload interface
- `lib/sharing/serialize.ts` — serializeGame, serializeTeam
- `lib/sharing/share.ts` — uploadPayload, fetchPayload
- `lib/sharing/shareId.ts` — 6-char alphanumeric ID generator
- `lib/sharing/validate.ts` — payload validation
- `app/Import.tsx` — import confirmation page
- `hooks/useShareLink.ts` — deep link handler
- `app.config.js` — intentFilters for Android App Links

---

## Backend

**Chosen: Supabase direct (no custom backend)**

- **Sharing**: Postgres table with auto-generated REST API (PostgREST), anonymous access via RLS
- **Future Google Auth**: Built-in OAuth provider for cloud sync
- **Future Cloud Sync**: RLS scopes data by `auth.uid()`, real-time subscriptions available
- **TTL cleanup**: `pg_cron` or scheduled Edge Function to delete expired payloads (not yet set up)

**Supabase project**: `qsfsticmgthpfwalfceq` (MCP configured in `.mcp.json`)

# Showcase Tab

A curated tab where users can browse and import notable games (e.g. notable tournament games, high-level play examples).

## Concept

- Read-only, Supabase-backed list of curated games
- Users can import a showcase game into their saved games (same path as share import — uses `importedAt`, dedup via `SavedGame.id`)
- No auth required; no user uploads initially

## Database Table: `showcase_games`

```sql
create table showcase_games (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  payload      jsonb not null,   -- SharedPayload shape (type: 'game')
  created_at   timestamptz default now(),
  is_published boolean default false
);
```

**Notes:**
- `payload` reuses the existing `SharedPayload` type so `validatePayload()` and the import machinery work without changes
- `is_published` lets you draft rows in the Supabase dashboard before making them visible in the app
- Rows are inserted manually (dashboard or service-role key); no app-side upload yet
- RLS: anon `select` only, no insert/update/delete
- Sort by `created_at desc` (newest first) — no manual sort_order needed at this scale

## Deduplication

Dedup works via `SavedGame.id` (the ID embedded in the payload), not the showcase row's UUID. As long as the payload is seeded from the original exported game JSON, the existing `useShareImport` duplicate check on line 41 handles it automatically — even if the user already has the game from a share link.

## App Changes

1. **`lib/showcase.ts`** — fetch list and single game from `showcase_games`
2. **New tab** — `app/(main)/(hub)/(showcase)/` route folder + entry in `HubTabBar.tsx`
3. **Showcase screen** — game list cards with title/description, "Load into app" action
4. **Import wiring** — reuse existing `useGameStore` import action; no new import state machine needed

## Future: User Uploads

When user uploads land:
- Add upload flow (auth will likely be required at that point)
- Row PK is already UUID, so no schema migration needed
- Will need moderation/approval layer (the `is_published` flag already supports this)

## Store Hydration Cleanup (Related)

Currently screens like `EditRoster` trigger `loadSavedTeams()` via `useEffect` on mount. This is a valid external-sync use of `useEffect`, but ideally the store hydrates itself on app start rather than waiting for a screen to mount. Worth revisiting when touching the store initialization path.

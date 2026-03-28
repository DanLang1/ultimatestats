# Showcase

A screen where users can browse and import curated games (e.g. notable tournament games, high-level play examples). Accessed from the Dashboard — not a tab.

## Concept

- Read-only, Supabase-backed list of curated games
- Users can import a showcase game into their saved games
- No auth required; no user uploads initially
- Latest import always wins — re-importing overwrites the existing saved game by ID (consistent with shared game/team import behavior)

## Database Table: `showcase_games`

```sql
create table showcase_games (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  tags         text[] default '{}',
  payload      jsonb not null,   -- SharedPayload shape (type: 'game')
  created_at   timestamptz default now(),
  is_published boolean default false,
  import_count integer default 0
);
```

**Notes:**

- `payload` reuses the existing `SharedPayload` type so `validatePayload()` and the import machinery work without changes
- `is_published` lets you draft rows in the Supabase dashboard before making them visible in the app
- `tags` is `text[]` for future filtering (e.g. `'tournament'`, `'club'`, `'college'`); unused in UI v1
- `import_count` tracks how many times a game has been imported — used for default sort, not displayed in UI v1
- Rows are inserted manually (dashboard or service-role key); no app-side upload yet
- RLS: anon `select where is_published = true` only, no insert/update/delete
- Sort: `order by import_count desc, created_at desc` (popularity with recency tiebreaker)

## RPC

```sql
create or replace function increment_showcase_import_count(p_id uuid)
returns void language sql security definer as $$
  update showcase_games set import_count = import_count + 1 where id = p_id;
$$;
```

Called fire-and-forget on import, same pattern as `increment_view_count` in `useShareImport`.

## Two-Query Approach

The list and the payload are fetched separately to keep the browse experience lightweight.

- **List query** — selects `id, title, description, tags, created_at, import_count` only. No payload.
- **Import query** — fetches `payload` for a single row by `id` only when the user taps import.

## Import Behavior

- Latest import always wins: no duplicate check, just overwrite via `importGame`
- This is consistent with how shared game/team import works
- Fire-and-forget `increment_showcase_import_count` RPC on successful import

## App Changes

1. **`lib/sharing/showcaseTypes.ts`** — `ShowcaseGameMeta` type (metadata columns only, no payload)
2. **`lib/sharing/showcase.ts`** — `fetchShowcaseList()`, `fetchShowcasePayload(id)`, `incrementShowcaseImportCount(id)`
3. **`lib/sharing/index.ts`** — barrel exports for new types/functions
4. **`lib/constants.ts`** — add `MAX_SHOWCASE_GAMES = 50`
5. **`hooks/useShowcase.ts`** — `useShowcaseGames()` TanStack Query hook; `useShowcaseImport()` hook (fetch payload → validate → importGame → fire-and-forget RPC)
6. **`app/(main)/(hub)/(home)/Showcase.tsx`** — list screen with loading/error/empty states; cards with title, description, tags, import button
7. **`app/(main)/(hub)/(home)/Dashboard.tsx`** — add entry point (button/card) navigating to `/Showcase`
8. **`components/navigation/HubTabBar.tsx`** — add `/Showcase` to `(home)` tab's `activePathnames` so home tab stays highlighted

## Shared Import Behavior Change

As part of this work, remove the `'duplicate'` blocking behavior from `useShareImport` so that re-importing a shared game/team overwrites the existing copy (latest import wins). The `'team-exists'` state may still warrant a prompt since teams are more actively edited by users.

## Future: User Uploads

When user uploads land:

- Add upload flow (auth will likely be required at that point)
- Row PK is already UUID, so no schema migration needed
- Will need moderation/approval layer (the `is_published` flag already supports this)

## Store Hydration Cleanup (Related)

Currently screens like `EditRoster` trigger `loadSavedTeams()` via `useEffect` on mount. This is a valid external-sync use of `useEffect`, but ideally the store hydrates itself on app start rather than waiting for a screen to mount. Worth revisiting when touching the store initialization path.

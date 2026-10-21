# Accounts and Team Sync

> **Status:** Design exploration, October 2026. Not implemented. Decisions marked
> **Open** are still under discussion.

## Problem and Goal

Coaches who track games for the same team currently exchange games through share links. One user
asked for finished games to appear automatically when another coach signs in. A related goal is
opening the showcase so teams can publish their own games, with a way to remove them later and to
prevent abuse.

Both needs require an identity on the server. This document proposes accounts, cloud teams, a team
game library, and showcase submissions, in that order.

## Phases

1. **Accounts and teams.** Sign in, create a cloud team, invite coaches.
2. **Team game library.** Finished advanced games tracked for a cloud team upload automatically and
   appear for every member.
3. **Showcase submissions.** A team submits one of its games to a review queue; approved games are
   public and removable by the team.

Live games for spectators and multiple trackers in one game are out of scope for this design and
should not shape its decisions.

## Principles

- **Local-first.** Tracking never requires a network or an account. Signed-out use is unchanged.
- **Accounts are optional** and only required for team sync and showcase publishing.
- **Advanced games only.** Basic games are out of scope. This avoids the basic-games SQLite
  migration as a prerequisite. The app should say clearly that team sync covers advanced games.
- **One concept of "team."** A cloud team is a saved team with a synced badge, not a second list.

## Accounts

- Sign in with Apple and Google. Apple requires an equivalent privacy-focused login when a
  third-party login is offered; Sign in with Apple satisfies that.
- Supabase Auth, since Supabase already hosts sharing and the showcase. Row-level security
  enforces ownership on the server.
- In-app account deletion is required by the App Store and cannot be blocked.

### Leaving a team or deleting an account

- Games a person uploaded stay with the team. The uploader becomes "Former member" and their
  identity is removed. Roster change history is anonymized the same way.
- An owner who leaves picks a new owner; if they skip it, ownership passes to the longest-standing
  member.
- When the last member leaves, the cloud team, its uploaded games, and its showcase games are
  deleted. Copies on devices remain.
- Recovery: anyone with local copies can sign in, turn the saved team into a cloud team again, and
  re-upload their games. The server must allow re-creating a team with a previously deleted team
  ID rather than treating it as a conflict.
- Privacy policy update for stored identity and uploaded content.

## Teams

- Every team member needs an account; membership is what the server checks for access to team
  games. Sign-in is only prompted when creating or joining a team.
- Share links are unchanged and need no account. Anyone can share personal or team games by link;
  the recipient imports a point-in-time personal copy, as today.
- A user turns a local saved team into a cloud team. The team ID and player IDs upload unchanged.
- Invites: one reusable link per team that any member can share, with a six-character code as a
  fallback. Opening it leads to sign-in, then "Join Team X." No expiry and no approval step. The
  owner can reset the link, which invalidates the old one, and can remove anyone who joins
  wrongly. Joins appear in the activity log.
- There are two roles, owner and member:

| Action                                   | Member | Owner |
| ---------------------------------------- | ------ | ----- |
| Track and upload games                   | Yes    | Yes   |
| Edit the roster                          | Yes    | Yes   |
| Invite coaches                           | Yes    | Yes   |
| Delete own uploaded games                | Yes    | Yes   |
| Delete other members' games              | No     | Yes   |
| Remove members, delete the team          | No     | Yes   |

- No viewer role for now. The team activity log is the safety net for bad edits.

### Team activity log

One log per team records roster changes, game uploads, game edits, deletions, and membership
changes, with who and when. It replaces conflict notices: last write wins everywhere, and the log
is how coaches see what changed and fix it themselves. The log stores descriptions, not copies of
old data. Roster entries include the old and new field values, since those are tiny. A per-game view of the same entries can appear in the
game timeline later.

### Linking existing local teams

Team share-link import (`importTeam`) saves the team exactly as received, so the team ID and all
player IDs match the sender's. Consequences:

- A joining coach whose local team has the same ID links automatically.
- Otherwise, joining steers the coach to the team's roster: the cloud team downloads as a new saved
  team on their phone. Their separately built local team is left untouched and is not linked.
- Games tracked with that separate local team stay local and do not join team stats. Matching
  players by name or number to relink those games is deferred; add it only if coaches ask.

## Roster Sync

The server is the source of truth for a cloud team's roster. Each phone keeps a cached copy and a
queue of pending changes, so roster edits work offline, including mid-game.

Shared player IDs are the reason for a server roster: synced games only combine into team stats if
every coach's games reference the same player IDs.

### Change model

Sync individual player changes, not whole rosters. Today's `importTeam` replaces the entire roster;
cloud teams must not do that.

| Change                                | Behavior                                                  |
| ------------------------------------- | --------------------------------------------------------- |
| Add player                            | Never conflicts; IDs are generated on the device          |
| Edit different fields of one player   | Both changes kept                                         |
| Edit the same field of one player     | Last write wins, ordered by server receipt, not phone clocks |
| Remove player                         | Deactivate only; players referenced by games are never deleted |
| Two coaches add the same person       | Duplicate players; needs a manual merge (later)           |

### Collisions

- Last write wins, with no prompt and no notice.
- The server records every change (who, what field, old and new value, when) in the team activity
  log, which is how a coach finds and restores an overwritten value.
- Known risk: voice input matches players by jersey number, so an unnoticed number overwrite can
  misattribute passes. Revisit a notice for number changes if this causes problems.

### During a live game

The live game copies roster players into its own participants, so mid-game edits apply to the game
immediately and sit in the upload queue. Changes pulled from other coaches apply between games, so
the lineup never shifts during tracking.

## Team Game Library

### Personal and team games

- **Personal games** exist only on the device, as all games do today. The owner can edit, delete,
  and share them freely.
- **Team games** are stored in the cloud and belong to the team. Every member has a synced copy and
  can edit it.
- Uploading moves a game from personal to team. It is one game with one ID, not two copies.
- Team games are downloaded to every member's phone and stored in the existing advanced-games
  SQLite storage, so viewing, analytics, and aggregate stats keep working offline and existing
  screens read them unchanged. The server is the sync point, not the place games are viewed from.
- Deleting offers "Remove from this phone" (anyone; can be downloaded again) and "Delete from team"
  (uploader or owner).
- "Delete from team" is immediate and permanent. The server clears the game data but keeps the row
  with `is_deleted` and the game ID as a tombstone. Phones remove their copy on next sync, and the
  server rejects any re-upload of that game ID, so a stale local copy cannot bring it back. Pending
  offline edits to a deleted game are discarded.
- "Copy to my games" creates a personal duplicate with a new game ID that never syncs.
- Only team games can be submitted to the showcase.

- Uploads advanced games whose focus side came from a cloud team (`focus_source_team_id`) once the
  game is finished. In-progress games stay local.
- Past games: any local game tied to the team is uploadable, including imported games. Creating or
  linking a team offers a one-time "Upload N past games" list with games that can be unchecked; the
  same games remain uploadable later. Games the team already has are skipped by game ID.
- Upload the game record (`data_json`) only. Undo history (`undo_json`) stays on the device.
- Notes are private by default and never upload. A coach can mark an individual game or point note
  "Share with team." Shared notes are stored separately from private notes, so syncing a newer
  version of a game never overwrites or exposes a coach's private notes. Shared notes are published
  with the game's edits. Showcase copies never include notes.
- Edits: any member can edit a team game. Edits stay on the phone, and the game shows an
  "Unpublished changes" badge, until the coach taps "Publish to team." Publishing warns that it
  will replace the team's copy, then uploads the whole local record. Last publish wins, ordered by
  server receipt rather than phone clocks.
- Pulls never wipe unpublished edits. If the team copy changed while a coach has unpublished
  edits, the phone keeps the local version and shows "Team version updated," with a choice to
  publish theirs (replacing the team copy) or discard theirs and take the team's.
- History: no prior game versions are stored. Each publish adds an activity-log entry with who,
  when, and a short description of the changes written by the editing phone (for example, "Edited
  a pass in point 5" or "Changed played date"). Mistakes are fixed by editing and publishing again.
- Offline: finished games queue and upload when a connection is available.
- Regular games and scrimmages both upload automatically when finished.
- The end-of-game screen has a "Save to team" toggle, on by default, to keep a single game personal.
- App versions: every `AdvancedTrackedGame` already carries `schemaVersion`, and the SQLite
  summary row stores `schema_version`. The server keeps it as a column. Phones download only games
  at or below their supported version and show "Update U-Stat to see N team games" for the rest.
  Older games are migrated on load by the existing pipeline. The server rejects an upload whose
  schema version is lower than the stored copy, so an old app cannot downgrade a game.
- Each game uploads as its own record, so the 4-game share-link cap does not apply. Per-game size
  uses the existing validation limits (see Limits).

## Showcase Submissions

- Signed-in team members submit a team game with a title, optional description and tags (the
  fields the showcase already displays), and the name privacy setting.
- Submissions start unpublished. Review is manual in the Supabase dashboard by setting
  `is_published`; no admin screen in the app for now.
- The app shows the submitter "In review," "Published," or "Not accepted," with an optional
  free-text reason.
- Members can withdraw a submission or unpublish a game at any time. Unpublishing removes the
  public copy and keeps the team game.
- Later: auto-publish for trusted teams, filters by team, tournament, or season, and team pages.
- Player names: the submitting team chooses full names, first name and last initial (default), or
  jersey numbers only. The setting applies to every side's players in the public copy only; the
  team's copy keeps full names. The owner can switch a published game to numbers only if a player
  asks to be removed.

## App Entry Points

- A Team or Account entry on the dashboard leads to sign-in, team creation and joining, members,
  the invite link, and the activity log.
- Sign-in is prompted only by actions that need it: creating or joining a team, and submitting to
  the showcase. Signed-out users never see a sign-in screen on launch.
- Exact placement and visuals are left to UI design, following `docs/ui-patterns.md`.

## Limits

Defined in `lib/constants.ts` and enforced on the server. Raising them later is safe; lowering is
not.

| Limit                | Value                                                         |
| -------------------- | ------------------------------------------------------------- |
| Members per team     | 50                                                            |
| Teams per user       | 10                                                            |
| Team games per team  | 500                                                           |
| Size per team game   | Existing advanced-game validation limits in `validate.ts`     |

## Offline Edits and Sync Architecture

Screens never talk to the server. Personal and team data use the same local stores and the same
screens; a team record differs only by a team ID and a badge.

- **Local first.** Every edit to a team game, roster, or shared note is applied to the local copy
  immediately, exactly as for personal data, so the app behaves the same online and offline.
- **What syncs automatically:** newly finished games, roster changes, and team deletions. These go
  into a persisted outbox in SQLite. A separate sync module is the only code that reads the outbox
  or calls the server.
- **What syncs on request:** edits to existing team games. "Publish to team" adds a game upload to
  the outbox, so publishing offline sends once a connection is available. Unpublished edits never
  enter the outbox.
- **Game entries coalesce.** A game outbox entry stores only the game ID and the kind (upload or
  delete). At send time the sync module uploads the current local record with its change
  descriptions.
- **Roster changes do not coalesce.** Each roster entry is a field-level change (player, field, new
  value), sent in order, because per-field last write wins depends on it. Roster changes sync
  automatically so a player added mid-game reaches every coach whose games will reference them.
- **Flush, then pull.** On app open or the sync button, the sync module sends the outbox in order,
  then pulls server changes and applies them to local storage, outside a live game.
- **Pending state.** The UI distinguishes "waiting to sync" (in the outbox, sends when online)
  from "Unpublished changes" (local only until the coach publishes).
- **Rejections.** The server can reject an entry, for example an edit to a game that was deleted
  or an upload from someone no longer on the team. The sync module drops the entry, applies the
  server's state locally (removing a deleted game), and records it in the activity log.
- **Removed members.** When a coach is removed from a team (or leaves), their team games become
  personal copies on their phone, including any unpublished edits. Their pending outbox entries
  for that team are dropped. The games keep their IDs and the cached roster becomes a local saved
  team, so the data stays intact if they later rejoin.

## Sync Timing

- Phones check for team changes on app open and when returning to the app, and from a dedicated
  sync button on the team games list.
- Nothing incoming is applied during a live game. Outgoing uploads and queued roster edits still go
  out; incoming changes apply after the game ends.
- No background sync for now.

## Open Questions

Not yet discussed:

- Expected Supabase storage cost.

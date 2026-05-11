# Advanced Tracking Voice Input

## Goal

Voice input should help coaches record common actions without replacing the existing tap workflow.
For the first MVP, voice is limited to pass commands while the tracked team has possession.

The most important product requirement is observability: users need to see what the app heard and
what action, if any, was recorded.

## Current MVP

- Push-to-talk only.
- Pass commands only, such as `Joe to Anne` or `Joe Anne`.
- Active-line context only: names are matched against the seven players on the field.
- Every successful voice pass records through the same store path as a tap pass, so the receiver
  becomes the highlighted disc holder through existing UI state.
- Unsupported commands and unclear name matches are rejected instead of guessed.

## Phase A: Live Feedback Only

No data model changes.

Show lightweight feedback in the voice action area:

- Listening state.
- Interim/final transcript, for example `Heard: Joe to Ann`.
- Successful parse/action, for example `Recorded pass`.
- Rejection reason, for example `Pass needs two players` or `Thrower is not holding disc`.

This makes voice debuggable during a point without adding settings or alias management to the live
tracking screen.

## Future Phase B: Per-Point Voice Issues

Collect unresolved voice chunks in memory during the current point. Examples:

- Heard `Ann` for a receiver but could not confidently match it.
- Heard `Katie` when the active player is `Katy`.
- Heard a pass where the thrower did not match the current disc holder.

When a goal ends the point, keep `NEXT POINT` primary and non-blocking, but optionally show a small
prompt:

`Voice had trouble with 3 names this point`

The user can ignore it and continue, or open a review surface.

## Future Phase C: Alias Review

A between-point review modal could list repeated voice issues:

- Heard `Ann` 3 times. Suggested player: `Anne`.
- Heard `Katie` 2 times. Suggested player: `Katy`.

Possible actions:

- Add alias.
- Ignore for this game.
- Dismiss.

Alias creation should always be explicit. The app should never automatically save an alias from a
recognition result.

## Future Phase D: Persistent Voice Aliases

Persistent aliases probably belong on the saved roster player record, not only on an advanced-game
participant snapshot.

Example:

```ts
{
  name: 'James Donovan',
  number: '4',
  voiceAliases: ['JD', 'J D', 'C4', 'number four']
}
```

During a point, contextual strings would include active player names plus aliases. The parser would
map any accepted alias back to the player ID.

## Matching Strategy

Recommended order:

1. Exact match against active player names and saved aliases.
2. Conservative generated variants for common speech spellings.
3. Future fuzzy matching against the active seven only.

Fuzzy matching should accept a result only when:

- The top match is above a high threshold.
- The top match is clearly better than the second-best match.
- The command grammar is otherwise valid.

If confidence is low or ambiguous, reject and show what was heard.

# Advanced Tracking Voice Input

## Goal

Voice input should help coaches record common actions without replacing the existing tap workflow.
For the first MVP, voice is limited to pass commands while the tracked team has possession.

The most important product requirement is observability: users need to see what the app heard and
what action, if any, was recorded.

## Current MVP

- Tap-to-speak. Tapping the mic starts one non-continuous recognition session and records from its
  final result. A ten-second safety window asks the recognizer to finish without immediately
  rejecting the command. Tapping again cancels the active listening window.
- Recommended commands use jersey numbers, such as `number twelve`. Receiver-only names such as
  `Anne` remain supported. The thrower is always derived from the current disc holder.
- Active-line context only: names are matched against the seven players on the field.
- Every successful voice pass records through the same store path as a tap pass, so the receiver
  becomes the highlighted disc holder through existing UI state.
- Unsupported commands are rejected. Unclear name matches are guessed when the active-line context
  gives one player a clear best score.

## Phase A: Live Feedback Only

No data model changes.

Show lightweight feedback in the voice action area:

- Listening state.
- Interim/final transcript, for example `Heard: Ann`.
- Recognition confidence is retained for candidate ranking and development logs, but is not shown
  to users. Valid number matches may record from an interim result to keep pass entry fast; name
  matches wait for the final result.
- Successful parse/action, for example `Recorded pass`.
- Rejection reason, for example `Tap who has the disc first` or `Player name is ambiguous`.
- On iOS, first-time offline recognition may require enabling and using keyboard Dictation once so
  the system installs its local speech assets. This setup guidance remains visible until retry.

This makes voice debuggable during a point without adding name-variant settings to the live
tracking screen.

## Future Voice UX: Numbers vs Names

Jersey numbers are the primary/recommended voice path because they are more reliable than short or
uncommon player names. A coach can say `number twelve`, and the parser maps that phrase to the
active player with that number.

Product direction to revisit:

- Keep names available as a natural bonus path.
- Teach number voice first in UI copy and player-chip badges.
- Consider a future setting: `Numbers only` vs `Names and numbers`.
- Do not make name-variant review the center of the experience. Numbers should carry reliability when name
  recognition is unclear.

Numbers-only voice would simplify the model and reduce name-matching complexity, but it asks
coaches to associate players with jersey numbers during live play. That tradeoff is likely good for
teams with stable numbers and weaker for pickup/practice contexts.

## Matching Strategy

Recommended order:

1. Exact match against active player names and jersey number phrases.
2. Best-effort name matching for common name variants, partial names, spoken-letter clues, and loose
   phonetic matches, scoped to the active seven.
3. Reject low-confidence matches or near-ties and show what was heard.

Best-effort matching should accept a result only when:

- The top match is above a high threshold.
- The top match is clearly better than the second-best match.
- The command grammar is otherwise valid.

If confidence is low or ambiguous, reject and show what was heard.

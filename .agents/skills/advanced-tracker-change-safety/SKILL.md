---
name: advanced-tracker-change-safety
description: Safely plan, implement, review, or test advanced-tracker behavior while preserving data integrity across capture, side attribution, analytics, persistence, and exports. Use for any change to `app/(main)/advanced-tracking/`, `app/(main)/(hub)/(analytics)/advanced-tracking/`, `components/advancedTracking/`, `hooks/advancedTracking/`, `lib/advancedTracking/`, `store/advancedTracking/`, or `.maestro/tests/advanced-tracker-*` and for changes that directly affect those routes or folders.
---

# Advanced Tracker Change Safety

Treat an advanced-tracker feature as a domain change, not only a screen change. Keep the stored
point/possession/action model canonical and derive analytics from it.

## Orient before changing behavior

Code is the source of truth: exported types, spec tables such as `THROW_RESULT_SPECS` and
`ATTRIBUTION_STAT_SPECS`, and tests describe how the tracker behaves. Docs record intent the code
cannot show.

1. Read the target code, its spec tables, and its closest tests and siblings first.
2. Read `docs/features/advanced-tracking/data-model.md` for the architecture rules (what must never
   happen), and skim the other advanced-tracking docs only when the code leaves intent unclear.
3. If a doc disagrees with the code, treat the code as current behavior and mention the stale doc;
   ask only when the intended behavior is genuinely unclear.

## Map the change surface

Before editing, name the affected surfaces and inspect each applicable one:

- capture UI, route, and tracker handler;
- source types, store transition, point/possession/action editing, undo, and validation;
- analytics compiler, player/team stats, summaries, timeline/impact, and display labels;
- SQLite persistence, schema migrations, saved-game load, import/export, and CSV;
- unit/store tests, route tests, and device workflows.

Do not add parallel counters or a second persisted representation for derived statistics. Edit docs
only to fix sentences the change makes false or to record a new architecture rule; never add doc
text that restates code (formulas, field lists, labels).

## Protect historical attribution

- Keep two generic sides; do not reintroduce hard-coded team-one/team-two assumptions.
- In scrimmages, participants may play for different sides on different points. Attribute an action
  to the side and effective line at that action's historical point, never to a participant's current
  side or a later corrected line.
- Trace lineup correction, substitution, and injury edits through validation and analytics. Preserve
  the stated policy for already-recorded actions; if the policy is not explicit in code or tests,
  ask before choosing one.
- For a new action, modifier, or stat, verify both its raw event semantics and every derived
  consumer. Do not fix a visible label while leaving the payload, analytics, impact, or export with
  the old meaning.

## Validate at the owning layer

1. Add or update a regression test at the lowest layer that owns the behavior: domain/store for
   transitions and derived data, route test for a local visible interaction.
2. Add or update a Maestro flow when the contract crosses routes, modals, native controls, gestures,
   or a multi-step tracker sequence. Follow `$maestro-advanced-tracker` for flow authoring.
3. Run the edited test directly, then the closest relevant suite. When a new flow makes a later flow
   fail, rerun each independently and in-suite; verify that seed setup clears and recreates state.
4. Run `npm run check`; use `npm run check:all` when the change spans multiple surfaces or changes
   persisted/domain behavior.

Report the change-surface coverage and any intentionally untested or unresolved edge case in the
handoff.

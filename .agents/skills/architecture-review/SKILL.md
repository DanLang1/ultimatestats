---
name: architecture-review
description: Find and plan U-Stat design improvements that reduce future maintenance, and record or carry them out through the project's review loop. Use when asked to improve architecture, sweep an area for design debt, or plan a structural refactor. Not for line-level cleanup (code-simplification) or diff correctness review (pr-review).
disable-model-invocation: true
---

# Architecture Review

Lens: _A Philosophy of Software Design_ for structure (deep modules, information hiding, pull
complexity down), Fowler's _Refactoring_ smells for naming what is wrong, Beck's _Tidy First?_ for
landing it (tidyings in their own steps, apart from behavior changes). The question for every
finding: **when the next likely change lands, how many files must someone read and edit, and how
many places can drift apart?**

Read `AGENTS.md`, `docs/README.md`, the domain docs for the area, `docs/tech-debt.md` (open work)
and `docs/decisions.md` (settled or declined design questions). Skip anything either file already
covers unless the user asks.

## What to look for

- **Same fact computed twice.** Two derivations of one rule that can drift (two timing formulas, two
  "last play" lookups, UI checks vs store guards). Highest priority: drift is a latent bug.
- **Change amplification** (shotgun surgery). A domain union whose behavior is spread over
  `switch`/`===` chains in many files, so a new variant needs edits everywhere without a compile
  error.
- **Divergent change.** One module edited for unrelated reasons, such as a helpers file holding
  lineup rules, possession state, and labels. The mirror of change amplification.
- **Logic in the wrong layer.** Pure game edits inside Zustand actions; domain derivations in
  `components/` or route files; display helpers the store depends on.
- **Information leakage.** Callers reaching into structure (`points.at(-1).possessions…`, raw
  `undoStack.at(-1)`) instead of a named query; persistence shapes known by several modules.
- **Special-general mixture.** A shared helper carrying one caller's special case; watch anything
  used by both basic and advanced tracking.
- **Shallow modules.** Pass-through functions, wide prop interfaces drilled through several
  components, one-function files that must be read together. Apply the deletion test: would
  deleting the module concentrate complexity, or just move it? Only "concentrate" is a finding.

Do not report style or naming that violates no documented convention, single-line fixes, anything
`code-simplification` owns, or anything `docs/tech-debt.md` or `docs/decisions.md` already covers.

## Patterns this repo has adopted

- **Spec tables**: `X_SPECS = {…} as const satisfies Record<Union, Spec>` next to the union
  (`THROW_RESULT_SPECS`, `PULL_RESULT_SPECS`). Semantic fields only; display data goes in separate
  tables. Prefer an explicit predicate (`isDroppedPull`) over a spec field when the rule can never
  vary.
- **Named queries over raw traversal**: `getLastPlayAction`, `getPlayOutcome`, `getPossessionEnd`.
  Callers say what they mean (`getPossessionEnd(p)?.action`).
- **One module per concept, grouped by knowledge**: e.g. `pointClock.ts` owns all active-play
  timing; split files by concept, never by "kind of code" (no `specs.ts`/`constants.ts` drawers).
- **Pure lib mutators behind a thin store**: the store keeps IDs, time, undo, persistence.
- **Shared preconditions**: one `canX`/`planX` returning a reason, read by the UI and asserted by the
  store (`canStartSecondHalfEarly`, `planCaptureIntent`).
- **Derive, don't store**: compute from recorded timestamps and actions on read; stored derived
  values drift and need migrations.
- Throw on states the type can't express but the domain forbids; render missing-but-permitted data
  as `null`/`-:--`, never zero.

## Guardrails

- **Check the write path before trusting a data shape.** Read the store guards that produce it. A
  test or fixture is not evidence a shape is possible (see test-audit "impossible data shapes").
- **Legacy data**: ask whether old shapes still matter before adding detection code. Detection is
  usually the expensive part; "keep existing data as-is" is often the right call. Record it in
  `docs/decisions.md`.
- Don't change production code to support tutorials; leave basic mode alone unless asked.
- Keep refactors behavior-preserving unless a confirmed bug is in scope; name every visible change.
- Minimal doc edits: fix only sentences a change makes false.
- Never commit, stage, or push.

## Workflow

1. **Scope** before sweeping. If the user named an area, take it. Otherwise find the hot spots and
   cross-check them against `docs/future-features/`; deepening pays off where change lands:
   ```bash
   git log --since='6 months ago' --name-only --pretty=format: -- . ':!docs' ':!*.test.*' ':!.maestro' | grep -v '^$' | sort | uniq -c | sort -rn | head -40
   ```
   Sweep those paths first; widen only if they are quiet.
2. **Sweep** (read-only): parallel subagents by area (store/lib, UI, persistence, basic). Ask for
   top findings with `file:line`, counts verified by grep, principle, direction, size.
3. **Verify** the claims you'll act on yourself; drop anything unsubstantiated.
4. **Rank** each finding Strong, Worth exploring, or Speculative by change frequency × drift risk ×
   upcoming roadmap. Prefer small, self-contained steps first. Note what is working well so the
   refactor preserves it.
5. **Record** Strong and Worth exploring items in `docs/tech-debt.md` using its entry format;
   Speculative items stay in the report. When the user declines a finding for a load-bearing
   reason, add it to `docs/decisions.md` so the next sweep does not re-suggest it; "not now" is not
   a decision.
6. **Implement one step at a time** for the user to review:
   - For a new module interface (a split, an extracted module, a new store boundary), design it
     twice: 2–3 parallel subagents each design the interface under a different constraint (fewest
     entry points; easiest common caller; room for the next roadmap feature), then compare on how
     much each hides, where change would concentrate, and where the interface sits. Recommend one.
   - For non-trivial timing/domain changes, run an independent fresh-context research subagent first
     and compare its conclusions with yours; confirm bugs with probe tests, then delete the probes.
   - Hand implementation to a subagent with a tight brief (scope, out-of-scope list, stop-and-report
     rule, test-audit bar), using the `advanced-tracker-change-safety` skill for tracker code.
   - Review the diff yourself, then run the `pr-reviewer` agent; resume the same reviewer for
     re-review until findings are fixed or consciously declined.
   - For live-tracker changes, add exploratory Maestro probes on the simulator (scratchpad flows),
     and check real data (imported games, shared payloads) when behavior changes numbers.
7. **Report** what changed, what's visible to users, what was declined and why, and what's not
   verified.

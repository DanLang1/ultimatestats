---
name: test-audit
description: Audit or sweep the U-Stat Jest suite for junk tests — tautological, implementation-coupled, cross-layer duplicative, coverage-free, or fixture self-asserting — and provide the junk-pattern bar that keeps them out. Use when explicitly asked to audit, prune, trim, or review tests, or before a large test cleanup. Do not run as a routine per-test checklist while writing features; for normal test authoring follow docs/testing.md.
---

# Test Audit

Keep the Jest suite lean and meaningful. This skill holds the **value bar**, the **junk-pattern
checklist**, the **layer-ownership rule**, and a **periodic audit workflow**. It is a reference any
agent can consult; it is not a gate on every test write.

Read `AGENTS.md`, `docs/testing.md`, and `docs/testing-map.md` first, plus the domain doc for the
area under audit. For advanced-game fixtures, use the `advanced-game-test-scenarios` skill.

## Value bar

A test earns its maintenance cost only by protecting observable behavior, an invariant, or a
credible regression. Before keeping or adding one, answer:

1. What behavior or contract does it protect?
2. What plausible failure makes it go red?
3. Why does existing coverage not already catch that failure?
4. Does it need a production seam that no production caller uses? If so, test at the real boundary.

Prefer extending a table-driven case or a shared fixture over adding a near-duplicate. A test that
breaks under behavior-preserving refactoring is asserting implementation, not behavior.

Always keep structural guards for: saved-game schema migrations, import/share payloads, analytics
and stat math, the possession/planning model, persistence, validation/security, navigation guards,
and regressions with a credible failure mode. Migrations stay immutable — add new versioned fixtures
instead of rewriting old ones. The `scripts/oxlint-plugin/__tests__/` suite is infrastructure; keep
it.

## Junk patterns (delete candidates)

- **Self-comparisons / identity copiers** — a trivial comparator, a getter returning what was just
  set, or a passthrough with no transformation (`getWinner(15, 12) === 'team1'`,
  `expect(cloneGame(x)).toEqual(x)`).
- **Expected value produced by the helper under test** — the assertion re-derives what the code
  already computed.
- **Prop-echo component tests** — render a component with props and assert those props appear, while
  a route test already renders the same component in its real screen. This is the RTL form of
  `'john' === 'john'`.
- **Cross-layer replays** — unit or component assertions that restate what `test/routes/**` or
  `.maestro/tests/**` already prove, adding no new failure mode.
- **Duplicate invocations of the same contract** — the same fixture and assertion under a second
  title (often across two files).
- **Copied fixtures, catalogs, manifests, or export lists** — e.g. `expect(factory()).toBeDefined()`.
- **Asserting local fixture literals** — `expect(game.gameType).toBe('game')`.
- **Broad snapshot dumps** of simple structures where explicit assertions are possible.
- **Over-specified exact strings/ordering** with no branch behind them, or many cases that exercise
  one branch.
- **Tests whose only purpose is keeping test-only exports, globals, or wrappers alive.**
- **Assertions that never reach the branch they claim** — e.g. "does not count self" where the
  fixture never creates a self pair.
- **Fixtures or mocks that supply the result, receipt, or ordering the production path should
  produce.**

## Layer ownership

Each contract gets one primary owner at the strongest boundary:

| Contract                                                          | Owner                            |
| ----------------------------------------------------------------- | -------------------------------- |
| Pure calculations, parsers, store actions, edge cases             | unit test (`lib/**`, `store/**`) |
| A real route's rendering, guard, accessibility, local interaction | `test/routes/**`                 |
| Device navigation, gestures, native controls, multi-screen flow   | `.maestro/tests/**`              |

A second layer needs its own distinct risk to justify a test. Maestro produces no coverage report,
so cross-layer redundancy stays a judgment call: read the route test and the Maestro flow before
claiming something is covered. Name the **keeper** test for each contract.

## Audit workflow

1. **Baseline** — run the target tests; record pass/fail before editing. A test that fails on the
   current baseline may be a product bug, not a stale test.
2. **Read-only discovery** — read every in-scope test in full plus its production owner. For large
   sweeps, split into lanes along production-owner boundaries and run parallel read-only agents.
   Mark each declaration: `R` retain (name the contract), `F` retain but repair the assertion,
   `C` consolidate into a stronger owner, `D` delete (name the remaining proof).
3. **Layer pass** — from the ledger, find redundant layers and repeated fixtures/cases; correct any
   ledger mistakes.
4. **Edit in coherent batches** — delete now-dead fixtures, imports, and test-only helpers. Prefer
   net-negative production LOC. Never inflate or chase a deletion count.
5. **Verify** — `npx jest <targets>`, then `npm run check:all`. When in doubt about a candidate,
   keep it and say why.
6. **Report** — see below.

## Guardrails

- Do not delete a test merely to reach a number.
- Do not delete a test that fails on the baseline; reproduce it as a possible product bug.
- Static or slow is not a deletion reason.
- Preserve branch coverage on pure logic: keep at least one test per distinct branch/edge.
- Do not edit tests to make a behavior change pass.
- `test/routes/**` is the RTL layer — audit it for redundancy, but it is not the default target.
- When a candidate is uncertain, keep it and record the uncertainty.

## Reporting

- Removed junk categories and examples.
- Production owner simplifications unlocked (dead exports, wrappers).
- Retained false positives and why.
- Proof run and results.
- Deletions counted separately from production changes.

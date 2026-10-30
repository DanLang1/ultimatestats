---
name: maestro-parallel
description: Run the U-Stat Maestro suite across several iOS simulators with `npm run maestro:parallel`, prepare simulators for it, and triage the failures. Use when asked to run Maestro in parallel or faster, to set up extra simulators for Maestro, or to diagnose a full-suite run where many flows fail at once.
---

# Maestro Parallel

`npm run maestro:parallel` runs `scripts/maestro-parallel.sh`, which runs maestro-runner with
`--parallel N` across the first N booted simulators named exactly `MAESTRO_DEVICE_MODEL` (default
`iPhone 17 Pro`, `MAESTRO_SHARDS` default 2). Each simulator pulls the next flow from a shared
queue. Extra arguments go after `maestro-runner test`, and `--dry-run` prints the resolved command.
Read the **Driving Simulators Directly** section of `docs/testing.md` for install, dev-launcher,
and port details.

Never start a run while another run is active on the same simulators (`pgrep -f maestro-runner`).

## Prepare simulators

1. Use the same device model **and the same iOS runtime** on every shard. On iOS 26.5 every
   `openLink` raised an "Open in U-Stat (Dev)?" system prompt, so every flow on that shard failed at
   setup. On 26.3 the prompt appears once and is remembered after **Open**. Check runtimes with
   `xcrun simctl list devices available`; create a matching device with
   `xcrun simctl create "iPhone 17 Pro" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro <runtime-id>`.
2. Shut down any other simulator of the same model so the script picks the intended ones.
3. Install the same dev-client build on every shard. Copy it from DerivedData or from another
   simulator (see `docs/testing.md`); compare `stat` dates on `UStatDev.app/UStatDev` if unsure.
4. Do the one-time first-run steps by hand rather than adding them to flows: connect the dev client
   to Metro, dismiss the dev-menu intro, skip app onboarding, then open `ultimatestats-dev:///` once
   and tap **Open**. Screenshot each simulator (`xcrun simctl io <udid> screenshot <file>`) to
   confirm it sits on the Dashboard with no prompt.

## Run

Run the suite in the background and record the wall time. The summary table lists each flow's
device; reports, `maestro-runner.log`, and per-flow failure screenshots and hierarchies
(`assets/flow-<n>/`) land in the newest `.maestro/test-output/reports/<timestamp>/`.

### Benchmarks

Full suite, iPhone 17 Pro on iOS 26.3, on an Apple M5 (10 cores, 24 GB) with Metro running.
Maestro 2.5.1 rows used `--shard-split`; maestro-runner 1.1.28 rows used `--parallel`. "Flakes" failed in the run but passed when rerun alone; each rerun costs about 20–60s.

| Date       | Runner         | Shards | Flows | Wall time | Speedup | Flakes |
| ---------- | -------------- | ------ | ----- | --------- | ------- | ------ |
| 2026-10-14 | Maestro        | 1      | 70    | 33m40s    | 1.0x    | —      |
| 2026-10-19 | Maestro        | 2      | 70    | 21m14s    | 1.6x    | 2      |
| 2026-10-20 | Maestro        | 2      | 70    | 20m13s    | 1.7x    | 1      |
| 2026-10-14 | Maestro        | 3      | 70    | 16m48s    | 2.0x    | 4      |
| 2026-10-19 | Maestro        | 3      | 70    | 17m28s    | 1.9x    | 5      |
| 2026-10-21 | Maestro        | 3      | 70    | 16m02s    | 2.1x    | 4      |
| 2026-10-21 | maestro-runner | 1      | 70    | 20m50s    | 1.6x    | 0–1    |
| 2026-10-21 | maestro-runner | 3      | 70    | 7m54s     | 4.3x    | 2      |
| 2026-10-21 | maestro-runner | 3      | 70    | 8m03s     | 4.2x    | 3      |
| 2026-10-30 | maestro-runner | 3      | 73    | 8m10s     | 4.1x    | 0      |

With Maestro, each added shard returns less: 2 shards run at about 80% per-device efficiency, 3 at
about 65%, and flakes grow with load. maestro-runner's shared queue keeps 3 simulators at about 87%
efficiency against its own single-simulator time; 2 simulators have not been measured. Add a row whenever you run a full suite at a new shard count, hardware, or
suite size, and keep the script's `MAESTRO_SHARDS` default on the best trade-off in this table.

## Triage

Group failures before reading individual flows:

- **One shard fails everything** at `maestro-setup-running is visible`: that simulator is not
  prepared (system prompt, dev launcher, onboarding). Screenshot it.
- **Scattered setup failures with the app on its splash screen**: cold launches were slower than
  the setup flow's 5-second wait under load.
- **Different results on different devices**: compare device size and dev-client build dates
  before suspecting app code.

Rerun each remaining failure alone with
`npx maestro-runner --platform ios --device <udid> --output .maestro/test-output/reports test <flow>`
on one simulator; only failures that reproduce alone are real. Without `--output`, maestro-runner
writes reports to an untracked `reports/` folder in the repo root. Read the failing command and `bounds`
in `maestro-runner.log` next to the screenshot. Under load, a menu item missing right after the menu
opens has been a load flake in both runners. Patterns seen so far:

- A tap that lands on the hub tab bar (target bounds below roughly the bottom 100pt on a phone):
  the element is visible to Maestro but covered. Add `scrollUntilVisible` with
  `centerElement: true` before the tap.
- `enabled: false` assertions failing on a `Pressable` that looks disabled: the control lacks
  `accessibilityRole`. With React Native 0.86 on iOS, a disabled `Pressable` without a role is
  reported as enabled even though taps are blocked; add the role in the component.

## Verification

Report pass counts per shard, wall time, which failures reproduced alone, and any simulator you
created, shut down, or left booted.

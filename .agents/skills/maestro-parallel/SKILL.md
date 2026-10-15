---
name: maestro-parallel
description: Run the U-Stat Maestro suite sharded across several iOS simulators with `npm run maestro:parallel`, prepare simulators for it, and triage the failures. Use when asked to run Maestro in parallel or faster, to set up extra simulators for Maestro, or to diagnose a full-suite run where many flows fail at once.
---

# Maestro Parallel

`npm run maestro:parallel` runs `scripts/maestro-parallel.sh`, which passes `--shard-split N` to
Maestro across the first N booted simulators named exactly `MAESTRO_DEVICE_MODEL` (default
`iPhone 17 Pro`, `MAESTRO_SHARDS` default 3). Extra arguments go to `maestro test`, and
`--dry-run` prints the resolved command. Read the **Driving Simulators Directly** section of
`docs/testing.md` for install, dev-launcher, and port details.

One sharded command is safe; two separate `maestro test` processes are not, because each binds
driver port 7001. Never start a run while another Maestro process is active (`pgrep -f maestro.cli`).

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

Run the suite in the background and record the wall time. Results print per shard; artifacts land
in the newest `~/.maestro/tests/<timestamp>/` with `screenshot-shard-<n>-❌-…` failure images.

Reference (2026-10-14, 70 flows): one simulator took 33m40s; three iOS 26.3 shards took 16m48s
with 4 failures that all passed when rerun alone. Expect roughly 2x, not 3x, and some load flakes.

## Triage

Group failures before reading individual flows:

- **One shard fails everything** at `maestro-setup-running is visible`: that simulator is not
  prepared (system prompt, dev launcher, onboarding). Screenshot it.
- **Scattered setup failures with the app on its splash screen**: cold launches were slower than
  the setup flow's 5-second wait under load.
- **Different results on different devices**: compare device size (`DeviceWidth` lines in
  `maestro.log`) and dev-client build dates before suspecting app code.

Rerun each remaining failure alone with `maestro test --device <udid> <flow>` on one shard; only
failures that reproduce alone are real. Read the failing command and `bounds` in `maestro.log`
next to the screenshot. Patterns seen so far:

- A tap that lands on the hub tab bar (target bounds below roughly the bottom 100pt on a phone):
  the element is visible to Maestro but covered. Add `scrollUntilVisible` with
  `centerElement: true` before the tap.
- `enabled: false` assertions failing on a `Pressable` that looks disabled: the control lacks
  `accessibilityRole`. With React Native 0.86 on iOS, a disabled `Pressable` without a role is
  reported as enabled even though taps are blocked; add the role in the component.

## Verification

Report pass counts per shard, wall time, which failures reproduced alone, and any simulator you
created, shut down, or left booted.

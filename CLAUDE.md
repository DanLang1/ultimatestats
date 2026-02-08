Reference .agent folder for instructions
See .agent/rules/general-rules.md for general rules
See .agent/skills for skills
See .agent/workflows for workflows

## Project Architecture

This is a React Native / Expo app using TypeScript. State management uses Zustand stores. When fixing state-related bugs, check the store logic and which store owns the state BEFORE making changes. Do not move state between stores without explicit user approval.

When implementing modal or overlay patterns, refer to modals.md in the project docs for the approved pattern. Use conditional overlays, not route-based modals, unless explicitly told otherwise.

## Debugging

When debugging, ask the user to confirm the bug is reproducible and verify basic assumptions (correct URL, correct build, correct state) BEFORE attempting code fixes. Do not escalate to complex solutions (refs, useFocusEffect, direct storage reads) without first ruling out simple causes.

Before implementing a fix, state your diagnosis of the root cause in one sentence and wait for user confirmation. Do NOT apply fixes for assumed causes — especially for undo/state-reset bugs where the actual issue is often a different variable not being cleared.

## UI/Layout Changes

When modifying UI layout, make ONE change at a time and describe what you're changing before doing it. Do not refactor layout structure while also changing functionality. If a layout approach isn't working after 2 attempts, stop and propose an alternative approach instead of continuing to iterate.

## Code Conventions

Prefer avoiding `useEffect` — derive state during render or use event handlers where possible. Only use `useEffect` for genuine side effects (subscriptions, data fetching on mount).

Always use top-level imports for React hooks and types: `import { useState, useEffect } from 'react'` — not `React.useState`.

## Styling Conventions

Always use theme variables for colors - never use raw hex values. When changing a visual element's appearance, confirm WHICH specific element you're modifying (e.g., 'the proceed button background' vs 'the checkmark icon color' vs 'the player chip checkmark') before making edits.

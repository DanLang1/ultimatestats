# Project Overview

U-Stat is a React Native + Expo app for tracking Ultimate Frisbee scores and player statistics.

The source tree mirrors the two tracking domains: `app/` holds Expo Router screens, and
`components/`, `hooks/`, `lib/`, and `store/` each contain `basic/` and `advancedTracking/`
namespaces alongside shared files. Basic tracking records a chronological `GameEvent[]`; advanced
tracking stores actions under ordered points and possessions. Do not mix the two models.

Tutorial code may reuse production components as-is, but production code never changes to support a
tutorial.

## Where to Look

These docs cover rules and decisions the source cannot express. Resolve routes, files, and
directory structure from the filesystem.

| Topic                    | Documentation                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which test owns a change | [testing-map.md](testing-map.md)                                                                                                                     |
| Testing patterns         | [testing.md](testing.md)                                                                                                                             |
| UI conventions           | [ui-patterns.md](ui-patterns.md)                                                                                                                     |
| Responsive/orientation   | [responsive-layout.md](responsive-layout.md)                                                                                                         |
| Advanced architecture    | [features/advanced-tracking/README.md](features/advanced-tracking/README.md)                                                                         |
| Advanced data model      | [features/advanced-tracking/data-model.md](features/advanced-tracking/data-model.md)                                                                 |
| Advanced analytics layer | [features/advanced-tracking/analytics-layer.md](features/advanced-tracking/analytics-layer.md)                                                       |
| Advanced stat utilities  | [features/advanced-tracking/stat-utils.md](features/advanced-tracking/stat-utils.md)                                                                 |
| Advanced voice input     | [features/advanced-tracking/voice-input.md](features/advanced-tracking/voice-input.md)                                                               |
| Sharing                  | [features/sharing.md](features/sharing.md)                                                                                                           |
| Android native crashes   | [android-crashes.md](android-crashes.md)                                                                                                             |
| Builds                   | [Development](build/development-build.md) / [Preview](build/preview-build.md) / [Production](build/production-build.md) / [OTA](build/eas-update.md) |
| Tech debt / future work  | [tech-debt.md](tech-debt.md) and [future-features/](future-features/)                                                                                |

## New Screen Checklist

1. Choose the orientation support tier in [responsive-layout.md](responsive-layout.md).
2. Follow [ui-patterns.md](ui-patterns.md) for headers, safe areas, modals, and component structure.

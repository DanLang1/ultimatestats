# U-Stat

U-Stat is a mobile app for tracking Ultimate Frisbee stats. I used Ultianalytics in the past but it's a little outdated, and it wasn't cross-platform. This started as a project to learn React Native and test how capable coding agents are. With the right review and direction, I've found them to be very capable in speeding up development work.

Tech stack is React Native/Expo. Can check package.json for deps list.

### Prerequisites

- Node.js 25.8.1 (see [`.nvmrc`](.nvmrc))
- An iOS Simulator, Android emulator, or physical device for native development
- A development build (can reach out to get this and .env values from next step)

### Local Setup

```bash
npm ci
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

## Common Commands

| Command               | Description                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `npm run dev`         | Start the Expo development server with the development app variant.       |
| `npm run check`       | Run formatting checks, linting, and TypeScript checks.                    |
| `npm test`            | Run Jest unit/domain and React Native Testing Library screen tests.       |
| `npm run check:all`   | Run static checks and all Jest tests.                                     |
| `npm run maestro`     | Run the core advanced-tracker Maestro end-to-end suite.                   |
| `npm run maestro:all` | Run core and extended advanced-tracker Maestro tests on an installed app. |

## Documentation

The [project documentation](docs/README.md) covers the app structure, game
tracking model, responsive layout, theming, testing, and build workflows.

## License

U-Stat is available under the [MIT License](LICENSE).

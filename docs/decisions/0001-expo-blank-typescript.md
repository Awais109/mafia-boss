# 0001. Expo blank TypeScript template, no router

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan (§3) picks React Native with Expo and TypeScript, and lays the repo out as `engine/`, `sim/`, `app/` (screens, components, store, debug), `tests/`. Expo's default template uses expo-router, which treats `app/` as file-based routes and would clash with that layout. The UI is disposable lists, so routing features aren't needed.

## Decision
- Scaffold from `create-expo-app --template blank-typescript` (Expo SDK 57), with `index.ts` registering `App.tsx`.
- Keep the plan's layout: `app/` holds screens, components, store and storage, not routes.
- Drop the template's LICENSE (it names Expo's copyright holder). Keep its `.claude/settings.json`, which enables the Expo plugin.
- Add only Expo-compatible runtime modules: `expo-file-system`, `expo-sharing`, `react-native-safe-area-context`. Dev tools: Vitest, tsx, ESLint with `eslint-config-expo`, `@types/node`.

## Consequences
- No deep links or URL routes. Tabs are plain component state ([0008](0008-app-shell-and-ui.md)).
- Adding expo-router later would mean moving the UI out of `app/` first.
- Runs in Expo Go without a native build.

## Related
`package.json`, `index.ts`, `App.tsx`, `app/`, [architecture.md](../architecture.md), [app.md](../app.md).

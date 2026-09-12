# 0008. Custom tab shell, no navigation library, one colour per resource

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §1 and §3: no art, sound or polish; zero runtime dependencies beyond Expo's own modules; the UI is disposable lists. The playtest exit criterion (plan §12) includes testers explaining the Dirty/Clean rule unprompted, so resources have to be told apart at a glance.

## Decision
- **Shell.** `App.tsx` renders a header, a horizontal scrolling tab bar, and the active screen. The active tab is plain React state, with no navigation library. Screens receive `{ game, go }`.
- **Resources.** Each has one colour and glyph everywhere: Dirty ◆ amber, Clean ● green, Influence ✦ blue, Rep ★ purple, Heat ▲ red. Dark palette, system fonts, no image assets.
- **Attention.** Tabs show a dot when something needs a player (full vault, idle crew, heat over the inspection line). A tutorial banner and a 4 s notice bar sit under the tabs.
- **Rules stay in the engine.** Screens read `derive` for every cost, rate and unlock and dispatch actions. Rejected actions come back as the engine's error text.
- **Display tick.** Every second the store reconciles to now for display, and writes only when something happened (plan §2.4).
- **Time labels.** Durations show in game time. The clock shows device time in real-time presets and the game clock in compressed ones.

## Consequences
- No deep links, back stack or transitions. Fine for a list UI; revisit if screens start nesting.
- Every visible screen re-renders once a second. Cheap at this size, worth watching if screens grow.
- Changing a rule never needs UI edits beyond copy, because numbers come from `derive`.

## Related
`App.tsx`, `app/components/`, `app/screens/`, `app/store.ts`, [app.md](../app.md).

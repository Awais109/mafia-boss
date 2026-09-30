# 0047. The warm-ledger design: bundled fonts, SVG glyphs, a bottom bar with More

- **Status:** Accepted
- **Date:** 2026-09-29
- **Supersedes in part:** [0008](0008-app-shell-and-ui.md) (system fonts and no image assets; the scrolling tab bar). Its plain-state shell, one colour per resource, and rules-in-the-engine all stand.

## Context
The playtest build was plain dark cards in system fonts, with ten tabs in a scrolling strip. A design pass (brief: `design/sevgorod-design-brief.md`; result: `design/Sevgorod Screens.html`, from Claude Design) gave the game an identity:
- data screens as a warm, printed ledger;
- story scenes as grown-up crime manga;
- the map as Lyosha's notebook.

Every drawing in the design is inline SVG: glyphs, icons, the map, portraits and manga panels. The type relies on five Google faces.

## Decision
- **Palette.** One warm-dark ramp, in `app/theme.ts`:
  - ground `#16130f`, shell `#1b1712`, card `#1f1b16`, nested `#2a251e`;
  - rules: hairline `#3b3429`, divider `#2e2820`, control `#4a4133`;
  - text: bone `#ece4d3`, muted `#ab9f89`, faint `#8c826f`;
  - brass `#c9a86a` for the accent and primary buttons, and `#e2c07a` for attention dots.

  Resource colours are unchanged from ADR 0008. Red appears only as text and outlines, never as a fill.
- **Type.** Bundled through `expo-font` from the `@expo-google-fonts/*` packages (`app/fonts.ts`):
  - Fira Sans Extra Condensed 700/800/900: display, the wordmark and screen titles;
  - IBM Plex Sans Condensed 400/500/600: everything else;
  - Patrick Hand SC, Special Elite and Caveat: speech, captions and the notebook.

  The app waits for the fonts (or a font error) before rendering the game.
- **Glyphs and icons are SVG.** They use `react-native-svg`, drawn on a 12-unit square (`app/components/Glyph.tsx`). The text glyphs (◆ ● ✦ ★ ▲ ▮ ▣ ▰) stay the source of truth in copy; `rich()` in `ui.tsx` swaps them for drawn glyphs and colours the figure after them. The story art will also be SVG, through `SvgXml`.
- **Navigation.**
  - **The bottom bar** holds five destinations: Home, Business, Fronts, Ops, Map.
  - **More** opens a bottom sheet with Crew, Heat, Stats, How it works, Log, and Debug when enabled. Each row has a one-line status.
  - Dots carry over, and More shows a dot when anything inside it has one.
- **The header's figures.** Three significant figures (22.7K, 1.00M), with the full figure one tap away. The Heat cell opens Heat.

## Consequences
- **Two new native modules,** `expo-font` and `react-native-svg`. Both are in Expo Go; a standalone install needs a rebuild.
- **The ten font files add about 2.5 MB** to the bundle.
- `react-native-web`, `react-dom` and `@expo/metro-runtime` are dependencies, so `npx expo export --platform web` builds. That build is only used to screenshot screens against the design frames; nobody plays on web.
- Every screen re-renders SVG once a second (ADR 0008's display tick). The glyphs are a few paths each; watch this as the map and portraits arrive.
- The design reference in `design/` is an input, like the two original design docs. Deviations from it are recorded here or in later ADRs, not by editing it.

## Related
`app/theme.ts`, `app/fonts.ts`, `app/components/Glyph.tsx`, `app/components/ui.tsx`, `app/components/Header.tsx`, `App.tsx`, [app.md](../app.md), `design/`.

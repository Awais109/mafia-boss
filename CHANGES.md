# Changes

One entry per notable commit: what changed, why, and where to look. Day-to-day mechanics live in
[docs/](docs/); this is a running log of what landed and when, for anyone picking the branch back up.

## 2026-09-29 — Six acts, and Act III's Centre (M8)

Branch: `feature/acts-iii-vi` (off `main` after `feature/expansion` merged). Reasoning: [ADR 0040](docs/decisions/0040-six-acts.md), [ADR 0041](docs/decisions/0041-act-iii-the-centre.md).

### What changed, for a player

- **The game has six acts now**, and the next one is always on screen: the header and Home show what it opens and every condition of its gate. Acts I–III are built; the rest follow.
- **Act II is a full act again.** It leads to Act III at ★1,200 instead of ending the game at ★610, so it lasts about three days on the bot instead of two.
- **Act III crosses the bridge to the Centre**: a Nightclub, a Card Club and a Print Shop; hotels; the Cooperative Bank, the best front yet; City Hall; the Big Score, a three-crew night's work.
- **Prosperity**: from Act III every district has a prosperity from 0 to 100, and joints earn with it. Joints and hotels lift a street, rackets sour it, and running hot, getting raided or running out of cigarettes drags the whole city down. The Card Club needs a prosperous street; the Bank a prosperous city.
- **Tier 6**, with a second greed-or-stealth choice on the way; Capo is a third perk choice.
- **An investigator** comes for the Print Shop: shut it for a day or pay three hours of the city's takings.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Six acts and their gates | `engine/systems/acts.ts` (new; replaces `checkActII` and the old Act II clear), `engine/config/schema.ts` (`Act` 1–6, `ActGate`, `progression`), `app/acts.ts` (new) |
| Prosperity | `engine/systems/prosperity.ts` (new), `engine/core/derive.ts`, `engine/core/reconcile.ts` (hourly step) |
| One check for "can I buy this?" | `racketBlocked` (`engine/systems/districts.ts`), `frontBlocked` (`engine/systems/fronts.ts`), shared by the engine and the bot |
| Shut businesses | `Racket.closedUntil`, `reopenBusinesses` (`engine/systems/rackets.ts`), `closeHours` / `dirtyHoursOfYield` choices (`engine/systems/inbox.ts`) |
| Save schema v9 | `engine/model/migrate.ts` (`v8to9`) |
| The bot | `sim/persona.ts` (sessions by act, `prosperityValues`, tier 6), `sim/report.ts` (a clear check for every built act) |
| Tests | `tests/acts.test.ts`, `tests/prosperity.test.ts`, `tests/centre.test.ts` (new); an Act III fixture in the split test; the pacing guard runs 22 days |

### Verified

- `npm run check`: typecheck, lint, 145 tests.
- `npm run sim -- --days 22 --runs 10`: Act II 3.28 d (10/10 in 3–5), Act III 6.47 d (8/10 in 6–8), heat 33.6, no raids, no missed wages. Every tuning move is in [TUNING.md](TUNING.md).
- Not yet tried on a device.

## 2026-09-14 — Live event/unlock notices, a Stats page, a How It Works page, two economy fixes

Branch: `feature/live-events-and-help` (off `feature/expansion`). Full plan and reasoning: [ADR 0038](docs/decisions/0038-live-event-notices.md).

### What changed, for a player

- **Things now interrupt you when they happen.** A job resolving, an incident, a raid, an arrest, a crew promotion, a district flip, a goal completing, reaching or clearing an act — each pops up as a modal instead of only showing up quietly in the Log or stacked on Home. If it's a decision (a report, an incident, a perk choice), you can decide right there or tap "Decide later" and it stays exactly where it already lived, on Home's "Waiting for you" list. Several things happening at once queue one after another rather than colliding.
- **Unlocking something now tells you what it does.** Every racket, front, district, and official has real descriptive text now (there was none before — just names and numbers). Crossing a Reputation threshold or reaching Act II pops a modal naming what just opened and what it's for; if several things unlock at once (like at an act transition), they're bundled into one modal instead of a flood.
- **A new Stats tab** shows everything tracked since the game started: money earned/lost/paid/missed by category, job outcomes, crew growth, raids and arrests, territory and supply — all from data the game was already quietly recording.
- **A new How It Works tab** explains the whole game to a player in plain language — the Dirty/Clean/Vault loop, what every business and front does, how crew ranks and perks work, how jobs resolve, what heat thresholds mean, how turf and rivals work. Every number in it reads live from config, so it can't go stale.
- **The vault no longer starts with money in it before you own a single business.** That 30 Dirty moved into your starting cash on hand instead — same total money to start with, just no longer sitting in an empty vault implying yield nothing has earned yet.
- **Home's "you'll come up short" warning and the Fronts page's "keep this much back" button now agree.** Previously Fronts only reserved a fixed 12-hour buffer and ignored money you already owed; it now accounts for what's actually owed, so it can't quietly let you launder past what you need for payday.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| New notice queue (events, decisions, unlocks) | `app/notices.ts` (new), `app/store.ts` (`notices` field, `dismissNotice`, wired into `tick`/`dispatch`/`refresh`) |
| Shared modal wrapper | `app/components/Modal.tsx` (new); `AwayModal.tsx` and `SkipSheet.tsx` refactored onto it |
| Live notice UI | `app/components/EventNoticeModal.tsx` (new), wired into `App.tsx` |
| Unlock descriptions | `engine/config/schema.ts` (`description` field on 4 config types), `engine/config/defaults.ts` (24 sentences written) |
| Stats screen | `app/screens/StatsScreen.tsx` (new) |
| How It Works screen | `app/screens/HowItWorksScreen.tsx` (new) |
| Vault starting money | `engine/config/defaults.ts` (`vault.startingDirty` 30→0, `startingDirtyOnHand` 90→120), logged in [TUNING.md](TUNING.md) |
| Reserve/arrears fix | `app/components/MoneyFlow.tsx`, `app/screens/FrontsScreen.tsx` |
| New tabs | `app/screens/types.ts` (`TabId`), `App.tsx` (`TABS`) |

Docs touched in the same commit, per the project's documentation rule: [ADR 0038](docs/decisions/0038-live-event-notices.md) (new) and its index row, [docs/app.md](docs/app.md) (store/shell/screens/components sections), [docs/systems/economy.md](docs/systems/economy.md), [fronts.md](docs/systems/fronts.md), [heat.md](docs/systems/heat.md), [districts-and-rivals.md](docs/systems/districts-and-rivals.md).

### Verified

- `npm run check` (typecheck, lint, 120 tests) passes.
- `npm run sim -- --days 8 --runs 10` run before and after the vault change: identical results to baseline (Act I 1.89d, Act II +3.07d, 0 missed wages) — the relocation is balance-neutral by design.
- `npm run sim -- --days 2 --no-csv` smoke-tested end to end after every change.
- Not yet tested manually on-device inside the running app (multiple simultaneous live notices, the unlock-batch modal at an act transition, both new tabs against a real save) — worth a pass before calling this done.

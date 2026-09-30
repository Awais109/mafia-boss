# After the story: past the book, the empire value, contracts

The story ends when an ending clears the final act ([endgame.md](endgame.md#the-endings)). Play carries on ([ADR 0052](../decisions/0052-after-the-story.md)): businesses tier past the book, the empire value gives a number to grow, and the council posts big contracts each week. `engine/systems/after.ts`.

**Config:** `after.*`.

## The story is over

`formulas.storyOver(state, config)`: the act is the final act, and it's been cleared. `gameCleared` reads it.

## Past the book

After the story, joints and rackets tier `after.extraTiers` past the book's last tier. The book's last tier (`formulas.bookMaxTier`) is the final act's `rackets.maxTierByAct`, so tiers run to 6 + 14 = 20 (`racketMaxTier(config, type, act, afterStory)`, `derive().maxTier`). Premises keep `rackets.premises.maxTier`; fronts keep their levels.

```
upgrade cost from tier t = purchase × costs.upgradeBaseFactor × costs.upgradeTierMult^(t−1)
                           × after.pastBookCostMult^max(0, t + 1 − book)
```

Yield grows by `tierYieldMult` a tier and heat by `tierHeatMult`, as before. Legal businesses draw no heat, so past the book suits them. Each tier bought past the book counts in `stats.after.pastBook`. The event line reads "went past the book".

## The empire value

`empireValue(state, config)` → `{ businesses, fronts, cash, income, total }`:

| Part | What |
|---|---|
| Businesses | each at what it cost: `racketValue` = purchase plus every upgrade up to its tier |
| Fronts | each at what it cost: `frontValue` = its price plus every rate and capacity level |
| Cash | Dirty + Clean + the vault, less what's owed on a loan |
| A day of income | `dayIncome` = 24 × (Dirty yield + legal Clean, after tax), before running costs |

At each day start, after the day's costs are settled (`afterDayBoundary`), the value is pushed onto `after.history`, which keeps the last `EMPIRE_DAYS` (8). A value above `after.best` becomes the best. Once the story is over, a new best (not the first) emits `EMPIRE_BEST { value }` and counts in `stats.after.bests`.

## Contracts

The council's big jobs, on a board in `after.contracts { items, refreshAt, refreshCount }`.
- **Posting** (`postContracts`):
  - The first board goes up when the story ends (`openAfterStory`, from the final act's clearing), and the next one `after.contracts.refreshDays` later, on a fixed schedule (`refreshContractsIfDue`, a reconcile boundary).
  - Each posting keeps any contract under way and adds fresh ones up to `count`, of kinds not already on the board, drawn on `rng.derive('contracts', refreshCount)` (`CONTRACTS_POSTED { count }`).
  - Terms are fixed at posting, from `after.contracts.list[kind]`: `cost` and `pay` are `costDays` and `payDays` of a day of income (at least `minDayIncome`), rounded to two significant figures; `crew`, `hours` and `gold` are as listed.
  - A contract not taken is gone at the next posting (`expiresAt`).
- **`START_CONTRACT { contractId, crewIds }`** refuses:
  - before the story is over;
  - a contract already under way, or gone from the board;
  - short of Clean;
  - the wrong number of crew, or anyone not idle.

  Otherwise it pays the Clean up front (Clean spent, so it earns Rep) and pushes a job of type `'contract'` with `contractId`, the contract's name, and `completesAt` `hours` later. The crew are on it; the board item gets `opId` (`CONTRACT_STARTED`). `contractBlocked` gives the reason for the app and the bot.
- **Done** (`resolveContract`, from `resolveOp`): nothing is rolled.
  - The crew come back, and the contract leaves the board.
  - Its `pay` is Clean earned, and its `gold` comes as `GOLD_GRANTED { source: 'contract' }`.
  - Counted in `stats.after { contracts, contractClean, contractGold }` (`CONTRACT_DONE`).
- **No rushing:** `RUSH_OP` refuses a contract ("A contract takes the time it takes").

| Contract | Crew | Hours | Up front | Pays | Gold |
|---|---|---|---|---|---|
| Rebuild the tram depot | 2 | 72 | 0.5 d | 1.5 d | 6 |
| Fix the Blocks' boiler house | 2 | 48 | 0.4 d | 1.25 d | 5 |
| Dredge the port channel | 3 | 96 | 0.75 d | 1.8 d | 8 |
| Light the bridge | 1 | 24 | 0.2 d | 0.6 d | 3 |
| Reroof the Palace of Culture | 2 | 60 | 0.5 d | 1.4 d | 5 |
| Start the station clock | 1 | 36 | 0.3 d | 0.8 d | 4 |

(d = days of income.) What each is for, in the story's words, is `CONTRACT_TEXT` in `app/story.ts`.

## Saves

Schema 17: `after` and `stats.after`. A v16 save gets an empty board. If its story was already over, the board's `refreshAt` is the save's `updatedAt`, so its first posting comes on the next reconcile. It also gets no history or best yet: the next day start records one. `shiftTimes` shifts the board, the history and `stats.endings`.

## The bot

It takes every contract its Clean covers, with its idle crew of lowest stat total, before dispatching jobs, and never rushes one. Tiers past the book are upgrades like any other in its spending, under its heat budget. Over 5 seeds it does 3–7 contracts and buys about 60 tiers past the book between the ending and day 60 ([TUNING.md](../../TUNING.md)).

**Tests:** `tests/after.test.ts`:
- tiers stop at the book until the story is over, then go past it at the dearer price, up to the cap; premises keep theirs;
- the empire value's parts, and a business at cost;
- the history at day starts, and a new best only after the story;
- the first board, and its terms in days of income;
- a contract's crew and Clean, no rushing, and its Clean and gold when done;
- the weekly posting keeping one under way;
- split invariance with a contract done and a posting;
- a v16 save's first board;
- the clock shift.

`tests/sim.test.ts` checks that every seed does a contract, buys a tier past the book and sets a best after the story.

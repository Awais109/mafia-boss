# The endgame: Legalize, the Holding, the reckoning and the endings

Act VI turns the game's one rule around: money with a story needs no front. A business made legal earns Clean directly. The past keeps its books, though, and hearings come while any of the business is still illegal. The game has two endings, both recorded, neither final ([ADR 0045](../decisions/0045-act-vi-nagornaya.md)).

**Code:** `engine/systems/legal.ts` (`legalOn`, `legalizeCost`, `legalizeBlocked`, `legalize`, `caseFile`, `illegalShare`, `hearingChance`, `reckoningDayBoundary`, `endingMet`, `checkEndings`); legal businesses and the Holding in `engine/core/derive.ts`; legal Clean in `accrue` (`engine/core/reconcile.ts`); the hearing's effects in `engine/systems/inbox.ts`; `freezeBusiestFront` in `engine/systems/politics.ts`. App: the Legalize button on Business, `app/components/ReckoningCard.tsx` on Turf.
**Config:** `legalize.*`, `reckoning.*`, `rackets.types.holding` (`legalBonusPerTier`), `districts.list.nagornaya` (`grantedOnOpen`, `lotsFor`), `incidents.types.hearing`.

## Nagornaya

The hills: no spots, one lot, for the Holding. It has `grantedOnOpen`: when Act VI opens, it's yours. There's no one to buy it from.

## Legalize

`LEGALIZE { racketId }` from `legalize.fromAct`, for a joint or racket ("Premises have nothing to make legal"), not already legal, while opinion is at least `legalize.minOpinion` ("The city won’t stand for it: opinion N needed"; [politics.md](politics.md)). It costs `round(legalize.hoursOfYield × tier yield)` in Clean (Clean spent: it earns Rep). It sets `Racket.legal`, counts `stats.legalized` and emits `LEGALIZED { racketId, cost }`.

A legal business, in `derive`:

```
yield       = 0                                  (nothing into the vault; the vault cap follows the Dirty yield that's left)
exposure    = 0,  tribute = 0
legalClean  = grossYield × legalize.cleanShare × holdingMult          (the rest is tax)
holdingMult = 1 + legalBonusPerTier × tier × condition/100            (the Holding)
```

`accrue` adds `Derived.legalCleanPerHr × hours` to Clean (`stats.cleanEarned`, `stats.legalClean`). Its gross still counts toward the Ministry's attention (`Derived.legalGrossPerHr`).

## The reckoning

**The case file** (`caseFile`): `raids × perRaid + arrests × perArrest + frontsFrozen × perFreeze + loans.missed × perMissedPayment`, at most `reckoning.maxCase`. It's a lifetime record: nothing takes it down.

**Hearings.** At each day start from `reckoning.fromAct`, after the loan payment, `reckoningDayBoundary` files a `hearing` incident with chance `min(1, base + perIllegalShare × illegal share)`, on `rng.derive('hearing', day)`. The illegal share is the Dirty yield and tribute over that plus legal gross; with nothing illegal, no hearing comes. It files one hearing at a time, and a hearing waits `incidents.types.hearing.hours` (most of a day, so a once-a-day visit can answer it and it's gone before the next roll). The options ([inbox.md](inbox.md)):

| Option | Effect |
|---|---|
| Let it run (default) | `freezeHours`: the front moving the most money is frozen for that long ([fronts.md](fronts.md)) |
| Settle, in Clean | `cleanHoursOfYield` × gross yield per hour, legal included, fixed when filed |
| Fight it in court | a Brains contest against `diff + perCase × case file`: win `rep` and `hearingWon` (`stats.hearings.won`); lose, the freeze |

`stats.hearings.held` counts those filed.

## The endings

`checkEndings` runs with every act check, after every action and at every boundary:

- **The Holding:** every joint and racket is legal.
- **The Empire:** every district is yours, and `reckoning.empireWins` hearings have been won in court.

Each is recorded once, in `stats.endings[ending]`, with `ENDING_REACHED { ending }`. The first clears Act VI (`stats.actClearedAt[6]`, `ACT_CLEARED`). Play carries on either way.

## The bot

In Act VI it buys every district it can afford. Legalizing is a spend option worth its legal Clean × 2 (its Dirty mostly sat idle), with the heat it sheds as a negative heat cost. The Holding is worth its bonus on the legal Clean, counting half of what isn't legal yet. A frozen front costs the Clean the busiest front would have washed. A hearing won is worth `hearingWinHours` of yield while the Empire still needs wins. In practice the bot legalizes everything and fights most hearings; it usually reaches the Holding first, and now and then the Empire ([sim.md](../sim.md#the-casual-bot)).

**Tests:** `tests/nagornaya.test.ts`, `tests/reconcile.test.ts` (an Act VI game with legal businesses, the Holding and a possible hearing), `tests/migrate.test.ts`.

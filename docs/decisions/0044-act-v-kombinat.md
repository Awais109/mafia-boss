# 0044. Act V, the Kombinat: the auction, public opinion, the Ministry and elections

- **Status:** Accepted
- **Date:** 2026-09-29

## Context
The six-act proposal (ADR 0040, the economy note) gives Act V to the tobacco Combine upriver and to politics: privatization as the biggest purchase in the game, public opinion as a city-wide prosperity that media buy, a Ministry in the capital that local control can't touch and that freezes a front at its peak, and weekly elections that make the player mayor. The story bible reveals one district, the Kombinat, whose lots hold the Combine line, the Newspaper and the TV Station, and whose opponent is Golovin, the director. The proposal flagged the Ministry as the riskiest piece: a second heat-like track.

## Decision
- **An auctioned district.** The Kombinat starts as `controller: 'state'` with `auction: true`: it can only be bought outright (`buyout` is the auction price), it can't be pressured, and nothing is built in it until it's yours. Its lots take only the Combine, the Newspaper and the TV Station (`lotsFor`), and those three go nowhere else (`onlyIn`). Otherwise the act's premises would be crowded out: by Act V every other lot in the city is full.
- **The Combine** is a premises that makes both products (`makesPerHr`, `premiumMakesPerHr`) with a payroll-sized upkeep. The proposal had it *replace* every factory; this build doesn't shut the player's factories, since that would take away something paid for. It outproduces them, and the premium it makes eases the convoy grind.
- **Public opinion** (0–100) steps hourly toward `base + media and Palace per tier + the Development Fund's utilization − inspection and raid penalties`, like prosperity. It multiplies control, pays the Construction Trust, relieves the Ministry and wins votes.
- **The Ministry** steps hourly toward `perYield × the operation's yield − the Governor − opinion`. At `freezeAt` on a whole hour it freezes the front moving the most money for `freezeHours` (deterministic, no roll: the player can watch it coming) and falls back to `afterFreeze`. A frozen front launders nothing and takes no deposits. Bribes and the other officials don't touch it.
- **Elections** every `everyDays` from the act's opening, one seeded count each (`rng.derive('election', index)`): vote share is `baseShare + perOpinion × (opinion − 50) + perPoint × points ± noise`. Points come from `CAMPAIGN` (Dirty at hours of yield per point, or Influence) and from the Deliver the Vote job, capped at `maxPoints`, and are spent at the count. Absence spends nothing and never loses an office. Winning is permanent: no tribute, district perks × `perkMult`, `mayor.control` added, no more elections.
- **The Governor only takes calls from the mayor** (`needsMayor`), as the story bible has it. That makes the Ministry a real pressure before the first win: opinion is the only relief until then.
- **Act V's gate out** is Rep and `mayor: true` (`ActGate.mayor`); `progression.finalAct` is 5.
- Also: the Palace of Culture (a joint selling both products that adds opinion), the Construction Trust (a racket paid by opinion), the Development Fund (the best front, which adds opinion as it runs), Fix a Tender (a Brains job) and Deliver the Vote (campaign points, heavy heat).

## Consequences
- The bot buys the Development Fund and the Kombinat on loans within four days of the act opening, then the media and the Combine. It wins the first election in about a third of runs (its media come too late for the rest) and the second otherwise. Act V clears in 10–10.5 days or at 14.0 (mean 12.9, 10/10 in 10–14). Heat over the act is about 28 (TUNING.md, M11).
- The Ministry freezes a front 3–12 times over a 50-day bot run, mostly after the election, when yield outgrows the Governor and a full opinion. It's the pressure Act VI inherits.
- Campaigning with Dirty is the first large sink for the Dirty that piles up in the late game.
- The Palace of Culture and the media together take opinion to 100 in about a week. After that, opinion stops being a choice. Act VI's Legalize (which needs opinion) gives it a second use.
- Save schema v12: `politics`, `Front.frozenUntil` (shifted by `shiftTimes`, as is `nextElectionAt`), the Kombinat's row, the election and campaign counters.

## Related
`engine/systems/politics.ts`, `engine/core/derive.ts`, `engine/core/apply.ts` (`CAMPAIGN`, `BUY_OFFICIAL`, `DEPOSIT`, `DEBUG_HOLD_ELECTION`), `engine/core/reconcile.ts`, `engine/systems/districts.ts` (`racketBlocked`, `premisesBlocked`, `canPressure`), `engine/systems/ops.ts` (`addVotes`), `engine/systems/acts.ts`, `app/components/PoliticsCard.tsx`, `sim/persona.ts`, [politics.md](../systems/politics.md), [districts-and-rivals.md](../systems/districts-and-rivals.md), [ADR 0040](0040-six-acts.md), [ADR 0043](0043-act-iv-zastava.md).

# 0041. Act III, the Centre: prosperity, tier 6 and the first half of the act

- **Status:** Accepted
- **Date:** 2026-09-29

## Context
The expansion plan designed Act III (section 14) without building it: the Centre district, prosperity per district, the Card Club and Print Shop, Hotel Sevgorod, the Cooperative Bank, City Hall, the Big Score, tier 6 with a second specialization, and a second perk at Capo; plus loans, injuries and rival attacks. This record covers the first half; credit, injuries and attacks follow in the next milestone with their own record.

## Decision
- **The Centre** (`districts.list.centre`, act 3, nobody's): the Nightclub and Card Club (joints) and the Print Shop (racket), two premises lots. A Nightclub was added to the design so the district has something to open before its street is prosperous enough for the Card Club.
- **Prosperity** per district, 0–100 (`prosperity.*`, [prosperity.md](../systems/prosperity.md)). It steps toward its target at whole hours, not continuously, so yield stays constant inside a reconcile segment and splits agree. The target is a base plus each business's `prosperity`, which is **positive for joints and negative for rackets**. That's a change from the plan, which only listed joints: it makes a street a choice between money now and money later. Hotels add `prosperityPerTier`. Inspections, a recent raid and a shortage subtract city-wide. Joints earn × `lerp(0.7, 1.3, p/100)`. When Act III opens, every district starts at its target, and the base is set so an Act II district lands near 50, so the act opens without a cliff.
- **Requirements**: the Card Club needs its street's prosperity (`minProsperity`); the Cooperative Bank needs the city's, the mean over districts where you run a joint or racket. Both checks live in `racketBlocked` and `frontBlocked`, which the engine and the bot share.
- **Hotel** (premises, one per district): lifts its district's prosperity per tier, and its `hotelJoints` synergy lifts every joint beside it.
- **Tier 6**: joints and rackets go to tier 6 from Act III (`rackets.maxTierByAct`). The upgrade to it is a second greed-or-stealth choice (`rackets.specialization6`, `Racket.specialization6`), which multiplies on top of the tier-3 one. The plan's stealth option at tier 6 made the enforcer wage-free; the same greed/stealth shape was simpler to read and to value, so both choices keep it. Premises stay at `rackets.premises.maxTier`.
- **The investigator**: an Act III incident (`investigation`, needs a working Print Shop) names the shop. Close it for a day (the default; `closeHours`) or pay three hours of the city's income (`dirtyHoursOfYield`, fixed when the item is filed). A shut business (`Racket.closedUntil`, a reconcile boundary) earns, sells and heats nothing, and adds nothing to prosperity, until it opens again (`RACKET_CLOSED`, `RACKET_REOPENED`).
- **City Hall** (official, act 3) and **the Big Score** (an eight-hour, three-crew job) as planned. Capo now files a perk choice like Soldier and Made.
- **Numbers** (tuned, [TUNING.md](../../TUNING.md)): Act III businesses cost 40 hours of their yield (`costs.paybackHoursByAct[3]`); the unlock ladder runs from ★1,220 to ★2,400; City Hall's control is 1,300, because 400 left a tier-6 portfolio at heat 45; Act IV's gate is ★9,000, just under what the Centre's catalogue can earn (about ★10,200 on the bot).

## Consequences
- On the bot, Act III takes 6.5 days (target 6–8), with heat in the act near 37. The Bank arrives about three days in, later in seeds whose city is slow to prosper.
- A player who runs hot or gets raided loses income on every joint in the city, so heat management and the supply chain now reach the vault through prosperity.
- Streets full of rackets fall well below 50: the Port Quarter settles in the 20s. That's intended, but a player who ignores prosperity earns less from joints in Act III than in Act II.
- The Print Shop is the best racket in the Centre and the only business an incident can shut.

## Related
`engine/systems/prosperity.ts`, `engine/systems/districts.ts` (`racketBlocked`), `engine/systems/fronts.ts` (`frontBlocked`), `engine/systems/rackets.ts` (`reopenBusinesses`), `engine/systems/inbox.ts`, `engine/core/derive.ts`, `engine/core/apply.ts` (`UPGRADE_RACKET`), `engine/systems/experience.ts`, `sim/persona.ts` (`prosperityValues`), [prosperity.md](../systems/prosperity.md), [economy.md](../systems/economy.md), [ADR 0027](0027-tier-3-specialization.md).

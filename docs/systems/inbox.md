# Inbox: crew reports and incidents

Pending decisions. Every job that comes back files a report with a fork, and one or two things a day happen to the player and ask for an answer. Each item offers 2–3 options with their effects spelled out, and a default that applies if nobody answers in time, so an absence never blocks the game ([ADR 0024](../decisions/0024-inbox.md)).

**Code:** `engine/systems/inbox.ts` (`fileReport`, `rollIncident`, `raiseIncident`, `incidentEligible`, `incidentNeedHolds`, `sendOnErrand`, `resolveErrand`, `canAffordEffects`, `resolveInboxItem`, `autoResolveInbox`, `materializeChoice`, `contestFighter`, `contestOdds`), the `RESOLVE_INBOX` and `DEBUG_FORCE_INCIDENT` handlers in `engine/core/apply.ts`. App: `app/inbox.ts`, `app/components/InboxCard.tsx`, Home.
**Config:** `inbox.*`, `ops.reports.*`, `incidents.*`.

## Items

`state.inbox: InboxItem[]`:

| Field | Meaning |
|---|---|
| `kind` | `report`, `incident` or `perk` (a promotion's perk choice) |
| `ref` | the job type, incident type or crew id |
| `crewIds`, `racketId` | who and what the loyalty, condition and busy effects apply to |
| `createdAt`, `expiresAt` | filed at, and when the default applies |
| `options` | `{ id, name, effects }`; effects are `dirty`, `clean`, `influence`, `rep`, `heat`, `loyalty`, `condition`, `disposition`, `cigarettes`, `perk`, and the ones below (`closeHours`, `injureHours`, `freezeHours`, `hearingWon`, `opinion`, `attention`, `busyHours`, `contest`) |
| `defaultOptionId` | the option applied at expiry |

Effects are **materialized when the item is filed**: a report's "−25% of the job's Dirty" is stored as a number. The save is self-describing, and a replayed log doesn't depend on later config edits.

## Crew reports

`fileReport` runs at the end of `resolveOp` for every job whose band is in `ops.reports.bands` (training jobs never file). The options come from `ops.reports.byOutcome[outcome]`:

- `dirtyPct` is a share of the job's Dirty reward, so the options move value around rather than add it.
- `dirtyPerAct` is a flat amount × act.
- `dirtyHoursOfYield` is that many hours of the city's Dirty yield at filing time (the investigator's price).
- `dirtyPerDue` and `cleanPerDue` are that many times the amount the item is about (a defaulted loan, a missed payment; [credit.md](credit.md)).
- `cleanHoursOfYield` is that many hours of gross yield (Dirty, tribute and legal together) in Clean: a hearing's settlement ([endgame.md](endgame.md)).
- A contest's `perCase` adds that much difficulty per point of the case file the item was filed with (hearings).
- `condition` × `stashConditionMult` when a Stash House shares the named business's street.
- A `contest`'s branches are materialized the same way, and its `enforcerBonus` comes off its difficulty when the named business has an enforcer.
- The other fields are copied as they are, including `closeHours` (shut the business named on the item for that long), `injureHours` (hurt the crew member who fought), `freezeHours` (freeze the front moving the most money for that long, `freezeBusiestFront`), `hearingWon` (count a hearing won toward the Empire), and `opinion` and `attention` ([the city's story](#the-citys-story)).
- `busyHours` is kept only when the item names someone.
- An option's name may hold `{crew}`, filled with the named member's first name ("Send Sasha to listen"), or "someone".

Reports always file, even during the tutorial. They expire after `inbox.reportHours`.

## Incidents

`rollIncident` runs at every whole hour, after the heat checks, on `rng.derive('incident', hourIndex)`:

1. Skipped while the tutorial isn't done, before `createdAt + incidents.startAfterHours`, or when `inbox.maxPending` incidents are already waiting. Reports and perk choices don't count toward that limit.
2. With chance `incidents.chancePerHr`, pick uniformly among the eligible types (`incidentEligible`): not `filed`, `act ≤ state.act ≤ lastAct` (when it has one), and `needs` holds: `idleCrew`, `joint` (any joint), `factory` (a premises that makes packs), `inspected`, `printShop` (a Print Shop that isn't shut), `afterStory` (the story is over, [after.md](after.md)).
3. `raiseIncident` files it. An `idleCrew` incident, or one with an option that sends someone, names one idle crew member, who takes its loyalty and busy effects; a `printShop` incident names the shop (`racketId`), which takes its condition and `closeHours` effects.

The Act III investigator (`investigation`, [ADR 0041](../decisions/0041-act-iii-the-centre.md)): close the Print Shop for a day (default) or pay three hours of the city's income.

Incidents expire after `inbox.incidentHours`, or their own `hours` when the type sets it (a hearing waits 23 hours).

## The city's story

([ADR 0054](../decisions/0054-the-city-story.md)) Decisions about the city, from the designs for Home in Act V and after the story:

| Incident | When | Options (default last) |
|---|---|---|
| `frontPage`: The Newspaper has two front pages | from Act V | Buy the front page (1.5 h of gross income in Clean, +4 opinion); Let him choose (−3 opinion) |
| `workersAtGate`: Golovin's workers are at the gate | Act V only (`lastAct`) | Pay a month (3 h in Clean, +5 opinion, +6 Ministry); Send {crew} to listen (+2 opinion, busy 4 h); Leave them to Golovin (−4 opinion) |
| `schoolRoof`: School No. 14 wants a roof | after the story (`afterStory`) | Pay for the roof (3 h in Clean, +★180); Send {crew} with tar (0.35 h in Clean, busy 6 h); Pass it to the council (−2 opinion) |

- **Opinion and attention:** `opinion` and `attention` move `politics.opinion` and `politics.attention` now, within 0–100. They drift back toward their targets at the usual hourly rate ([politics.md](politics.md)).
- **Busy:** `busyHours` sends the named member on an errand (`sendOnErrand`), if they're still idle when it's chosen: a job of type `'errand'` named after the incident, `completesAt` that many hours on. It resolves through `resolveOp` → `resolveErrand`, bringing nothing back but them (`ERRAND_DONE { opId, crewIds, name }`, quiet in the Log). `RUSH_OP` can finish one early.

## Filed incidents

Some incidents come from a system rather than the hourly roll (`filed: true` keeps them out of it): `attack` (Tolya's boys, at his visits from Act III; [districts-and-rivals.md](districts-and-rivals.md#tolya)), `collectors` (a missed loan payment) `lendingDefault` (a borrower who skipped town; [credit.md](credit.md)) and `hearing` (the reckoning, at day starts from Act VI; [endgame.md](endgame.md)). `raiseIncident` takes what they're about: the business (`racketId`), the amount (`due`) and the case file (`caseFile`).

## Contests

([ADR 0042](../decisions/0042-act-iii-credit-and-consequences.md)) An option's `contest { stat, diff, win, lose }` resolves when it's chosen. `contestFighter` picks the best available crew member for the stat (idle first, then an enforcer; none means a loss). They roll `effective stat + U(−ops.noise, ops.noise)` on `rng.derive('contest', itemId)`, once per item; at least `diff` wins. The branch applies like any option's effects, with the fighter as the one `injureHours` hurts. `CONTEST_RESOLVED { itemId, stat, diff, won, crewId?, name? }`; `stats.contests { won, lost }`. `contestOdds(state, config, contest)` is the closed form the card shows and the bot uses. A default option can't be a contest, and contests don't nest.

## Perk choices

When a crew member reaches Soldier, Made or Capo, `filePerkChoice` in `engine/systems/experience.ts` files a `perk` item for them ([crew.md](crew.md#experience)): `crew.experience.perkChoices` perks they don't hold, drawn on `rng.derive('perk', crewId, rank)`, each option's effect `{ perk }`, the first as default. It expires after `inbox.perkHours`. Applying the option adds the perk to the member (if they're still on the crew and don't have it) and emits `PERK_CHOSEN { crewId, name, perk }`. Perk items don't count toward `maxPending`, and a perk costs nothing, so the default is always safe.

## Answering and expiry

- `RESOLVE_INBOX { itemId, optionId }` applies the option. It's rejected with "You can’t cover that" when the option costs more Dirty or Clean than the player holds.
- `autoResolveInbox` runs in `processDue` and applies each expired item's default, oldest first. Every `expiresAt` is a reconcile boundary, so splits agree.
- Validation (`validateConfig`) requires 2–3 options per list, unique ids, exactly one default, and a default that never costs Dirty, so an unanswered item never asks for money a player may not have. A default may lose packs (the Bad batch burns them), because stock only falls to zero ([ADR 0032](../decisions/0032-supply-chain.md) amends ADR 0024 here).

Effect rules: Dirty can't go below zero (the change is recorded in `stats.inboxDirty`); heat is clamped to 0–100; packs go into or out of stock, never below zero or above the cap; loyalty applies to each named crew member still on the crew; condition and `closeHours` to the named business (`RACKET_CLOSED`); `disposition` is Tolya's; Rep only adds.

## Events

- `REPORT_FILED { itemId, opId, opType, outcome, expiresAt }` (quiet in the Log)
- `INCIDENT_RAISED { itemId, incidentType, crewId?, racketId?, expiresAt }`
- `INBOX_RESOLVED { itemId, kind, ref, optionId, optionName, auto, effects }`; an auto-resolution is shown on Home and in the away popup
- `CONTEST_RESOLVED { itemId, stat, diff, won, crewId?, name? }` when a contest option is chosen
- `PERK_CHOSEN { crewId, name, perk }` after a perk option applies
- `ERRAND_DONE { opId, crewIds, name }` when someone sent on an errand is back

`stats.inbox` counts `filed`, `resolved` and `auto`. `DEBUG_FORCE_INCIDENT { incidentType? }` files one immediately.

## The bot

Right after `COLLECT`, the casual bot answers every item with the affordable option of highest value: `dirty + clean × 2 + packs × pack value + rep × repValue + influence × influenceValue − heat × heatCost + loyalty × loyaltyValue` (×3 for someone below `raiseBelow`). A pack is worth the Dirty it sells for while stock would run out within `stockReserveHours`, and a fifth of that otherwise. `influenceValue` and `heatCost` are the same numbers it uses to value jobs ([sim.md](../sim.md)). A point of opinion, or of the Ministry's attention avoided, is worth `opinionHours` (0.5) hours of yield, and an hour of someone kept busy costs what an hour hurt does. Perk choices go by a fixed preference: Earner, Ghost, Fixer, Steady, Mentor, Bargainer.

## The app

Home lists pending items first ("Waiting for you"), each as an `InboxCard` with its countdown, what happened, and one button per option showing its effects; the default is marked. The Home tab shows a dot while anything is pending. The away popup says how many decisions are waiting and lists items that expired unanswered.

**Tests:** `tests/city.test.ts` (who'd go is named and sent on an errand that brings them back; opinion and the Ministry move now for hours of income in Clean; nobody free, nobody sent; each story rolls only in its acts; validation), `tests/inbox.test.ts` (reports file with baked options; answering applies effects; unaffordable options are rejected; expiry applies the default; incidents never roll during the tutorial, roll only at whole hours, never above `maxPending`), `tests/crew.test.ts` (a promotion files a perk choice and choosing it adds the perk), `tests/reconcile.test.ts` (split invariance with pending items).

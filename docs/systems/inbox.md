# Inbox: crew reports and incidents

Pending decisions. Every job that comes back files a report with a fork, and one or two things a day happen to the player and ask for an answer. Each item offers 2–3 options with their effects spelled out, and a default that applies if nobody answers in time, so an absence never blocks the game ([ADR 0024](../decisions/0024-inbox.md)).

**Code:** `engine/systems/inbox.ts` (`fileReport`, `rollIncident`, `raiseIncident`, `incidentNeedHolds`, `canAffordEffects`, `resolveInboxItem`, `autoResolveInbox`, `materializeChoice`), the `RESOLVE_INBOX` and `DEBUG_FORCE_INCIDENT` handlers in `engine/core/apply.ts`. App: `app/inbox.ts`, `app/components/InboxCard.tsx`, Home.
**Config:** `inbox.*`, `ops.reports.*`, `incidents.*`.

## Items

`state.inbox: InboxItem[]`:

| Field | Meaning |
|---|---|
| `kind` | `report`, `incident` or `perk` (a promotion's perk choice) |
| `ref` | the job type, incident type or crew id |
| `crewIds`, `racketId` | who and what the loyalty and condition effects apply to |
| `createdAt`, `expiresAt` | filed at, and when the default applies |
| `options` | `{ id, name, effects }`; effects are `dirty`, `clean`, `influence`, `rep`, `heat`, `loyalty`, `condition`, `disposition`, `cigarettes`, `perk` |
| `defaultOptionId` | the option applied at expiry |

Effects are **materialized when the item is filed**: a report's "−25% of the job's Dirty" is stored as a number. The save is self-describing, and a replayed log doesn't depend on later config edits.

## Crew reports

`fileReport` runs at the end of `resolveOp` for every job whose band is in `ops.reports.bands` (training jobs never file). The options come from `ops.reports.byOutcome[outcome]`:

- `dirtyPct` is a share of the job's Dirty reward, so the options move value around rather than add it.
- `dirtyPerAct` is a flat amount × act.
- The other fields are copied as they are.

Reports always file, even during the tutorial. They expire after `inbox.reportHours`.

## Incidents

`rollIncident` runs at every whole hour, after the heat checks, on `rng.derive('incident', hourIndex)`:

1. Skipped while the tutorial isn't done, before `createdAt + incidents.startAfterHours`, or when `inbox.maxPending` incidents are already waiting. Reports and perk choices don't count toward that limit.
2. With chance `incidents.chancePerHr`, pick uniformly among `incidents.types` whose `act ≤ state.act` and whose `needs` holds: `idleCrew`, `joint` (a business that sells), `factory` (always false until the supply chain), `inspected`.
3. `raiseIncident` files it. An `idleCrew` incident names one idle crew member, who takes its loyalty effects.

Incidents expire after `inbox.incidentHours`.

## Perk choices

When a crew member reaches Soldier or Made, `filePerkChoice` in `engine/systems/experience.ts` files a `perk` item for them ([crew.md](crew.md#experience)): `crew.experience.perkChoices` perks they don't hold, drawn on `rng.derive('perk', crewId, rank)`, each option's effect `{ perk }`, the first as default. It expires after `inbox.perkHours`. Applying the option adds the perk to the member (if they're still on the crew and don't have it) and emits `PERK_CHOSEN { crewId, name, perk }`. Perk items don't count toward `maxPending`, and a perk costs nothing, so the default is always safe.

## Answering and expiry

- `RESOLVE_INBOX { itemId, optionId }` applies the option. It's rejected with "You can’t cover that" when the option costs more Dirty or Clean than the player holds.
- `autoResolveInbox` runs in `processDue` and applies each expired item's default, oldest first. Every `expiresAt` is a reconcile boundary, so splits agree.
- Validation (`validateConfig`) requires 2–3 options per list, unique ids, exactly one default, and a default that never costs Dirty or cigarettes, so an unanswered item can't hurt a player who can't pay.

Effect rules: Dirty can't go below zero (the change is recorded in `stats.inboxDirty`); heat is clamped to 0–100; loyalty applies to each named crew member still on the crew; condition to the named business; `disposition` is Tolya's; Rep only adds.

## Events

- `REPORT_FILED { itemId, opId, opType, outcome, expiresAt }` (quiet in the Log)
- `INCIDENT_RAISED { itemId, incidentType, crewId?, expiresAt }`
- `INBOX_RESOLVED { itemId, kind, ref, optionId, optionName, auto, effects }`; an auto-resolution is shown on Home and in the away popup
- `PERK_CHOSEN { crewId, name, perk }` after a perk option applies

`stats.inbox` counts `filed`, `resolved` and `auto`. `DEBUG_FORCE_INCIDENT { incidentType? }` files one immediately.

## The bot

Right after `COLLECT`, the casual bot answers every item with the affordable option of highest value: `dirty + clean × 2 + rep × repValue + influence × influenceValue − heat × heatCost + loyalty × loyaltyValue` (×3 for someone below `raiseBelow`). `influenceValue` and `heatCost` are the same numbers it uses to value jobs ([sim.md](../sim.md)). Perk choices go by a fixed preference: Earner, Ghost, Fixer, Steady, Mentor, Bargainer.

## The app

Home lists pending items first ("Waiting for you"), each as an `InboxCard` with its countdown, what happened, and one button per option showing its effects; the default is marked. The Home tab shows a dot while anything is pending. The away popup says how many decisions are waiting and lists items that expired unanswered.

**Tests:** `tests/inbox.test.ts` (reports file with baked options; answering applies effects; unaffordable options are rejected; expiry applies the default; incidents never roll during the tutorial, roll only at whole hours, never above `maxPending`), `tests/crew.test.ts` (a promotion files a perk choice and choosing it adds the perk), `tests/reconcile.test.ts` (split invariance with pending items).

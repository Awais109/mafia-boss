# 0038. Live event and unlock notices, queued one at a time

- **Status:** Superseded in part by [0049](0049-scenes.md): an act opening is a chapter scene, due from the save, not a live notice.
- **Date:** 2026-09-14

## Context
Everything that happens while playing — a job resolving, an incident, a raid, a crew promotion, a district flip — only ever showed up quietly in the Log tab or as a card stacked on Home's "Waiting for you" section. The player had to go looking for it. Nothing surfaced it at the moment it happened. Separately, nothing in the game ever explained what a racket, front, district, or official actually *does* beyond its raw numbers — a newly unlocked business was just a name and a cost.

## Decision
- A new `Snapshot.notices: QueuedNotice[]` queue (`app/notices.ts`), populated in `app/store.ts`'s `tick()` and `dispatch()` alongside the existing `away` field, and rendered one at a time by a new `EventNoticeModal` component whenever `away` isn't already showing (the Away modal already covers its own catch-up gap; a stack of individual pop-ups right after it would just repeat what it reports).
- Two kinds of notice:
  - **A decision just got filed** — detected by diffing `before.inbox` against `after.inbox` by id, so all three kinds (report/incident/perk) are caught uniformly. This sidesteps perk choices having no event of their own (only `CREW_RANK_UP`, on every rank-up, whether or not it filed a perk). The modal renders exactly like Home's `InboxCard`, plus a "Decide later" button that just dismisses — the item stays in `state.inbox`, so Home's own list is always the fallback for anything not answered here.
  - **Something notable happened, nothing to decide** — a fixed allow-list of event types (`RAID`, `ARREST`, `WALKOUT`, `WAGES_MISSED`, `UPKEEP_MISSED`, `DISTRICT_FLIPPED`, `GOAL_DONE`, `ACT_UNLOCKED`, `ACT_CLEARED`, `TOLYA_TICK` except a `'nothing'` result), reusing `describeEvent` from `app/eventText.ts` for its text/color — no new copy. Bookkeeping events (`COLLECTED`, `OP_STARTED`, config/debug events, etc.) stay out, same spirit as `away.ts`'s `FOLDED` set.
- Extracted the backdrop/panel `Modal` structure that `AwayModal` and `SkipSheet` each hand-rolled into a shared `app/components/Modal.tsx` (`ModalPanel`), so a third pop-up didn't duplicate it again.

**Unlocks** get the same queue, with two more `QueuedNotice` kinds:
- No event marks a racket/front/district/official newly unlocking — only `ACT_UNLOCKED` for the Act transition, not the individual things it opens. So `app/notices.ts`'s `diffUnlocked` instead compares `derive().unlocked` (recomputed every `refresh()`) against the previous refresh's map, and queues whatever flipped `false → true`. The very first computation (`prev === null`, nothing rendered yet) is treated as the starting state, not "everything just unlocked."
- Rather than key the "show one combined notice" behavior specifically off `ACT_UNLOCKED` (which could miss cases like a save import or a Debug Rep jump), the coalescing is generic: one changed item is its own `unlock` notice, more than one in the same diff becomes a single `unlockBatch` notice listing all of them.
- Added an optional `description: string` to `RacketTypeConfig`, `FrontTypeConfig`, `DistrictConfig`, and `OfficialConfig` (`engine/config/schema.ts`), and wrote one plain-language sentence for every entry in `defaults.ts` — the first descriptive copy anywhere in the config. Pure content, not persisted (config is never saved), so no schema-version bump. Reused by the unlock modal now, by the How It Works screen, and optionally by the locked-state lines on Business/Fronts/Turf/Heat.

## Consequences
- `CREW_RANK_UP` alone (a Capo promotion, which files no perk choice) doesn't get its own notice — only ranks 1 and 2 surface via their accompanying perk-choice modal. Acceptable gap for now; easy to add a standalone notice for it later if wanted.
- The queue is in-memory only, not persisted — a killed app loses anything still queued, same as `away`. Nothing is lost functionally: unresolved decisions still live in `state.inbox` regardless, and an unlock is re-derived from state/config on the next refresh either way (there's just no second pop-up for it).
- Ordering within one tick is "all newly-filed decisions, then all matching info events, in event order" rather than fully interleaved — acceptable since more than one or two notices in a single tick is rare in practice.
- Every `refresh()` call now also diffs `unlocked`, including the frequent no-op refreshes (dismissing a notice, clearing the notice bar) — cheap (under 30 booleans compared) but worth knowing if `refresh()` ever gets called somewhere hot.

## Related
`app/notices.ts`, `app/store.ts` (`tick`, `dispatch`, `dismissNotice`), `app/components/Modal.tsx`, `app/components/EventNoticeModal.tsx`, `App.tsx`, [app.md](../app.md), [away-summary ADR](0023-away-summary.md), [inbox ADR](0024-inbox.md).

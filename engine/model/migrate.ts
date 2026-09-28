import { defaults } from '../config/defaults'
import { emptyStats, ledgerSnapshot, SCHEMA_VERSION, type PlayerState } from './state'

// Bring an older save up to the current schema, so a model change mid-playtest doesn't
// brick saves. One step per version; each fills what's missing and never overwrites.
// migrate() has no config, so anything timed is seeded from updatedAt and catches up on
// the next reconcile.

type Doc = Record<string, unknown> & { schemaVersion: number; updatedAt: number }

// v2 (M1): inbox, opportunities board, daily ledger, new stat counters.
function v1to2(doc: Doc): Doc {
  const stats = { ...emptyStats(), ...(doc.stats as object) }
  return {
    ...doc,
    schemaVersion: 2,
    stats,
    inbox: doc.inbox ?? [],
    offers: doc.offers ?? { items: [], refreshAt: doc.updatedAt, refreshCount: 0 },
    ledger: doc.ledger ?? [ledgerSnapshot(stats as PlayerState['stats'], doc.updatedAt)],
  }
}

// v3 (M2): crew experience, front modes and capacity, haggling, specialization.
function v2to3(doc: Doc): Doc {
  type Member = Record<string, unknown> & { muscle: number; brains: number; nerve: number }
  const withProgress = (m: Member) => ({
    xp: { muscle: 0, brains: 0, nerve: 0 },
    potential: { muscle: Math.min(100, m.muscle + 10), brains: Math.min(100, m.brains + 10), nerve: Math.min(100, m.nerve + 10) },
    gained: 0,
    rank: 0,
    perks: [],
    ...m,
  })
  const pool = doc.recruitPool as { candidates: Member[] } & Record<string, unknown>
  const rival = doc.rival as { tolya: Record<string, unknown> }
  return {
    ...doc,
    schemaVersion: 3,
    stats: { ...emptyStats(), ...(doc.stats as object) },
    crew: (doc.crew as Member[]).map(withProgress),
    recruitPool: { ...pool, candidates: pool.candidates.map(withProgress) },
    fronts: (doc.fronts as Record<string, unknown>[]).map((f) => ({ mode: 'normal', capacityLevel: 0, ...f })),
    rival: { ...rival, tolya: { haggledTick: null, ...rival.tolya } },
  }
}

// v4 (M3): the tobacco chain, premises upkeep, Station Square. There's no config here, so the
// starting stock and the new district's controller come from the defaults.
function v3to4(doc: Doc): Doc {
  const districts = doc.districts as { id: string; controller: string; pressureCount: number }[]
  return {
    ...doc,
    schemaVersion: 4,
    stats: { ...emptyStats(), ...(doc.stats as object) },
    upkeepOwed: doc.upkeepOwed ?? 0,
    inventory: doc.inventory ?? { cigarettes: defaults.supply.startingStock },
    stockEmpty: doc.stockEmpty ?? false,
    districts: districts.some((d) => d.id === 'stationSquare')
      ? districts
      : [...districts, { id: 'stationSquare', controller: defaults.districts.list.stationSquare.startsAs, pressureCount: 0 }],
  }
}

// v5 (M4): gold bars and the game time they've bought. An old save gets the starting bars.
function v4to5(doc: Doc): Doc {
  const stats = { ...emptyStats(), ...(doc.stats as object) } as PlayerState['stats']
  const hadGold = typeof doc.gold === 'number'
  return {
    ...doc,
    schemaVersion: 5,
    stats: hadGold ? stats : { ...stats, gold: { ...stats.gold, granted: defaults.gold.starting } },
    gold: hadGold ? doc.gold : defaults.gold.starting,
    skippedMs: doc.skippedMs ?? 0,
  }
}

// v6 (M5): Act I goals. A save still in the old five-step tutorial can't pick up the new opening, so it's done.
function v5to6(doc: Doc): Doc {
  const tutorial = (doc.tutorial as { step: number; done: boolean } | undefined) ?? { step: 0, done: true }
  return {
    ...doc,
    schemaVersion: 6,
    goals: doc.goals ?? { done: [] },
    tutorial: { ...tutorial, done: true },
  }
}

// v7 (M6): Zhanna's trade. Her first lot is ready at once.
function v6to7(doc: Doc): Doc {
  const rival = doc.rival as Record<string, unknown>
  const zhanna = rival.zhanna ?? { disposition: 0, nextShipmentAt: doc.updatedAt, shipmentsBought: 0, surplusToday: { day: 0, packs: 0 } }
  return { ...doc, schemaVersion: 7, rival: { ...rival, zhanna } }
}

// v8: Act II is gated by Act I goals now, not Reputation, and `actII` was a circular goal (it
// checked being in Act II) so it's gone from the goal list (ADR 0039). A save that already
// completed it just loses that entry; `state.act` itself is untouched either way.
function v7to8(doc: Doc): Doc {
  const goals = doc.goals as { done: string[] }
  return { ...doc, schemaVersion: 8, goals: { ...goals, done: goals.done.filter((id) => id !== 'actII') } }
}

// v9 (M8): six acts and the Centre (ADRs 0040, 0041). Every district gets a prosperity, which only
// starts to move in Act III; the Centre joins the map. "Act II cleared" used to mean the end of the
// prototype; now Act II leads to Act III at its own gate, so a save still in Act II loses that date and
// gets a real one when Act III opens.
function v8to9(doc: Doc): Doc {
  const districts = (doc.districts as ({ id: string } & Record<string, unknown>)[]).map((d) => ({ prosperity: defaults.prosperity.base, ...d }))
  const stats = doc.stats as { actClearedAt: Record<string, number> } & Record<string, unknown>
  const { 2: _oldClear, ...cleared } = stats.actClearedAt ?? {}
  return {
    ...doc,
    schemaVersion: 9,
    stats: doc.act === 2 ? { ...stats, actClearedAt: cleared } : stats,
    raidPenaltyUntil: doc.raidPenaltyUntil ?? 0,
    districts: districts.some((d) => d.id === 'centre')
      ? districts
      : [...districts, { id: 'centre', controller: defaults.districts.list.centre.startsAs, pressureCount: 0, prosperity: defaults.prosperity.base }],
  }
}

// v10 (M9): Act III's consequences (ADR 0042): no loan out, no money lent, new stat counters.
function v9to10(doc: Doc): Doc {
  const stats = { ...emptyStats(), ...(doc.stats as object) }
  return { ...doc, schemaVersion: 10, stats, loan: doc.loan ?? null, lending: doc.lending ?? null }
}

// v11 (M10): Act IV (ADR 0043): an empty premium stock, the Colonel, and Zastava on the map.
function v10to11(doc: Doc): Doc {
  const inventory = doc.inventory as Record<string, number>
  const rival = doc.rival as Record<string, unknown>
  const districts = doc.districts as { id: string }[]
  const zastava = { id: 'zastava', controller: defaults.districts.list.zastava.startsAs, pressureCount: 0, prosperity: defaults.prosperity.base }
  return {
    ...doc,
    schemaVersion: 11,
    stats: { ...emptyStats(), ...(doc.stats as object) },
    inventory: { premium: defaults.premium.startingStock, ...inventory },
    premiumEmpty: doc.premiumEmpty ?? false,
    rival: { colonel: { disposition: 0, passageUntil: 0, passagesBought: 0 }, ...rival },
    districts: districts.some((d) => d.id === 'zastava') ? districts : [...districts, zastava],
  }
}

const STEPS: Record<number, (doc: Doc) => Doc> = { 1: v1to2, 2: v2to3, 3: v3to4, 4: v4to5, 5: v5to6, 6: v6to7, 7: v7to8, 8: v8to9, 9: v9to10, 10: v10to11 }

export function migrate(doc: unknown): PlayerState {
  if (typeof doc !== 'object' || doc === null) throw new Error('Save is not an object')
  const version = (doc as { schemaVersion?: unknown }).schemaVersion
  if (typeof version !== 'number') throw new Error('Save has no schemaVersion')
  if (version > SCHEMA_VERSION) throw new Error(`Save is from a newer build (schema ${version})`)
  let d = doc as Doc
  while (d.schemaVersion < SCHEMA_VERSION) {
    const step = STEPS[d.schemaVersion]
    if (!step) throw new Error(`No migration from schema ${d.schemaVersion} to ${SCHEMA_VERSION}`)
    d = step(d)
  }
  return d as unknown as PlayerState
}

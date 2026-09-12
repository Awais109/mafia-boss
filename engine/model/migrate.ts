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

const STEPS: Record<number, (doc: Doc) => Doc> = { 1: v1to2, 2: v2to3, 3: v3to4, 4: v4to5 }

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

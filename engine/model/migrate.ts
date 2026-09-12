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

const STEPS: Record<number, (doc: Doc) => Doc> = { 1: v1to2 }

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

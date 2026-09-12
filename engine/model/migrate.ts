import { SCHEMA_VERSION, type PlayerState } from './state'

// Bring an older save up to the current schema, so a model change mid-playtest doesn't
// brick saves. Add one step per version bump: `if (v === 1) { doc = v1to2(doc); v = 2 }`.
export function migrate(doc: unknown): PlayerState {
  if (typeof doc !== 'object' || doc === null) throw new Error('Save is not an object')
  const version = (doc as { schemaVersion?: unknown }).schemaVersion
  if (typeof version !== 'number') throw new Error('Save has no schemaVersion')
  if (version > SCHEMA_VERSION) throw new Error(`Save is from a newer build (schema ${version})`)
  if (version < SCHEMA_VERSION) throw new Error(`No migration from schema ${version} to ${SCHEMA_VERSION}`)
  return doc as PlayerState
}

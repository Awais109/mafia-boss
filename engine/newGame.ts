import { DISTRICT_IDS, FRONT_TYPES, type Config } from './config/schema'
import { makeRng } from './core/rng'
import { dayIndex, hoursToMs } from './core/time'
import { emptyStats, SCHEMA_VERSION, type PlayerState } from './model/state'
import { generateCandidates } from './systems/crew'

export function newGame(c: Config, playerId: string, now: number): PlayerState {
  const state: PlayerState = {
    schemaVersion: SCHEMA_VERSION,
    playerId,
    createdAt: now,
    updatedAt: now,
    debugOffsetMs: 0,
    nextId: 1,

    vault: c.vault.startingDirty,
    dirty: 0,
    clean: c.vault.startingClean,
    influence: c.vault.startingInfluence,
    reputation: 0,
    act: 1,

    heat: c.heat.startHeat,
    inspected: c.heat.startHeat >= c.heat.inspectThreshold,

    rackets: [],
    fronts: [],
    crew: [],
    crewSlotsBought: 0,
    recruitPool: { candidates: [], refreshAt: now + hoursToMs(c, c.crew.poolRefreshHours), refreshCount: 0 },
    ops: [],
    districts: DISTRICT_IDS.map((id) => ({ id, controller: c.districts.list[id].startsAs, pressureCount: 0 })),
    officials: [],
    officialCooldownUntil: 0,
    bribeUntil: 0,
    bribeControl: 0,

    wagesOwed: 0,
    influenceToday: { day: dayIndex(c, now), amount: 0 },
    rival: {
      tolya: { disposition: 0, nextTickAt: now + hoursToMs(c, c.rivals.tolya.tickHours), tickCount: 0, demand: null },
    },
    tutorial: { step: 0, done: !c.tutorial.enabled },
    firstConversionDone: false,

    log: [],
    stats: emptyStats(),
  }

  for (const s of c.rackets.starting) {
    state.rackets.push({ id: `r${state.nextId++}`, type: s.type, districtId: s.districtId, tier: 1, condition: 100, enforcerId: null })
  }
  for (const type of FRONT_TYPES) {
    const ft = c.fronts.types[type]
    if (ft.cost === 0 && ft.unlockRep === 0) {
      state.fronts.push({ id: `f${state.nextId++}`, type, level: 0, buffer: 0, convertedThisHour: 0, lastUtil: 0 })
    }
  }
  for (const seed of c.crew.starting) {
    state.crew.push({
      id: `crew${state.nextId++}`,
      name: seed.name,
      muscle: seed.muscle,
      brains: seed.brains,
      nerve: seed.nerve,
      loyalty: seed.loyalty,
      traits: seed.traits ?? [],
      status: 'idle',
      ...(seed.nephew ? { nephew: true } : {}),
    })
  }
  state.recruitPool.candidates = generateCandidates(c, 1, makeRng(playerId).derive('pool', 0), 0)
  return state
}

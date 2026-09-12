import { DISTRICT_IDS, FRONT_TYPES, type Config } from './config/schema'
import { makeRng } from './core/rng'
import { dayIndex, hoursToMs } from './core/time'
import { emptyStats, ledgerSnapshot, SCHEMA_VERSION, type PlayerState } from './model/state'
import { crewFromSeed, generateCandidates } from './systems/crew'
import { generateOffers } from './systems/offers'

export function newGame(c: Config, playerId: string, now: number): PlayerState {
  const state: PlayerState = {
    schemaVersion: SCHEMA_VERSION,
    playerId,
    createdAt: now,
    updatedAt: now,
    debugOffsetMs: 0,
    skippedMs: 0,
    nextId: 1,

    vault: c.vault.startingDirty,
    dirty: 0,
    clean: c.vault.startingClean,
    influence: c.vault.startingInfluence,
    reputation: 0,
    gold: c.gold.starting,
    act: 1,

    heat: c.heat.startHeat,
    inspected: c.heat.startHeat >= c.heat.inspectThreshold,

    inventory: { cigarettes: c.supply.startingStock },
    stockEmpty: false,

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
    upkeepOwed: 0,
    influenceToday: { day: dayIndex(c, now), amount: 0 },
    rival: {
      tolya: { disposition: 0, nextTickAt: now + hoursToMs(c, c.rivals.tolya.tickHours), tickCount: 0, demand: null, haggledTick: null },
    },
    tutorial: { step: 0, done: !c.tutorial.enabled },
    firstConversionDone: false,

    inbox: [],
    offers: { items: [], refreshAt: now + hoursToMs(c, c.offers.refreshHours), refreshCount: 0 },
    ledger: [],

    log: [],
    stats: emptyStats(),
  }
  state.stats.gold.granted = c.gold.starting
  state.ledger = [ledgerSnapshot(state.stats, now)]

  for (const s of c.rackets.starting) {
    state.rackets.push({ id: `r${state.nextId++}`, type: s.type, districtId: s.districtId, tier: 1, condition: 100, enforcerId: null })
  }
  for (const type of FRONT_TYPES) {
    const ft = c.fronts.types[type]
    if (ft.cost === 0 && ft.unlockRep === 0) {
      state.fronts.push({ id: `f${state.nextId++}`, type, level: 0, capacityLevel: 0, mode: 'normal', buffer: 0, convertedThisHour: 0, util: 0 })
    }
  }
  for (const seed of c.crew.starting) state.crew.push(crewFromSeed(seed, `crew${state.nextId++}`))
  state.recruitPool.candidates = generateCandidates(c, 1, makeRng(playerId).derive('pool', 0), 0)
  state.offers.items = generateOffers(c, state, makeRng(playerId).derive('offers', 0), 0, state.offers.refreshAt)
  return state
}

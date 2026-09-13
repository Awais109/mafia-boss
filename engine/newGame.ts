import { DISTRICT_IDS, type Config } from './config/schema'
import { apply } from './core/apply'
import { makeRng } from './core/rng'
import { dayIndex, hoursToMs } from './core/time'
import { emptyStats, ledgerSnapshot, SCHEMA_VERSION, type PlayerState } from './model/state'
import { crewFromSeed } from './systems/crew'
import { generateOffers } from './systems/offers'

// A new game (ADR 0035): the opening money and empty turf. The tutorial walks the player through buying
// the starting setup; with the tutorial off, the game starts from the quick start Skip would buy.
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
    dirty: c.vault.startingDirtyOnHand,
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
    recruitPool: {
      candidates: c.crew.openingPool.map((seed, i) => crewFromSeed(seed, `cand0-${i}`)),
      refreshAt: now + hoursToMs(c, c.crew.poolRefreshHours),
      refreshCount: 0,
    },
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
    tutorial: { step: 0, done: false },
    goals: { done: [] },
    firstConversionDone: false,

    inbox: [],
    offers: { items: [], refreshAt: now + hoursToMs(c, c.offers.refreshHours), refreshCount: 0 },
    ledger: [],

    log: [],
    stats: emptyStats(),
  }
  state.stats.gold.granted = c.gold.starting
  state.ledger = [ledgerSnapshot(state.stats, now)]
  state.offers.items = generateOffers(c, state, makeRng(playerId).derive('offers', 0), 0, state.offers.refreshAt)
  return c.tutorial.enabled ? state : apply(state, { type: 'TUTORIAL_SKIP' }, now, c).state
}

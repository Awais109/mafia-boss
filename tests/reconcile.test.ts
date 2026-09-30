import { describe, expect, it } from 'vitest'
import { derive, formulas, makeRng, reconcile, type GameEvent, type PlayerState } from '../engine'
import { act, config, crewNamed, expectClose, fresh, H, T0 } from './helpers'

// A state with everything moving at once: ops out (one taken from the board), a bribe running,
// rackets paying tribute, fronts converting, heat high enough for raids and arrests, a tribute
// demand pending, decisions waiting to expire, incidents free to roll, a warehouse drawing upkeep,
// a smuggling run out, and cigarette stock about to run out.
function busy(): PlayerState {
  let s = fresh('busy-player')
  s.tutorial.done = true
  s.offers.items.push({
    id: 'offer-test',
    opType: 'collectDebt',
    name: 'A test debt',
    cfg: { ...config.ops.list.collectDebt, dirty: 30, minutes: 35, diff: 45 },
    expiresAt: s.offers.refreshAt,
  })
  s = act(s, [{ type: 'DEBUG_GRANT', dirty: 3000, clean: 5000, influence: 30 }, { type: 'COLLECT' }], T0)
  const kiosk = s.fronts[0].id
  s = act(
    s,
    [
      { type: 'DEPOSIT', frontId: kiosk, amount: 10 }, // first conversion: instant
      { type: 'DEPOSIT', frontId: kiosk, amount: 240 },
      { type: 'BUY_RACKET', racketType: 'marketStall', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' },
      { type: 'START_OP', opType: 'collectDebt', crewIds: [crewNamed(s, 'Dima').id], offerId: 'offer-test' },
      { type: 'DEBUG_FORCE_INCIDENT', incidentType: 'copFavour' },
      { type: 'DEBUG_FORCE_INCIDENT', incidentType: 'shopkeeperLead' },
      { type: 'BUY_OFFICIAL', officialId: 'wardCop' },
      { type: 'BRIBE' },
      { type: 'DEBUG_COMPLETE_GOALS' },
      { type: 'DEBUG_SET_REP', reputation: config.rackets.types.unionOffice.unlockRep },
      { type: 'BUY_FRONT', frontType: 'restaurant' },
      { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'stationSquare' },
      { type: 'BUY_RACKET', racketType: 'stashHouse', districtId: 'kioskRow' }, // a longer vault leash
      { type: 'BUY_RACKET', racketType: 'unionOffice', districtId: 'sovietsky' }, // Influence outside the daily cap
      { type: 'BUY_CREW_SLOT' },
      { type: 'DEBUG_REFRESH_POOL' }, // the opening already hired from the first pool
    ],
    T0,
  )
  const restaurant = s.fronts.find((f) => f.type === 'restaurant')!.id
  s = act(
    s,
    [
      { type: 'DEPOSIT', frontId: restaurant, amount: 900 },
      { type: 'SET_FRONT_MODE', frontId: restaurant, mode: 'push' },
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id },
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[1].id },
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[2].id },
    ],
    T0,
  )
  // A trainee and an enforcer, each close to a stat point, so XP spending lands inside the windows.
  const [trainee, minder, runner] = s.crew.slice(2)
  s = act(
    s,
    [
      { type: 'START_OP', opType: 'trainNerve', crewIds: [trainee.id] },
      { type: 'ASSIGN_ENFORCER', crewId: minder.id, racketId: s.rackets[0].id },
      { type: 'START_OP', opType: 'smuggleCigarettes', crewIds: [crewNamed(s, 'Vitya').id, runner.id] },
      { type: 'DEBUG_SET_HEAT', heat: 92 },
    ],
    T0,
  )
  const m = s.crew.find((x) => x.id === minder.id)!
  m.xp.muscle = formulas.statPointCost(config, m.muscle) - 0.3
  s.rival.tolya.demand = 25
  s.crew[0].loyalty = 10 // walkout rolls at day boundaries
  s.inventory.cigarettes = 4 // joints outsell the factory: stock runs out and the shortage starts inside the windows
  return s
}

// Act III (ADRs 0041, 0042): prosperity stepping at whole hours, a hotel lifting its street, a Print Shop shut by
// an investigator and opening again mid-window, a raid's penalty running out, heat near the inspection line,
// a loan paid each morning, money lent out and falling due, a hurt crew member coming back.
function centre(): PlayerState {
  let s = act(fresh('centre-player'), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: config.rackets.types.printShop.unlockRep }], T0)
  s.tutorial.done = true
  s = act(
    s,
    [
      { type: 'DEBUG_GRANT', dirty: 5000, clean: 100_000 },
      { type: 'BUY_RACKET', racketType: 'nightclub', districtId: 'centre' },
      { type: 'BUY_RACKET', racketType: 'printShop', districtId: 'centre' },
      { type: 'BUY_RACKET', racketType: 'hotel', districtId: 'centre' },
      { type: 'BUY_RACKET', racketType: 'hotel', districtId: 'zarechye' },
      { type: 'BUY_RACKET', racketType: 'loanDesk', districtId: 'stationSquare' },
      { type: 'TAKE_LOAN', amount: 1500 },
      { type: 'DEBUG_FORCE_INCIDENT', incidentType: 'investigation' },
    ],
    T0,
  )
  const item = s.inbox.find((i) => i.ref === 'investigation')!
  s = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'shut' }, { type: 'DEBUG_FORCE_RAID' }, { type: 'DEBUG_SET_HEAT', heat: 41 }], T0)
  // Shift the closures so they end inside the split windows at different offsets.
  s.rackets.find((r) => r.type === 'printShop')!.closedUntil = T0 + Math.round(7.4 * H)
  s.raidPenaltyUntil = T0 + Math.round(11.7 * H)
  s.districts.find((d) => d.id === 'kioskRow')!.prosperity = 12
  s = act(s, [{ type: 'LEND', amount: 40 }], T0)
  s.lending!.dueAt = T0 + Math.round(9.3 * H)
  const hurt = s.crew[1]
  hurt.status = 'injured'
  hurt.injuredUntil = T0 + Math.round(5.2 * H)
  return s
}

// Act IV (ADR 0043): premium joints selling down a small stock that runs out mid-window, a convoy on the road
// landing mid-window, passage running out, a bonded warehouse and the importer washing against premium sales.
function zastava(): PlayerState {
  let s = act(fresh('zastava-player'), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: config.rackets.types.fuelDepot.unlockRep }], T0)
  s.tutorial.done = true
  s = act(
    s,
    [
      { type: 'DEBUG_GRANT', dirty: 60_000, clean: 200_000 },
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id },
      { type: 'BUY_RACKET', racketType: 'motel', districtId: 'zastava' },
      { type: 'BUY_RACKET', racketType: 'foreignShop', districtId: 'zastava' },
      { type: 'BUY_RACKET', racketType: 'bondedWarehouse', districtId: 'zastava' },
      { type: 'BUY_RACKET', racketType: 'convoyDepot', districtId: 'zarechye' },
      { type: 'BUY_FRONT', frontType: 'importExport' },
      { type: 'BUY_PASSAGE' },
      { type: 'DEBUG_GRANT', premium: 9 },
    ],
    T0,
  )
  const importer = s.fronts.find((f) => f.type === 'importExport')!
  s = act(s, [{ type: 'DEPOSIT', frontId: importer.id, amount: 500 }, { type: 'START_OP', opType: 'runConvoy', crewIds: s.crew.slice(0, 3).map((m) => m.id) }], T0)
  s.rival.colonel.passageUntil = T0 + Math.round(3.3 * H)
  s.ops[0].completesAt = T0 + Math.round(4.6 * H)
  return s
}

// Act V (ADR 0044): opinion stepping toward the media's target, the Ministry's attention about to peak and
// freeze the Development Fund, a front frozen and thawing mid-window, and an election counted mid-window.
function kombinat(): PlayerState {
  let s = act(fresh('kombinat-player'), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: config.rackets.types.tvStation.unlockRep }], T0)
  s.tutorial.done = true
  s = act(
    s,
    [
      { type: 'DEBUG_GRANT', dirty: 2_000_000, clean: 2_000_000, influence: 500 },
      { type: 'BUY_DISTRICT', districtId: 'zastava' },
      { type: 'BUY_FRONT', frontType: 'importExport' },
      { type: 'BUY_DISTRICT', districtId: 'kombinat' },
      { type: 'BUY_FRONT', frontType: 'developmentFund' },
      { type: 'BUY_RACKET', racketType: 'newspaper', districtId: 'kombinat' },
      { type: 'BUY_RACKET', racketType: 'combine', districtId: 'kombinat' },
      { type: 'BUY_RACKET', racketType: 'constructionTrust', districtId: 'kombinat' },
      { type: 'CAMPAIGN', points: 12, pay: 'dirty' },
    ],
    T0,
  )
  const fund = s.fronts.find((f) => f.type === 'developmentFund')!
  s = act(s, [{ type: 'DEPOSIT', frontId: fund.id, amount: 20_000 }], T0)
  s.politics.attention = config.ministry.freezeAt - 0.5
  s.politics.opinion = 30
  s.politics.nextElectionAt = T0 + Math.round(13.6 * H)
  s.fronts.find((f) => f.type === 'importExport')!.frozenUntil = T0 + Math.round(6.2 * H)
  return s
}

// Act VI (ADR 0045): legal businesses earning Clean beside illegal ones, the Holding, a hearing that may be filed
// at the next day start against a case file, and a frozen front thawing.
function nagornaya(): PlayerState {
  let s = kombinat()
  s.politics.opinion = 100
  s.politics.points = config.elections.maxPoints
  s.politics.nextElectionAt = T0 + 1
  s.reputation = config.progression.acts[6].rep!
  s = act(s, [{ type: 'DEBUG_HOLD_ELECTION' }, { type: 'BUY_RACKET', racketType: 'holding', districtId: 'nagornaya' }], T0)
  const stall = s.rackets.find((r) => r.type === 'marketStall')!
  const trust = s.rackets.find((r) => r.type === 'constructionTrust')!
  s = act(s, [{ type: 'LEGALIZE', racketId: stall.id }, { type: 'LEGALIZE', racketId: trust.id }], T0)
  s.stats.raids = 3
  return s
}

describe('reconcile', () => {
  it('does nothing when now <= updatedAt', () => {
    const s = fresh()
    expect(reconcile(s, s.updatedAt, config).state).toEqual(s)
    expect(reconcile(s, s.updatedAt - H, config).events).toEqual([])
  })

  it('reconcile(s, t2) equals reconcile(reconcile(s, t1), t2) on 1,000 random splits', () => {
    const bases = [fresh(), busy(), centre(), zastava(), kombinat(), nagornaya()]
    const rand = makeRng('split-test').derive('splits')
    for (let i = 0; i < 1000; i++) {
      const base = bases[i % bases.length]
      const span = Math.round(rand.range(0.01, 40) * H)
      const t2 = base.updatedAt + span
      const t1 = base.updatedAt + Math.round(rand.range(0, span))
      const direct = reconcile(base, t2, config)
      const first = reconcile(base, t1, config)
      const split = reconcile(first.state, t2, config)
      expectClose(split.state, direct.state, `trial ${i} (t1=+${t1 - base.updatedAt}ms, t2=+${span}ms)`)
      expectClose([...first.events, ...split.events], direct.events, `trial ${i} events`)
    }
  })

  it('caps offline progress at maxOfflineHours', () => {
    const s = fresh()
    const long = reconcile(s, s.updatedAt + 500 * H, config)
    expect(long.events[0]).toMatchObject({ type: 'OFFLINE_CAPPED', skippedHours: 500 - config.time.maxOfflineHours })
    const accrued = long.state.stats.dirtyEarned + long.state.stats.dirtyLostToCap
    // Only the last maxOfflineHours accrue (less than full yield: condition decays and Tolya hits).
    expect(accrued).toBeLessThanOrEqual(derive(s, config).yieldPerHr * config.time.maxOfflineHours + 1e-6)
    expect(accrued).toBeGreaterThan(0)
  })

  it('fills the vault to its cap and no further', () => {
    const s = fresh()
    s.crew = [] // no wages drawn from the vault at the day boundary
    const r = reconcile(s, s.updatedAt + 48 * H, config)
    // The vault stops at the cap it hit; a cap that falls later pauses it without taking anything back.
    const capped = r.events.filter((e): e is Extract<GameEvent, { type: 'VAULT_CAPPED' }> => e.type === 'VAULT_CAPPED').at(-1)
    expect(capped).toBeDefined()
    expect(r.state.vault).toBeCloseTo(capped!.cap)
    expect(r.state.vault).toBeGreaterThanOrEqual(derive(r.state, config).vaultCap - 1e-6)
  })

  it('is deterministic for a player: same window, same raids', () => {
    const s = busy()
    s.heat = 100
    const a = reconcile(s, s.updatedAt + 30 * H, config)
    const b = reconcile(s, s.updatedAt + 30 * H, config)
    expect(a.events).toEqual(b.events)
    expect(a.state).toEqual(b.state)
  })
})

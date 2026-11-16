import { actGoals, DISTRICT_IDS, goalProgress, type Act, type Config, type Derived, type DistrictId, type GoalId, type OfficialId, type PlayerState, type RacketType } from '../engine'
import { glyph } from './glyphs'
import { fmt } from './format'
import type { TabId } from './screens/types'

// Goals on Home: what each asks for, in the player's words. Act I's (ADR 0035) open Act II the moment every
// one is done (ADR 0039); each later act's (ADR 0067) walk through what it brings, pay gold, and gate nothing.

export const GOAL_TEXT: Record<GoalId, string> = {
  // Act I
  secondDistrict: 'Open a business in a second district',
  factoryTier2: 'Upgrade the Tobacco Factory to tier 2',
  thirdCrew: 'Hire a third crew member',
  wardCop: 'Put the Ward Cop on the payroll',
  workFront: 'Upgrade a front’s rate to level 2',
  smuggleRun: 'Run three smuggling jobs',
  soldier: 'Get someone promoted to Soldier',
  // Act II
  precinctCaptain: 'Put the Precinct Captain on the payroll',
  stashHouse: 'Build a Stash House',
  newTurf: 'Take the Port Quarter or the Sovietsky Blocks',
  zhannaLot: 'Buy a lot of cigarettes from Zhanna',
  // Act III
  bigScore: 'Send a crew on the Big Score',
  cooperativeBank: 'Open the Cooperative Bank',
  loanDesk: 'Build a Loan Desk',
  theCentre: 'Take the Centre',
  // Act IV
  customsChief: 'Put the Customs Chief on the payroll',
  firstConvoy: 'Land a convoy over the border',
  foreignShop: 'Open a Foreign Goods Shop',
  premiumSold: 'Sell 300 packs of premium goods',
  // Act V
  newspaper: 'Buy the Newspaper',
  campaign: 'Spend on an election campaign',
  fixTender: 'Fix a tender',
  governor: 'Put the Governor on the payroll',
  // Act VI
  firstLegal: 'Legalize a business',
  legalBusinesses: 'Run fifteen legal businesses',
  holding: 'Build the Holding',
  hearingsWon: 'Win three hearings in court',
}

// Where each goal is done, for the next-step card's button.
export const GOAL_TAB: Record<GoalId, TabId> = {
  secondDistrict: 'turf', factoryTier2: 'rackets', thirdCrew: 'crew', wardCop: 'heat', workFront: 'fronts', smuggleRun: 'ops', soldier: 'ops',
  precinctCaptain: 'heat', stashHouse: 'rackets', newTurf: 'turf', zhannaLot: 'turf',
  bigScore: 'ops', cooperativeBank: 'fronts', loanDesk: 'rackets', theCentre: 'turf',
  customsChief: 'heat', firstConvoy: 'ops', foreignShop: 'rackets', premiumSold: 'rackets',
  newspaper: 'rackets', campaign: 'turf', fixTender: 'ops', governor: 'heat',
  firstLegal: 'rackets', legalBusinesses: 'rackets', holding: 'rackets', hearingsWon: 'home',
}

// The business, front or official a goal is bought with, while it's still waiting on Rep or its act.
const RACKET_GOALS: Partial<Record<GoalId, RacketType>> = { stashHouse: 'stashHouse', loanDesk: 'loanDesk', foreignShop: 'foreignShop', newspaper: 'newspaper', holding: 'holding' }
const OFFICIAL_GOALS: Partial<Record<GoalId, OfficialId>> = { wardCop: 'wardCop', precinctCaptain: 'precinctCaptain', customsChief: 'customsChief', governor: 'governor' }
function goalLocked(d: Derived, id: GoalId): boolean {
  const racket = RACKET_GOALS[id]
  const official = OFFICIAL_GOALS[id]
  if (racket) return !d.unlocked.racket[racket]
  if (official) return !d.unlocked.official[official]
  if (id === 'cooperativeBank') return !d.unlocked.front.cooperativeBank
  return false
}

// Whether what it's bought with is in hand: the Influence for an official, the Clean for a business, a front or
// the cheapest district. Goals that aren't a purchase count as affordable.
function goalAffordable(s: PlayerState, c: Config, d: Derived, id: GoalId): boolean {
  const racket = RACKET_GOALS[id]
  const official = OFFICIAL_GOALS[id]
  if (racket) return s.clean >= d.costs.racket[racket]
  if (official) return s.influence >= d.costs.official[official]
  if (id === 'cooperativeBank') return s.clean >= d.costs.front.cooperativeBank
  const districtAct: Partial<Record<GoalId, Act | undefined>> = { secondDistrict: undefined, newTurf: 2, theCentre: 3 }
  if (id in districtAct) {
    if (id === 'secondDistrict' && s.districts.some((x) => x.controller === 'player' && !s.rackets.some((r) => r.districtId === x.id))) return true
    const act = districtAct[id]
    const open = DISTRICT_IDS.filter((x) => (act === undefined || c.districts.list[x].act === act) && d.unlocked.district[x] && s.districts.find((y) => y.id === x)?.controller !== 'player')
    return open.some((x) => s.clean >= d.costs.district[x])
  }
  return true
}

// `locked`: it can't be done yet (it waits on Rep or its act). `affordable`: what it's bought with is in hand.
export type GoalRow = { id: GoalId; text: string; done: boolean; locked: boolean; affordable: boolean; hint?: string }
export type GoalsView = { act: Act; gold: number; gates: boolean; rows: GoalRow[] }

// The act you're in: shown once the opening is over, until every one of its goals is done. Each open goal says
// how far along it is, or where to go for it. `gates`: Act I's open the next act; later acts' don't.
export function goalsView(s: PlayerState, c: Config, d: Derived): GoalsView | null {
  if (!c.goals.enabled || !s.tutorial.done) return null
  const { list, gold } = actGoals(c, s.act)
  const rows = list.map((id) => {
    const done = s.goals.done.includes(id)
    return { id, text: GOAL_TEXT[id], done, locked: !done && goalLocked(d, id), affordable: !done && goalAffordable(s, c, d, id), hint: done ? undefined : goalHint(s, c, d, id) }
  })
  return rows.length === 0 || rows.every((r) => r.done) ? null : { act: s.act, gold, gates: s.act === 1, rows }
}

function goalHint(s: PlayerState, c: Config, d: Derived, id: GoalId): string | undefined {
  const p = goalProgress(s, c, id)
  const count = p ? `${fmt(p.have)} of ${fmt(p.need)}` : undefined
  const official = (o: OfficialId) => `needs ${glyph.influence}${fmt(d.costs.official[o])} · you have ${glyph.influence}${fmt(s.influence)} · on Heat`
  // Not open yet: the Rep it waits on. Open: its price, and where it's bought.
  const business = (t: RacketType, where: string) =>
    d.unlocked.racket[t] ? `${glyph.clean}${fmt(d.costs.racket[t])} · ${where}` : `opens at ${glyph.rep}${fmt(c.rackets.types[t].unlockRep)}`
  // The cheapest of these districts not yours yet.
  const district = (ids: DistrictId[]) => {
    const next = ids.filter((x) => d.unlocked.district[x] && s.districts.find((y) => y.id === x)?.controller !== 'player').sort((a, b) => d.costs.district[a] - d.costs.district[b])[0]
    return next ? `${c.districts.list[next].name} is ${glyph.clean}${fmt(d.costs.district[next])} on the Map` : undefined
  }
  const ofAct = (act: Act) => DISTRICT_IDS.filter((x) => c.districts.list[x].act === act)
  switch (id) {
    case 'secondDistrict': {
      // What's next: a district you hold with nothing of yours in it, or the cheapest one open to take.
      const empty = s.districts.find((x) => x.controller === 'player' && !s.rackets.some((r) => r.districtId === x.id))
      if (empty) return `${count} · open a business in ${c.districts.list[empty.id].name}`
      const next = district([...DISTRICT_IDS])
      return next ? `${count} · ${next}` : count
    }
    case 'factoryTier2': {
      const factory = s.rackets.find((r) => r.type === 'tobaccoFactory')
      return factory ? `yours is tier ${factory.tier}` : 'no factory yet'
    }
    case 'wardCop':
    case 'precinctCaptain':
    case 'customsChief':
    case 'governor':
      return official(id)
    case 'zhannaLot':
      return 'her card is on the Map'
    case 'newTurf':
      return district(ofAct(2))
    case 'theCentre':
      return district(ofAct(3))
    case 'stashHouse':
      return business('stashHouse', 'a free lot on Business')
    case 'foreignShop':
      return business('foreignShop', 'on Business')
    case 'newspaper':
      return business('newspaper', 'on Business')
    case 'holding':
      return business('holding', 'Nagornaya’s lot, on Business')
    case 'loanDesk':
      return business('loanDesk', 'a free lot on Business')
    case 'cooperativeBank': {
      const bank = c.fronts.types.cooperativeBank
      if (!d.unlocked.front.cooperativeBank) return `opens at ${glyph.rep}${fmt(bank.unlockRep)}`
      return `${glyph.clean}${fmt(d.costs.front.cooperativeBank)} on Fronts · needs a street at prosperity ${fmt(bank.minProsperity ?? 0)}`
    }
    case 'bigScore':
    case 'fixTender':
      return 'on Ops'
    case 'firstConvoy':
      return 'the Colonel’s passage on the Map, then Run a Convoy on Ops'
    case 'campaign':
      return 'on the Map, before the election'
    case 'firstLegal':
      return s.politics.opinion >= c.legalize.minOpinion ? 'on Business' : `on Business, from opinion ${fmt(c.legalize.minOpinion)} · it’s ${fmt(Math.floor(s.politics.opinion))}`
    case 'hearingsWon':
      return `${count} · fight the next hearing in court`
    case 'soldier':
      return undefined
    default:
      return count
  }
}

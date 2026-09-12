import { RANK_NAMES, type Config, type GameEvent, type PlayerState } from '../engine'
import { colors, glyph } from './components/ui'
import { fmt } from './format'

export type EventLine = { text: string; color?: string; quiet?: boolean }

const OUTCOME = { full: 'clean job', partial: 'got some of it', fail: 'went wrong' } as const
const STAT_NAME = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const
const MODE_TEXT = { push: 'pushing', normal: 'running normally', layLow: 'lying low' } as const

// Player-facing line for an event. `quiet` lines are bookkeeping, hidden unless the Log asks.
export function describeEvent(e: GameEvent, s: PlayerState, c: Config): EventLine {
  const racketName = (id?: string) => {
    const r = s.rackets.find((x) => x.id === id)
    return r ? c.rackets.types[r.type].name : 'a racket'
  }
  const crewName = (id: string) => s.crew.find((m) => m.id === id)?.name ?? 'someone'
  const frontName = (id: string) => {
    const f = s.fronts.find((x) => x.id === id)
    return f ? c.fronts.types[f.type].name : 'a front'
  }
  const d = glyph.dirty
  const cl = glyph.clean

  switch (e.type) {
    case 'OFFLINE_CAPPED':
      return { text: `Away a long time: only the last ${c.time.maxOfflineHours}h counted`, color: colors.warn }
    case 'VAULT_CAPPED':
      return { text: `Vault full at ${d}${fmt(e.cap)}. Income stopped.`, color: colors.warn }
    case 'COLLECTED':
      return { text: `Collected ${d}${fmt(e.amount)}`, quiet: true }
    case 'DEPOSITED':
      return e.instantClean !== undefined
        ? { text: `Laundered ${d}${fmt(e.amount)} → ${cl}${fmt(e.instantClean)} on the spot`, color: colors.clean }
        : { text: `Deposited ${d}${fmt(e.amount)} into the ${frontName(e.frontId)}`, quiet: true }
    case 'RACKET_BOUGHT':
      return { text: `Opened a ${c.rackets.types[e.racketType].name} in ${c.districts.list[e.districtId].name} (${cl}${fmt(e.cost)})` }
    case 'RACKET_UPGRADED':
      return { text: `${racketName(e.racketId)} → tier ${e.tier}${e.specialization ? `, ${e.specialization}` : ''} (${cl}${fmt(e.cost)})` }
    case 'RACKET_REPAIRED':
      return { text: `Repaired the ${racketName(e.racketId)} (${d}${fmt(e.cost)})`, quiet: true }
    case 'FRONT_BOUGHT':
      return { text: `Opened a ${c.fronts.types[e.frontType].name} (${cl}${fmt(e.cost)})`, color: colors.clean }
    case 'FRONT_UPGRADED':
      return e.track === 'capacity'
        ? { text: `${frontName(e.frontId)} expanded: capacity level ${e.level}` }
        : { text: `${frontName(e.frontId)} upgraded to level ${e.level}` }
    case 'FRONT_MODE_SET':
      return { text: `${frontName(e.frontId)} now ${MODE_TEXT[e.mode]}`, quiet: true }
    case 'ENFORCER_ASSIGNED':
      return { text: `${crewName(e.crewId)} now minds the ${racketName(e.racketId)}` }
    case 'ENFORCER_REMOVED':
      return { text: `${crewName(e.crewId)} left the ${racketName(e.racketId)}`, quiet: true }
    case 'OP_STARTED':
      return { text: `${e.crewIds.map(crewName).join(' & ')}: ${e.name ?? c.ops.list[e.opType].name}`, quiet: true }
    case 'OP_RESOLVED': {
      const gains = [
        e.dirty ? `+${d}${fmt(e.dirty)}` : '',
        e.influence ? `+${glyph.influence}${e.influence}` : '',
        e.influenceLostToCap ? `(${glyph.influence} daily cap)` : '',
        e.cigarettes ? `+${glyph.packs}${fmt(e.cigarettes)}` : '',
        e.rep ? `+${glyph.rep}${fmt(e.rep)}` : '',
        `+${glyph.heat}${fmt(e.spike)}`,
      ].filter(Boolean)
      const color = e.outcome === 'full' ? colors.good : e.outcome === 'partial' ? colors.text : colors.heat
      return { text: `${e.name ?? c.ops.list[e.opType].name}: ${OUTCOME[e.outcome]} · ${gains.join(' ')}`, color }
    }
    case 'UPKEEP_PAID':
      return { text: `Paid premises upkeep ${d}${fmt(e.amount)}`, quiet: true }
    case 'UPKEEP_MISSED':
      return { text: `Couldn't cover upkeep (${d}${fmt(e.paid)} of ${fmt(e.owed)}). Your premises are falling apart.`, color: colors.heat }
    case 'STOCK_OUT':
      return { text: 'The last pack of cigarettes is gone', color: colors.warn }
    case 'STOCK_CAPPED':
      return { text: `Cigarette stock full at ${glyph.packs}${fmt(e.cap)}: more is wasted`, quiet: true }
    case 'SHORTAGE_STARTED':
      return {
        text: `Shortage: joints want ${glyph.packs}${e.demand.toFixed(1)}/h and the factories make ${e.made.toFixed(1)}/h`,
        color: colors.heat,
      }
    case 'SHORTAGE_ENDED':
      return { text: 'Cigarettes are back on the shelves', color: colors.good }
    case 'REPORT_FILED':
      return { text: `Report in from ${c.ops.list[e.opType].name}: your call`, quiet: true }
    case 'INCIDENT_RAISED':
      return { text: `${c.incidents.types[e.incidentType].name}: your call`, color: colors.warn }
    case 'INBOX_RESOLVED': {
      const title =
        e.kind === 'incident'
          ? c.incidents.types[e.ref as keyof typeof c.incidents.types]?.name ?? 'An incident'
          : e.kind === 'report'
            ? `${c.ops.list[e.ref as keyof typeof c.ops.list]?.name ?? 'A job'} report`
            : 'A promotion'
      return e.auto
        ? { text: `Nobody answered “${title}”: it went “${e.optionName}”`, color: colors.muted }
        : { text: `${title}: ${e.optionName}`, quiet: true }
    }
    case 'OFFERS_REFRESHED':
      return { text: `New work on the board (${e.count})`, quiet: true }
    case 'RECRUITED':
      return { text: `${e.name} joined the crew (${cl}${fmt(e.cost)})` }
    case 'FIRED':
      return { text: `${e.name} was let go` }
    case 'RAISED':
      return { text: `Gave ${crewName(e.crewId)} a raise: loyalty ${Math.round(e.loyalty)}`, quiet: true }
    case 'CREW_SLOT_BOUGHT':
      return { text: `Room for more crew: ${e.slots} slots` }
    case 'POOL_REFRESHED':
      return { text: 'New faces are asking for work', quiet: true }
    case 'OFFICIAL_BOUGHT':
      return { text: `${c.officials.list[e.officialId].name} is on the payroll (+${fmt(c.officials.list[e.officialId].control)} control)`, color: colors.influence }
    case 'BRIBED':
      return { text: `Bribe paid (${d}${fmt(e.cost)}): +${fmt(e.control)} control for ${c.heat.bribe.hours}h`, color: colors.influence }
    case 'BRIBE_EXPIRED':
      return { text: 'The bribe has worn off', quiet: true }
    case 'INSPECTION_STARTED':
      return { text: `Inspections started: yield ×${c.heat.inspectYieldMult} while heat ≥ ${c.heat.inspectThreshold}`, color: colors.warn }
    case 'INSPECTION_ENDED':
      return { text: 'Inspectors backed off', color: colors.good }
    case 'RAID':
      return { text: `RAID! Police seized ${d}${fmt(e.seized)} from the vault`, color: colors.heat }
    case 'ARREST':
      return { text: `${e.name} was arrested (out in ${c.heat.arrestHours}h)`, color: colors.heat }
    case 'RELEASED':
      return { text: `${e.name} is out of jail` }
    case 'WAGES_PAID':
      // Once a day, and the only sign a payday happened: keep it on Home.
      return { text: `Paid wages ${d}${fmt(e.amount)}`, color: colors.dirty }
    case 'WAGES_MISSED':
      return { text: `Couldn't cover wages (${d}${fmt(e.paid)} of ${fmt(e.owed)}). The crew is unhappy.`, color: colors.heat }
    case 'WALKOUT':
      return { text: `${e.name} walked out${e.stolen ? ` with ${d}${fmt(e.stolen)}` : ''}`, color: colors.heat }
    case 'DISTRICT_BOUGHT':
      return { text: `Bought out ${c.districts.list[e.districtId].name} (${cl}${fmt(e.cost)})`, color: colors.rep }
    case 'DISTRICT_PRESSURED':
      return { text: `Pressure on ${c.districts.list[e.districtId].name}: ${e.count}/${e.needed}` }
    case 'DISTRICT_FLIPPED':
      return { text: `${c.districts.list[e.districtId].name} is yours now`, color: colors.rep }
    case 'TOLYA_TICK':
      if (e.result === 'conditionHit') return { text: `Tolya's boys smashed up your ${racketName(e.racketId)}`, color: colors.heat }
      if (e.result === 'tribute') return { text: `Tolya wants ${d}${fmt(e.amount ?? 0)} tribute`, color: colors.warn }
      return { text: 'Tolya kept his distance', quiet: true }
    case 'TRIBUTE_PAID':
      return { text: `Paid Tolya ${d}${fmt(e.amount)}`, quiet: true }
    case 'TRIBUTE_REFUSED':
      return e.explicit
        ? { text: `You told Tolya no. His boys broke your ${racketName(e.racketId)}.`, color: colors.heat }
        : { text: `Tolya didn't get his ${d}${fmt(e.amount)}. He broke your ${racketName(e.racketId)}.`, color: colors.heat }
    case 'TRIBUTE_HAGGLED':
      return e.won
        ? { text: `${e.name} talked Tolya down to ${d}${fmt(e.paid)}`, color: colors.good }
        : { text: `${e.name} insulted Tolya. He still wants ${d}${fmt(e.demand)}.`, color: colors.warn }
    case 'TRAINING_DONE':
      return { text: `${e.name} finished training: +${fmt(e.xp)} ${STAT_NAME[e.stat]} XP`, quiet: true }
    case 'CREW_STAT_UP':
      return { text: `${e.name}: ${STAT_NAME[e.stat]} ${e.value}`, color: colors.good }
    case 'CREW_RANK_UP':
      return { text: `${e.name} made ${RANK_NAMES[e.rank] ?? 'rank'}`, color: colors.rep }
    case 'PERK_CHOSEN':
      return { text: `${e.name} is a ${c.crew.experience.perks[e.perk].name}: ${c.crew.experience.perks[e.perk].text}`, color: colors.rep }
    case 'ACT_UNLOCKED':
      return { text: 'ACT II — the city opens up: Restaurant, new districts, more crew', color: colors.rep }
    case 'ACT_CLEARED':
      return { text: 'ACT II COMPLETE — the prototype ends here. Keep playing if you like.', color: colors.rep }
    case 'NOTE':
      return { text: e.text, color: colors.muted }
    case 'TUTORIAL_STEP':
      return { text: e.done ? 'Tutorial done' : `Tutorial step ${e.step + 1}`, quiet: true }
    case 'SESSION_START':
      return { text: 'Session started', quiet: true }
    case 'SESSION_END':
      return { text: `Session ended (${Math.round(e.durationMs / 1000)}s, ${e.actions} actions)`, quiet: true }
    case 'DEBUG':
      return { text: `[debug] ${e.action}${e.detail ? ` ${e.detail}` : ''}`, color: colors.faint, quiet: true }
    case 'CONFIG_CHANGED':
      return { text: `[config] ${e.path} = ${e.value === null ? 'reset' : String(e.value)} (${e.preset})`, color: colors.faint, quiet: true }
  }
}

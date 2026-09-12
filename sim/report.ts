import { dayMs, RACKET_TYPES, type RacketType } from '../engine'
import type { Trace } from './driver'

// Summary table against the dev manual §3 targets, plus the hourly CSV.

export type Check = { name: string; value: number | null; min: number; max: number }

export type Summary = {
  title: string
  actClear1: number | null // days from start
  actClear2: number | null // days after Act I
  raids: number
  arrests: number
  missedWages: number
  walkouts: number
  heatMean: number
  heatMin: number
  heatMax: number
  hoursAbove40: number
  frontUtil: number
  dirtyIdlePct: number
  vaultFillByDay: (number | null)[]
  vaultFillAct1: number | null
  vaultFillAct2: number | null
  opOutcomes: { full: number; partial: number; fail: number }
  opCount: number
  tiers: string
  cleanPerHrByDay: number[]
  sessions: number
  actionsPerSession: number
  checks: Check[]
}

const ABBREV: Record<RacketType, string> = {
  kiosk: 'K',
  marketStall: 'M',
  autoShop: 'A',
  cafe: 'C',
  bathhouse: 'B',
  petrol: 'P',
  cargoBay: 'CB',
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)

export function summarize(trace: Trace): Summary {
  const { config: c, final, hours, sessions, start } = trace
  const D = dayMs(c)
  const st = final.stats
  const clear1 = st.actClearedAt[1]
  const clear2 = st.actClearedAt[2]

  const heats = hours.map((h) => h.heat)
  const outcomes = st.opOutcomes
  const opCount = outcomes.full + outcomes.partial + outcomes.fail
  const pct = (n: number) => (opCount ? n / opCount : 0)

  const days = Math.ceil((trace.end - start) / D)
  const vaultFillByDay = Array.from({ length: days }, (_, i) => {
    const fills = sessions.filter((s) => s.day === i + 1 && Number.isFinite(s.vaultFillHrs)).map((s) => s.vaultFillHrs)
    return fills.length ? mean(fills) : null
  })
  const act1Fills = sessions.filter((s) => s.day === 1 && s.act === 1).map((s) => s.vaultFillHrs)
  const act2Fills = sessions.filter((s) => s.day >= 4 && s.act === 2).map((s) => s.vaultFillHrs)

  const cleanPerHrByDay = Array.from({ length: days }, (_, i) => {
    const inDay = hours.filter((h) => h.day === i + 1)
    if (inDay.length < 2) return 0
    return (inDay[inDay.length - 1].cleanEarned - inDay[0].cleanEarned) / (inDay.length - 1)
  })

  const idle = sessions.filter((s) => s.income > 0).map((s) => Math.min(1, s.dirtyAfter / s.income))
  const tiers = [...final.rackets]
    .sort((a, b) => RACKET_TYPES.indexOf(a.type) - RACKET_TYPES.indexOf(b.type) || b.tier - a.tier)
    .map((r) => `${ABBREV[r.type]}${r.tier}`)
    .join(' ')

  const summary: Summary = {
    title: `Sevgorod sim · preset=${trace.label.preset} · persona=${trace.label.persona} · seed=${trace.label.seed} · ${trace.label.days} days${trace.label.source === 'replay' ? ' · replay' : ''}`,
    actClear1: clear1 !== undefined ? (clear1 - start) / D : null,
    actClear2: clear1 !== undefined && clear2 !== undefined ? (clear2 - clear1) / D : null,
    raids: st.raids,
    arrests: st.arrests,
    missedWages: st.missedWages,
    walkouts: st.walkouts,
    heatMean: mean(heats),
    heatMin: Math.min(...heats),
    heatMax: Math.max(...heats),
    hoursAbove40: hours.filter((h) => h.heat >= c.heat.inspectThreshold).length,
    frontUtil: mean(hours.map((h) => h.frontUtil)),
    dirtyIdlePct: mean(idle),
    vaultFillByDay,
    vaultFillAct1: act1Fills.length ? mean(act1Fills) : null,
    vaultFillAct2: act2Fills.length ? mean(act2Fills) : null,
    opOutcomes: { full: pct(outcomes.full), partial: pct(outcomes.partial), fail: pct(outcomes.fail) },
    opCount,
    tiers,
    cleanPerHrByDay,
    sessions: sessions.length,
    actionsPerSession: mean(sessions.map((s) => s.actions)),
    checks: [],
  }
  summary.checks = [
    { name: 'Act I clear (d)', value: summary.actClear1, min: 1, max: 2 },
    { name: 'Act II clear (d after Act I)', value: summary.actClear2, min: 3, max: 5 },
    { name: 'Vault fill Act I (h)', value: summary.vaultFillAct1, min: 2, max: 3 },
    { name: 'Vault fill Act II, day 4+ (h)', value: summary.vaultFillAct2, min: 4.5, max: 6.5 },
    { name: 'Heat mean', value: summary.heatMean, min: 25, max: 35 },
    { name: 'Raids', value: summary.raids, min: 0, max: 1 },
    { name: 'Front util', value: summary.frontUtil, min: 0.7, max: 0.9 },
    { name: 'Dirty idle @ session end', value: summary.dirtyIdlePct, min: 0.2, max: 0.5 },
    { name: 'Partial op outcomes', value: opCount ? summary.opOutcomes.partial : null, min: 0.4, max: 0.6 },
    { name: 'Missed wages', value: summary.missedWages, min: 0, max: 0 },
  ]
  return summary
}

export const checkOk = (ch: Check): boolean | null =>
  ch.value === null || Number.isNaN(ch.value) ? null : ch.value >= ch.min - 1e-9 && ch.value <= ch.max + 1e-9

const mark = (ok: boolean | null) => (ok === null ? '·' : ok ? '✓' : '✗')
const f1 = (n: number | null) => (n === null || Number.isNaN(n) ? '—' : n.toFixed(1))
const pc = (n: number) => (Number.isNaN(n) ? '—' : `${Math.round(n * 100)}%`)
const pad = (s: string, n: number) => s.padEnd(n)

export function formatSummary(s: Summary): string {
  const ok = (name: string) => mark(checkOk(s.checks.find((ch) => ch.name.startsWith(name))!))
  const lines = [
    s.title,
    '',
    `${pad('Act I clear:', 18)}${pad(s.actClear1 === null ? 'not reached' : `${f1(s.actClear1)} d`, 14)}(target 1–2)      ${ok('Act I clear')}`,
    `${pad('Act II clear:', 18)}${pad(s.actClear2 === null ? 'not reached' : `${f1(s.actClear2)} d`, 14)}(3–5 after Act I) ${ok('Act II clear')}`,
    `${pad('Raids:', 18)}${pad(String(s.raids), 8)}Arrests: ${pad(String(s.arrests), 4)}Missed wages: ${s.missedWages}  Walkouts: ${s.walkouts}   ${ok('Raids')}${ok('Missed wages')}`,
    `${pad('Heat mean:', 18)}${pad(String(Math.round(s.heatMean)), 8)}min ${Math.round(s.heatMin)}  max ${Math.round(s.heatMax)}   hours ≥40: ${s.hoursAbove40}   ${ok('Heat mean')}`,
    `${pad('Front util:', 18)}${pad(pc(s.frontUtil), 8)}Dirty idle @ session end: ${pc(s.dirtyIdlePct)}   ${ok('Front util')}${ok('Dirty idle')}`,
    `${pad('Vault fill (h):', 18)}${s.vaultFillByDay.map((v, i) => `d${i + 1} ${f1(v)}`).join('  ')}   ${ok('Vault fill Act I')}${ok('Vault fill Act II')}`,
    `${pad('Op outcomes:', 18)}full ${pc(s.opOutcomes.full)}  partial ${pc(s.opOutcomes.partial)}  fail ${pc(s.opOutcomes.fail)}  (${s.opCount} ops)   ${ok('Partial')}`,
    `${pad('Clean/hr by day:', 18)}${s.cleanPerHrByDay.map((v, i) => `d${i + 1} ${Math.round(v)}`).join('  ')}`,
    `${pad('Sessions:', 18)}${pad(String(s.sessions), 8)}actions/session: ${f1(s.actionsPerSession)}`,
    `${pad('Tiers @ end:', 18)}${s.tiers}`,
  ]
  const passed = s.checks.filter((ch) => checkOk(ch) === true).length
  lines.push('', `Targets met: ${passed}/${s.checks.length}`)
  return lines.join('\n')
}

const CSV_COLUMNS = [
  'hour', 'day', 'act', 'dirty', 'clean', 'vault', 'vaultCap', 'heat', 'heatTarget', 'exposure', 'control',
  'yield', 'rep', 'influence', 'frontUtil', 'cleanEarned', 'dirtyEarned',
] as const

export function toCsv(trace: Trace): string {
  const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3))
  const rows = trace.hours.map((h) => CSV_COLUMNS.map((k) => round(h[k])).join(','))
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n'
}

import { View } from 'react-native'
import { fmt, fmtDuration, fmtRate } from '../format'
import type { Snapshot } from '../store'
import { Card, colors, glyph, Row, T } from './ui'

// The Dirty/Clean rule as a picture (ADR 0026): what comes in, what running the operation costs,
// what the fronts are washing, and what's left. Read straight from `derive`.
export function MoneyFlow({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const d$ = glyph.dirty
  const cl = glyph.clean
  const running = d.wagesPerHr + (d.upkeepPerHr ?? 0)
  const washing = d.perFront.filter((f) => (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0) > 0)
  const washIn = washing.reduce((sum, f) => sum + f.throughput, 0)
  const washOut = washing.reduce((sum, f) => sum + f.throughput * f.rate, 0)
  const fillMs = d.yieldPerHr > 0 ? ((d.vaultCap - s.vault) / d.yieldPerHr) * c.time.hourMs : Infinity
  const reserve = running * c.fronts.reserveHours
  const short = running > 0 && s.dirty + s.vault < reserve
  return (
    <Card>
      <Row label="Businesses → vault" hint={s.vault >= d.vaultCap - 1e-6 ? 'full' : `full in ${fmtDuration(fillMs, c)}`} value={`+${d$}${fmtRate(d.yieldPerHr)}`} color={colors.dirty} />
      <Row label="Running costs" hint="wages and upkeep, paid in Dirty" value={`−${d$}${fmtRate(running)}`} />
      <Row
        label="Fronts washing"
        hint={washing.length ? `${d$}${fmtRate(washIn)} in` : 'idle: deposit Dirty to launder'}
        value={washing.length ? `+${cl}${fmtRate(washOut)}` : '—'}
        color={washing.length ? colors.clean : colors.faint}
      />
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
      <Row label="Dirty on hand" value={`${d$}${fmt(s.dirty)}`} color={colors.dirty} />
      <Row label="Clean on hand" hint="buys businesses, earns Rep" value={`${cl}${fmt(s.clean)}`} color={colors.clean} />
      {short && (
        <T small color={colors.heat}>
          {`Dirty on hand won’t cover ${c.fronts.reserveHours}h of running costs (${d$}${fmt(reserve)}). Keep some back when you launder.`}
        </T>
      )}
    </Card>
  )
}

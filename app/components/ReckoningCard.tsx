import { caseFile, hearingChance, illegalShare } from '../../engine'
import { fmt, fmtClock, pct } from '../format'
import type { Snapshot } from '../store'
import { Bar, Card, colors, glyph, Row, T } from './ui'

// Act VI (ADR 0045): the case the prosecutor is building, how likely a hearing is at the next day start, and
// how far each ending is.
export function ReckoningCard({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const rk = c.reckoning
  const earners = s.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises')
  const legal = earners.filter((r) => r.legal).length
  const held = s.districts.filter((x) => x.controller === 'player').length
  const won = s.stats.hearings.won
  const file = caseFile(s, c)
  const endings = s.stats.endings
  return (
    <Card>
      <Row label="Still illegal" hint="share of gross yield" value={pct(illegalShare(d))} color={illegalShare(d) > 0 ? colors.warn : colors.good} />
      <Row label="Chance of a hearing" hint="at each day start, one at a time" value={pct(hearingChance(s, c, d))} color={colors.heat} />
      <Row label="The case file" hint={`raids, arrests, frozen fronts, missed payments · up to ${rk.maxCase}`} value={fmt(file)} color={colors.heat} />
      <Bar value={file} max={rk.maxCase} color={colors.heat} />
      <T small muted>
        {`A hearing can be settled in Clean, fought in court (best Brains against a difficulty the case file raises), or left to run, which costs your busiest front a day. Every business made legal makes a hearing less likely; with nothing illegal, none come.`}
      </T>
      <Row
        label="The Holding"
        hint="every business legal"
        value={endings.holding !== undefined ? `reached ${fmtClock(endings.holding, s.createdAt, c)}` : `${legal}/${earners.length}`}
        color={endings.holding !== undefined ? colors.good : colors.clean}
      />
      <Row
        label="The Empire"
        hint={`every district held, and ${rk.empireWins} hearings won`}
        value={endings.empire !== undefined ? `reached ${fmtClock(endings.empire, s.createdAt, c)}` : `${held}/${s.districts.length} · ${Math.min(won, rk.empireWins)}/${rk.empireWins}`}
        color={endings.empire !== undefined ? colors.good : colors.warn}
      />
      <T small color={colors.faint}>
        {`Legal businesses earn ${glyph.clean} directly at ${pct(c.legalize.cleanShare)} of their takings; the rest is tax. Either ending is recorded, neither stops the game.`}
      </T>
    </Card>
  )
}

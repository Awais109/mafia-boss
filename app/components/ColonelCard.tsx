import { colonelHolds, colonelHostile, customsChance, hijackChance, passageActive, passageCost } from '../../engine'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, Card, colors, glyph, Row, T } from './ui'

// The Colonel (ADR 0043): he holds Zastava and the highway to the border. From Act IV, a convoy on his road
// without passage risks being taken; customs at the crossing is a separate risk that heat drives.
export function ColonelCard({ game }: { game: Snapshot }) {
  const { state: s, config: c, now } = game
  const col = s.rival.colonel
  const cc = c.rivals.colonel
  const holds = colonelHolds(s)
  const hostile = colonelHostile(s, c)
  const paid = passageActive(s, now)
  const cost = passageCost(s, c)
  const mood = hostile ? 'hostile' : col.disposition < 0 ? 'cold' : col.disposition >= 20 ? 'obliging' : 'correct'
  const d = glyph.dirty
  return (
    <Card>
      <T small muted>
        {holds
          ? 'A retired border-guard colonel who runs Zastava and the highway to the crossing. His men stop what doesn’t pay.'
          : 'Zastava is yours. The Colonel still drinks at the truck stop, but the road answers to you now.'}
      </T>
      <Row label="Mood" hint={`disposition ${fmt(col.disposition)}`} value={mood} color={hostile ? colors.heat : col.disposition < 0 ? colors.warn : colors.good} />
      {holds && (
        <>
          <Row
            label="Passage"
            hint={paid ? `paid for ${fmtDuration(col.passageUntil - now, c)} more` : `${cc.passage.hours}h of the road`}
            value={paid ? 'paid' : `${d}${fmt(cost)}`}
            color={paid ? colors.good : undefined}
          />
          <Btn
            small
            kind={paid ? 'normal' : 'primary'}
            title={paid ? `Extend ${cc.passage.hours}h for ${d}${fmt(cost)}` : `Pay for passage ${d}${fmt(cost)}`}
            disabled={s.dirty < cost}
            onPress={() => store.dispatch({ type: 'BUY_PASSAGE' })}
          />
        </>
      )}
      <Row label="Convoy taken on the road" value={pct(hijackChance(s, c, now))} color={hijackChance(s, c, now) > 0 ? colors.heat : colors.good} />
      <Row label="Convoy seized at customs" hint={`${pct(c.convoys.customsBase)} + heat`} value={pct(customsChance(s, c))} color={colors.warn} />
      <T small color={colors.faint}>
        {`Passage costs ${cc.passage.hoursOfYield}h of your Dirty yield and warms him. Pressuring or taking his district cools him; below ${cc.hostileBelow} his men take convoys ×${c.convoys.hijackHostileMult} as often. Take Zastava and the road is yours. Customs takes less with the Customs Chief or a Bonded Warehouse in Zastava.`}
      </T>
    </Card>
  )
}

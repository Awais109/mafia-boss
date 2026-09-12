import { View } from 'react-native'
import { influenceRoom, OFFICIAL_IDS } from '../../engine'
import { Bar, Btn, Card, colors, Row, Screen, Section, T, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

export function HeatScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const h = c.heat
  const bribeActive = s.bribeControl > 0 && s.bribeUntil > now
  const cooldown = s.officialCooldownUntil - now
  const heatColor = s.heat >= h.raidThreshold ? colors.heat : s.heat >= h.inspectThreshold ? colors.warn : colors.good
  const line = (active: boolean, danger: boolean) => (active ? (danger ? colors.heat : colors.warn) : colors.faint)

  return (
    <Screen>
      <Section title="Heat">
        <Card>
          <Row label="Heat now" value={String(Math.round(s.heat))} color={heatColor} />
          <Bar value={s.heat} max={100} color={heatColor} marks={[h.inspectThreshold, h.raidThreshold, h.arrestThreshold]} />
          <Row label="Heading to" hint={`closes ${pct(h.convergePerHr)} of the gap each hour`} value={String(Math.round(d.heatTarget))} />
          <T small muted>
            Target = exposure ÷ (exposure + control) = {fmt(d.exposure)} ÷ ({fmt(d.exposure)} + {fmt(d.control)})
          </T>
          <T small color={line(s.heat >= h.inspectThreshold, false)}>
            {`≥ ${h.inspectThreshold}: inspections, yield ×${h.inspectYieldMult}${s.inspected ? '  ← now' : ''}`}
          </T>
          <T small color={line(s.heat >= h.raidThreshold, true)}>
            {`≥ ${h.raidThreshold}: raids, ${pct(h.raidChancePerHr)} an hour, seize ${pct(h.raidSeizePct)} of the vault`}
          </T>
          <T small color={line(s.heat >= h.arrestThreshold, true)}>
            {`≥ ${h.arrestThreshold}: arrests, ${pct(h.arrestChancePerHr)} an hour, ${h.arrestHours}h in a cell`}
          </T>
        </Card>
      </Section>

      <Section title="Exposure">
        <Card>
          <Row label="Rackets" hint="grows with every tier" value={`▲ ${fmt(d.racketExposure)}`} />
          <Row label="Busy fronts" hint={`running above ${pct(c.fronts.suspicionStartUtil)}`} value={`▲ ${fmt(d.frontSuspicion)}`} />
          <Row label="Total" value={`▲ ${fmt(d.exposure)}`} color={colors.heat} />
        </Card>
      </Section>

      <Section title="Control">
        <Card>
          <Row label="Base" value={fmt(d.controlParts.base)} />
          <Row label="Officials" value={fmt(d.controlParts.officials)} />
          <Row label="Bribe" hint={bribeActive ? `${fmtDuration(s.bribeUntil - now, c)} left` : undefined} value={fmt(d.controlParts.bribe)} />
          <Row label="Districts taken" hint={`+${pct(h.districtControlPct)} each`} value={`×${d.controlParts.districtMult.toFixed(2)}`} />
          <Row label="Total" value={fmt(d.control)} color={colors.influence} />
        </Card>
      </Section>

      <Section title="Bribe">
        <Card>
          <T small muted>
            The emergency lever: +{pct(h.bribe.controlPct)} of your base and official control for {h.bribe.hours}h. Costs{' '}
            {h.bribe.costPerExposure} Dirty per point of exposure.
          </T>
          <Btn
            kind="primary"
            title={bribeActive ? `Working: ${fmtDuration(s.bribeUntil - now, c)} left` : `Bribe ◆${fmt(d.costs.bribe)}`}
            disabled={bribeActive || s.dirty < d.costs.bribe}
            onPress={() => store.dispatch({ type: 'BRIBE' })}
          />
        </Card>
      </Section>

      <Section title="Officials" right={<T small muted>{`✦ ${fmt(s.influence)} · +${fmtRate(d.influencePerHr)}`}</T>}>
        <Card>
          <T small muted>
            Officials are permanent control. Influence comes from jobs (✦ {fmt(c.ops.influenceDailyCap - influenceRoom(s, c, now))}/
            {c.ops.influenceDailyCap} today) and from officials already on the payroll.
          </T>
          {cooldown > 0 && <T small color={colors.warn}>{`Next official in ${fmtDuration(cooldown, c)}`}</T>}
        </Card>
        {OFFICIAL_IDS.map((id) => {
          const o = c.officials.list[id]
          const owned = s.officials.includes(id)
          return (
            <Card key={id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T bold>{o.name}</T>
                {owned ? <Tag text="on the payroll" color={colors.good} /> : !d.unlocked.official[id] ? <Tag text="Act II" /> : null}
              </View>
              <T small muted>{`+${fmt(o.control)} control · +✦${fmt(c.officials.influencePerHrEach * 24)} a day`}</T>
              {!owned && d.unlocked.official[id] && (
                <Btn
                  small
                  kind="primary"
                  title={`Put on the payroll: ✦${fmt(o.cost)}`}
                  disabled={s.influence < o.cost || cooldown > 0}
                  onPress={() => store.dispatch({ type: 'BUY_OFFICIAL', officialId: id })}
                />
              )}
            </Card>
          )
        })}
      </Section>
    </Screen>
  )
}

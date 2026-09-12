import { FRONT_MODES, FRONT_TYPES } from '../../engine'
import { Bar, Btn, BtnRow, Card, colors, Money, Row, Screen, T, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

const MODE_LABEL = { push: 'Push', normal: 'Normal', layLow: 'Lay low' } as const

export function FrontsScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c } = game
  const deposit = (frontId: string, amount: number) => store.dispatch({ type: 'DEPOSIT', frontId, amount })
  // "Launder all but running costs": keep reserveHours of wages and upkeep in Dirty, wash the rest best rate first.
  const keep = (d.wagesPerHr + (d.upkeepPerHr ?? 0)) * c.fronts.reserveHours
  const plan: { frontId: string; amount: number }[] = []
  {
    let available = Math.floor(s.dirty - keep)
    for (const f of [...d.perFront].sort((a, b) => b.rate - a.rate)) {
      const room = f.bufferCap - (s.fronts.find((x) => x.id === f.id)?.buffer ?? 0)
      const amount = Math.floor(Math.min(available, room))
      if (amount >= 1) {
        plan.push({ frontId: f.id, amount })
        available -= amount
      }
    }
  }
  const planned = plan.reduce((sum, p) => sum + p.amount, 0)

  return (
    <Screen>
      <Card>
        <T small muted>
          Fronts turn Dirty into Clean at a fixed rate per hour. Deposit Dirty into a front’s buffer and it keeps
          laundering while you’re away. A front running above {pct(c.fronts.suspicionStartUtil)} for hours draws suspicion.
        </T>
        <Row label="Your rackets make" value={<Money kind="dirty" value={fmtRate(d.yieldPerHr)} />} />
        <Row label="Your fronts can launder" value={<Money kind="dirty" value={fmtRate(d.throughputPerHr)} />} />
        {d.yieldPerHr > d.throughputPerHr && (
          <T small color={colors.warn}>You make more Dirty than you can launder. That’s the squeeze: pick what to wash.</T>
        )}
        <Btn
          kind="primary"
          title={planned >= 1 ? `Launder ◆${fmt(planned)}, keep ◆${fmt(Math.min(s.dirty, keep))} for costs` : `Nothing to spare: keeping ◆${fmt(keep)} for costs`}
          disabled={planned < 1}
          onPress={() => plan.forEach((p) => deposit(p.frontId, p.amount))}
        />
        <T small muted>{`Keeps ${c.fronts.reserveHours}h of wages and upkeep in Dirty: those are paid from Dirty, never Clean.`}</T>
      </Card>

      {d.perFront.map((f) => {
        const front = s.fronts.find((x) => x.id === f.id)!
        const name = c.fronts.types[f.type].name
        const max = Math.floor(Math.min(s.dirty, f.bufferCap - front.buffer))
        const half = Math.floor(max / 2)
        return (
          <Card key={f.id}>
            <Row label="" value={<T bold>{`${name} · rate level ${front.level} · capacity ${front.capacityLevel}`}</T>} />
            {f.suspicion > 0 && <Tag text={`suspicious: +${fmt(f.suspicion)} exposure`} color={colors.warn} />}
            <BtnRow>
              {FRONT_MODES.map((mode) => (
                <Btn
                  key={mode}
                  small
                  kind={front.mode === mode ? 'primary' : 'ghost'}
                  title={MODE_LABEL[mode]}
                  onPress={() => {
                    if (front.mode !== mode) store.dispatch({ type: 'SET_FRONT_MODE', frontId: f.id, mode })
                  }}
                />
              ))}
            </BtnRow>
            <T small muted>
              {`Push: ×${c.fronts.modes.push.throughputMult}, suspicion from ${pct(c.fronts.modes.push.suspicionStartUtil)} running · Lay low: ×${c.fronts.modes.layLow.throughputMult}, no suspicion`}
            </T>
            <Row label="Rate" hint={`◆100 → ●${fmt(f.rate * 100)}`} value={pct(f.rate)} color={colors.clean} />
            <Row label="Throughput" hint={f.mode !== 'normal' ? `◆${fmtRate(f.baseThroughput)} at normal` : undefined} value={`◆${fmtRate(f.throughput)}`} />
            <Bar value={front.buffer} max={f.bufferCap} color={colors.dirty} marks={[f.throughput]} />
            <Row
              label="Buffer"
              hint={front.buffer > 0 ? `empty in ${fmtDuration(f.hoursToEmpty * c.time.hourMs, c)}` : 'idle'}
              value={`${fmt(front.buffer)} / ${fmt(f.bufferCap)}`}
            />
            <Row label="Running" hint="recent average" value={pct(f.util)} color={f.util > c.fronts.suspicionStartUtil ? colors.warn : undefined} />
            <BtnRow>
              {half >= 1 && half < max && <Btn small title={`+◆${fmt(half)}`} onPress={() => deposit(f.id, half)} />}
              <Btn small kind="primary" title={max >= 1 ? `Deposit ◆${fmt(max)}` : 'Deposit'} disabled={max < 1} onPress={() => deposit(f.id, max)} />
              {f.upgradeCost !== null && (
                <Btn
                  small
                  title={`Rate +${pct(c.fronts.upgrade.rateStep)} (●${fmt(f.upgradeCost)})`}
                  disabled={s.clean < f.upgradeCost}
                  onPress={() => store.dispatch({ type: 'UPGRADE_FRONT', frontId: f.id })}
                />
              )}
              {f.capacityUpgradeCost !== null && (
                <Btn
                  small
                  title={`Capacity +${pct(c.fronts.upgrade.capacity.step)} (●${fmt(f.capacityUpgradeCost)})`}
                  disabled={s.clean < f.capacityUpgradeCost}
                  onPress={() => store.dispatch({ type: 'UPGRADE_FRONT', frontId: f.id, track: 'capacity' })}
                />
              )}
            </BtnRow>
          </Card>
        )
      })}

      {FRONT_TYPES.filter((t) => !s.fronts.some((f) => f.type === t)).map((t) => {
        const ft = c.fronts.types[t]
        return (
          <Card key={t}>
            <T bold>{ft.name}</T>
            <T small muted>
              Rate {pct(ft.rate)} · launders ◆{fmtRate(ft.throughput)}
            </T>
            {d.unlocked.front[t] ? (
              <Btn
                kind="primary"
                title={`Open for ●${fmt(ft.cost)}`}
                disabled={s.clean < ft.cost}
                onPress={() => store.dispatch({ type: 'BUY_FRONT', frontType: t })}
              />
            ) : (
              <T small color={colors.rep}>Unlocks at ★{fmt(ft.unlockRep)}</T>
            )}
          </Card>
        )
      })}
    </Screen>
  )
}

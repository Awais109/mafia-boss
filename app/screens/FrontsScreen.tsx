import { FRONT_TYPES } from '../../engine'
import { Bar, Btn, BtnRow, Card, colors, Money, Row, Screen, T, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

export function FrontsScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c } = game
  const deposit = (frontId: string, amount: number) => store.dispatch({ type: 'DEPOSIT', frontId, amount })

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
      </Card>

      {d.perFront.map((f) => {
        const front = s.fronts.find((x) => x.id === f.id)!
        const name = c.fronts.types[f.type].name
        const max = Math.floor(Math.min(s.dirty, f.bufferCap - front.buffer))
        const half = Math.floor(max / 2)
        return (
          <Card key={f.id}>
            <Row label="" value={<T bold>{`${name} · level ${front.level}`}</T>} />
            {f.suspicion > 0 && <Tag text={`suspicious: +${fmt(f.suspicion)} exposure`} color={colors.warn} />}
            <Row label="Rate" hint={`◆100 → ●${fmt(f.rate * 100)}`} value={pct(f.rate)} color={colors.clean} />
            <Row label="Throughput" value={`◆${fmtRate(f.throughput)}`} />
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

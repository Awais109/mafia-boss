import { dayMs } from '../../engine'
import { Bar, Btn, BtnRow, Card, colors, Money, Row, Screen, Section, T } from '../components/ui'
import { describeEvent } from '../eventText'
import { fmt, fmtClock, fmtDuration, fmtRate } from '../format'
import { store } from '../store'
import type { ScreenProps } from './types'

export function HomeScreen({ game, go }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const full = s.vault >= d.vaultCap - 1e-6
  const fillMs = d.yieldPerHr > 0 ? ((d.vaultCap - s.vault) / d.yieldPerHr) * c.time.hourMs : Infinity
  const idle = s.crew.filter((m) => m.status === 'idle').length
  const nextPayday = (Math.floor(now / dayMs(c)) + 1) * dayMs(c)
  const wagesDue = s.wagesOwed + d.wagesPerHr * ((nextPayday - now) / c.time.hourMs)
  const buffered = s.fronts.reduce((sum, f) => sum + f.buffer, 0)
  const demand = s.rival.tolya.demand
  const nextAct = s.act === 1 ? c.reputation.actThresholds[2] : c.reputation.actThresholds[3]
  // Milestones come from stats, which persist; the ACT_* events fall out of the 200-event log.
  const reachedActII = s.stats.actClearedAt[1]
  const clearedActII = s.stats.actClearedAt[2]
  const cleared = clearedActII !== undefined
  const recent = s.log
    .slice()
    .reverse()
    .map((e) => describeEvent(e, s, c))
    .filter((line) => !line.quiet)
    .slice(0, 6)

  return (
    <Screen>
      {demand !== null && (
        <Card style={{ borderColor: colors.heat }}>
          <T bold color={colors.heat}>Tolya wants his cut</T>
          <T small muted>
            Pay ◆{fmt(demand)} before his next visit in {fmtDuration(s.rival.tolya.nextTickAt - now, c)}, or his boys break something.
          </T>
          <BtnRow>
            <Btn small kind="primary" title={`Pay ◆${fmt(demand)}`} disabled={s.dirty < demand} onPress={() => store.dispatch({ type: 'PAY_TRIBUTE' })} />
          </BtnRow>
        </Card>
      )}

      <Section title="Vault">
        <Card>
          <Row label="Rackets make" value={<Money kind="dirty" value={fmtRate(d.yieldPerHr)} />} />
          <Bar value={s.vault} max={d.vaultCap} color={full ? colors.heat : colors.dirty} />
          <Row
            label={full ? 'Full: income has stopped' : `Full in ${fmtDuration(fillMs, c)}`}
            value={`${fmt(s.vault)} / ${fmt(d.vaultCap)}`}
            color={full ? colors.heat : undefined}
          />
          <Btn kind="primary" title={`Collect ◆${fmt(s.vault)}`} disabled={s.vault < 1} onPress={() => store.dispatch({ type: 'COLLECT' })} />
        </Card>
      </Section>

      <Section title="Money">
        <Card>
          <Row label="Dirty" hint="wages, repairs, bribes" value={<Money kind="dirty" value={fmt(s.dirty)} />} />
          <Row label="Clean" hint="buys businesses" value={<Money kind="clean" value={fmt(s.clean)} />} />
          <Row label="In the wash" value={`◆${fmt(buffered)} → up to ●${fmtRate(d.cleanPerHrMax)}`} />
          <BtnRow>
            <Btn small title="Launder →" onPress={() => go('fronts')} />
            <Btn small title="Spend →" onPress={() => go('rackets')} />
          </BtnRow>
        </Card>
      </Section>

      <Section title="Operation">
        <Card>
          <Row label="Crew idle" value={`${idle} of ${s.crew.length}`} color={idle ? colors.dirty : undefined} />
          <Row label="Jobs running" value={String(s.ops.length)} />
          {/* Owed so far moves with time; the projected bill at payday doesn't, and read as frozen. */}
          <Row label="Wages owed" hint={`+◆${fmtRate(d.wagesPerHr)} · paid in ${fmtDuration(nextPayday - now, c)}`} value={`◆${fmt(s.wagesOwed)}`} />
          {s.dirty + s.vault < wagesDue && (
            <T small color={colors.heat}>
              Not enough Dirty on hand to cover the ◆{fmt(wagesDue)} due at payday.
            </T>
          )}
          <Row
            label="Heat"
            hint={`heading to ${Math.round(d.heatTarget)}`}
            value={String(Math.round(s.heat))}
            color={s.heat >= c.heat.raidThreshold ? colors.heat : s.heat >= c.heat.inspectThreshold ? colors.warn : undefined}
          />
          {s.inspected && <T small color={colors.warn}>Inspections are cutting yield by {Math.round((1 - c.heat.inspectYieldMult) * 100)}%.</T>}
          <BtnRow>
            <Btn small title="Ops →" onPress={() => go('ops')} />
            <Btn small title="Heat →" onPress={() => go('heat')} />
          </BtnRow>
        </Card>
      </Section>

      <Section title={cleared ? 'The end of the prototype' : 'Next'}>
        <Card>
          {s.act === 1 ? (
            <T small muted>
              Act II at ★{fmt(nextAct)}: the Restaurant front, two more crew slots, the Port Quarter and Sovietsky Blocks.
            </T>
          ) : !cleared ? (
            <T small muted>
              Act II is cleared at ★{fmt(nextAct)}, the end of the prototype. Bigger rackets unlock as your Reputation grows.
            </T>
          ) : (
            <T small color={colors.rep}>
              Act II cleared. Acts I–II are all that’s built: nothing more unlocks, and Reputation keeps counting. Keep playing to see how
              the late game holds up, or export the log and start over from Debug.
            </T>
          )}
          <Bar value={s.reputation} max={nextAct} color={colors.rep} />
          <Row label="Reputation" value={cleared ? `★${fmt(s.reputation)}` : `★${fmt(s.reputation)} / ${fmt(nextAct)}`} color={colors.rep} />
          {reachedActII !== undefined && <Row label="Act II reached" value={fmtClock(reachedActII, s.createdAt, c)} />}
          {clearedActII !== undefined && <Row label="Act II cleared" value={fmtClock(clearedActII, s.createdAt, c)} />}
          {cleared && (
            <BtnRow>
              <Btn small title="Export log" onPress={() => void store.exportLog()} />
              {c.debug.enabled && <Btn small kind="ghost" title="Debug →" onPress={() => go('debug')} />}
            </BtnRow>
          )}
        </Card>
      </Section>

      <Section title="Lately" right={<Btn small kind="ghost" title="Log →" onPress={() => go('log')} />}>
        <Card>
          {recent.length ? (
            recent.map((line, i) => (
              <T key={i} small color={line.color}>
                {line.text}
              </T>
            ))
          ) : (
            <T small muted>Nothing yet.</T>
          )}
        </Card>
      </Section>
    </Screen>
  )
}

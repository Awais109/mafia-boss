import { StyleSheet, Text, View } from 'react-native'
import { dayMs, gameDay, opName } from '../../engine'
import { Glyph, Icon } from '../components/Glyph'
import { InboxCard } from '../components/InboxCard'
import { MoneyFlow } from '../components/MoneyFlow'
import { NextCard } from '../components/NextCard'
import { SupplyCard, supplyNote } from '../components/SupplyCard'
import { TributeCard } from '../components/TributeCard'
import { AlertRow, BigFigure, Btn, Card, Check, colors, Empty, glyph, Item, List, Meter, Note, rich, Screen, Section, SectionLink } from '../components/ui'
import { WeekCard } from '../components/WeekCard'
import { describeEvent } from '../eventText'
import { fmt, fmtDuration, fmtRate, fmtStamp } from '../format'
import { ACT_NAME } from '../acts'
import { goalsView } from '../goals'
import { homeAlerts, sortedInbox } from '../inbox'
import { ledgerView } from '../ledger'
import { store } from '../store'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Home (design: Home, and its opening and Act V variants): what needs you first (Tolya, decisions, alerts,
// Act I's goals), then the money (the vault, the flow, the stock), the operation, the week, what's next,
// and the latest lines.
export function HomeScreen({ game, go }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const opening = !s.tutorial.done
  const inbox = sortedInbox(s)
  const goals = goalsView(s, c, d)
  const alerts = homeAlerts(game).filter((a) => a.key !== 'vault')
  const today = gameDay(c, s, now)
  const cigarettes = supplyNote(game)
  const premium = supplyNote(game, 'premium')
  const recent = s.log
    .slice()
    .reverse()
    .map((e) => ({ e, line: describeEvent(e, s, c) }))
    .filter(({ line }) => !line.quiet)
    .slice(0, 6)

  return (
    <Screen>
      {s.rockBottom.pending && !s.rockBottom.usedActs.includes(s.act) && <RockBottom game={game} />}

      {s.rival.tolya.demand !== null && (
        <Section title="Tolya’s demand" right={`back in ${fmtDuration(s.rival.tolya.nextTickAt - now, c)}`}>
          <TributeCard game={game} />
        </Section>
      )}

      {(inbox.length > 0 || opening) && (
        <Section title={inbox.length ? `Waiting for you · ${inbox.length}` : 'Waiting for you'}>
          {inbox.length ? (
            inbox.map((item) => <InboxCard key={item.id} item={item} game={game} />)
          ) : (
            <Empty title="Nothing yet" sub="When someone in the city wants an answer, it waits here with a clock on it." />
          )}
        </Section>
      )}

      {alerts.length > 0 && (
        <Section title={`Alerts · ${alerts.length}`}>
          {alerts.map((a) => (
            <AlertRow key={a.key} icon={a.icon} title={a.title} sub={a.sub} tone={a.tone} cta={a.cta} onPress={a.tab ? () => go(a.tab!) : undefined} />
          ))}
        </Section>
      )}

      {goals && (
        <Section title={`Act I goals · ${s.goals.done.length}/${c.goals.list.length}`} right={<Note>{`${glyph.gold}${c.goals.rewardGold} each`}</Note>}>
          <List>
            {goals.map((g) => (
              <Item
                key={g.id}
                left={<Check state={g.done ? 'done' : 'todo'} />}
                label={g.text}
                hint={g.hint}
                muted={g.done}
                value={g.done ? <Text style={styles.paid}>paid</Text> : <Text style={styles.reward}>{rich(`${glyph.gold}${c.goals.rewardGold}`, 13)}</Text>}
              />
            ))}
          </List>
        </Section>
      )}

      <Vault game={game} />

      <Section title="Money flow" right="per hour">
        <MoneyFlow game={game} />
      </Section>

      <Section title="Cigarettes" right={<Note color={cigarettes.color}>{cigarettes.text}</Note>}>
        <SupplyCard game={game} />
      </Section>

      {s.act >= c.premium.fromAct && (
        <Section title="Premium" right={<Note color={premium.color}>{premium.text}</Note>}>
          <SupplyCard game={game} product="premium" />
        </Section>
      )}

      <Section title="Operation">
        <Operation game={game} />
      </Section>

      <Section title="This week" right={today <= 7 ? `day ${today} of 7` : `days ${today - 6}–${today}`}>
        <WeekCard days={ledgerView(s, c, now)} today={today} />
      </Section>

      <NextCard game={game} go={go} />

      <Section title="Lately" right={<SectionLink title="Log" onPress={() => go('log')} />}>
        {recent.length ? (
          <List>
            {recent.map(({ e, line }, i) => (
              <View key={`${e.t}-${i}`} style={styles.lately}>
                <Text style={styles.stamp}>{fmtStamp(e.t, now, s.createdAt, c)}</Text>
                <Text style={[styles.lateText, line.color ? { color: line.color } : null]}>{rich(line.text, 13)}</Text>
              </View>
            ))}
          </List>
        ) : (
          <Empty title="Nothing yet" />
        )}
      </Section>
    </Screen>
  )
}

// The vault (design: Home · Vault): what's in it against the cap, when it fills, and Collect. Once every
// business is legal nothing earns into it, and it goes.
function Vault({ game }: { game: ScreenProps['game'] }) {
  const { state: s, derived: d, config: c } = game
  const earners = d.perRacket.filter((r) => r.kind !== 'premises')
  if (earners.length > 0 && earners.every((r) => r.legal) && s.vault < 1) return null
  const full = s.vault >= d.vaultCap - 1e-6
  const fillMs = ((d.vaultCap - s.vault) / d.yieldPerHr) * c.time.hourMs
  const lastCollect = s.log.findLast((e) => e.type === 'COLLECTED')
  return (
    <Section title="Vault" right={<Note color={colors.dirty}>{`+${glyph.dirty}${fmtRate(d.yieldPerHr)}`}</Note>}>
      <Card style={styles.vault}>
        <View style={styles.vaultTop}>
          <BigFigure kind="dirty" value={fmt(s.vault)} of={fmt(d.vaultCap)} color={full ? colors.bad : undefined} />
          <Text style={styles.vaultNote}>
            {full ? (
              <Text style={{ color: colors.bad, fontFamily: fonts.text600 }}>full: income has stopped</Text>
            ) : d.yieldPerHr > 0 ? (
              <>
                {'full in '}
                <Text style={styles.vaultWhen}>{fmtDuration(fillMs, c)}</Text>
              </>
            ) : (
              'nothing earning yet'
            )}
          </Text>
        </View>
        <Meter value={s.vault} max={d.vaultCap} color={full ? colors.bad : colors.dirty} />
        {s.vault >= 1 ? (
          <Btn kind="primary" title={`Collect ${glyph.dirty}${fmt(s.vault)}`} onPress={() => store.dispatch({ type: 'COLLECT' })} style={styles.collect} />
        ) : (
          <Empty center title={lastCollect ? `Collected at ${fmtStamp(lastCollect.t, game.now, s.createdAt, c)} · nothing in yet` : 'Nothing to collect yet'} />
        )}
      </Card>
    </Section>
  )
}

// Rock bottom (ADR 0051; design: Home · rock bottom): payday came up short with no Clean. The family's envelope,
// once per act; opening it plays Scene 15.
function RockBottom({ game }: { game: ScreenProps['game'] }) {
  const { state: s, config: c } = game
  return (
    <View style={styles.rock}>
      <View style={styles.rockHead}>
        <Icon name="blocked" size={15} color={colors.bad} />
        <Text style={styles.rockLabel}>ROCK BOTTOM</Text>
        <Text style={styles.rockWhen}>payday</Text>
      </View>
      <Text style={styles.rockTitle}>Payday came up short and there’s no Clean.</Text>
      <Text style={styles.rockBody}>The family can help, once this act.</Text>
      <Btn
        kind="primary"
        title="Open the envelope"
        onPress={() => {
          if (!store.dispatch({ type: 'OPEN_ENVELOPE' })) store.playScene('envelope')
        }}
      />
      <View style={styles.rockFoot}>
        <Text style={styles.rockFootText}>Once per act</Text>
        <Text style={styles.rockFootText}>
          {`Act ${ACT_NAME[s.act]} · `}
          <Text style={styles.rockAvailable}>available</Text>
        </Text>
      </View>
      <Text style={styles.rockNote}>{`It holds about ${c.rockBottom.stakeHours} hours of wages and upkeep. Nothing is ever lost for good: no game over.`}</Text>
    </View>
  )
}

// Who's free, what's running, what's owed, and where heat is heading.
function Operation({ game }: { game: ScreenProps['game'] }) {
  const { state: s, derived: d, config: c, now } = game
  const first = (name: string) => name.split(' ')[0]
  const idle = s.crew.filter((m) => m.status === 'idle')
  const nextPayday = (Math.floor(now / dayMs(c)) + 1) * dayMs(c)
  const soonest = [...s.ops].sort((a, b) => a.completesAt - b.completesAt)[0]
  const line = s.heat >= c.heat.raidThreshold ? `raids above ${c.heat.raidThreshold}` : s.heat >= c.heat.inspectThreshold ? `inspections above ${c.heat.inspectThreshold}` : `no inspections below ${c.heat.inspectThreshold}`
  const heatColor = s.heat >= c.heat.raidThreshold ? colors.bad : s.heat >= c.heat.inspectThreshold ? colors.warn : colors.text
  const idleNames = idle.length > 3 ? `${idle.slice(0, 2).map((m) => first(m.name)).join(', ')} and ${idle.length - 2} more` : idle.map((m) => first(m.name)).join(idle.length === 2 ? ' and ' : ', ')
  const idleHint = !s.crew.length ? 'nobody hired yet' : idle.length === 0 ? 'everyone’s busy' : `${idleNames} ${idle.length === 1 ? 'is' : 'are'} free`
  return (
    <List>
      <Item label={s.crew.length ? 'Crew idle' : 'Crew'} hint={idleHint} value={s.crew.length ? `${idle.length} of ${s.crew.length}` : 'none'} color={s.crew.length ? undefined : colors.faint} />
      <Item
        label="Jobs running"
        hint={
          soonest
            ? `${soonest.crewIds.map((id) => first(s.crew.find((m) => m.id === id)?.name ?? 'someone')).join(', ')} · ${opName(c, soonest).toLowerCase()}`
            : s.crew.length
              ? undefined
              : 'a job needs crew'
        }
        value={soonest ? `${s.ops.length} · ${fmtDuration(soonest.completesAt - now, c)}` : '0'}
        color={soonest ? undefined : colors.faint}
      />
      <Item
        label="Wages owed"
        hint={s.crew.length ? undefined : 'nobody on the books yet'}
        value={
          <Text style={styles.value}>
            {rich(`${glyph.dirty}${fmt(s.wagesOwed)}`, 15)}
            <Text style={styles.valueMuted}>{` · paid in ${fmtDuration(nextPayday - now, c)}`}</Text>
          </Text>
        }
      />
      <Item
        label="Heat"
        hint={line}
        value={
          <View style={styles.heat}>
            <Glyph kind="heat" size={11} />
            <Text style={[styles.value, { color: heatColor }]}>{Math.round(s.heat)}</Text>
            <Text style={styles.valueMuted}>{`→ ${Math.round(d.heatTarget)}`}</Text>
          </View>
        }
      />
    </List>
  )
}

const styles = StyleSheet.create({
  paid: { fontFamily: fonts.text400, fontSize: 12, color: colors.faint },
  rock: { gap: 10, marginHorizontal: -16, marginTop: -18, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#2a1712', borderBottomWidth: 1, borderBottomColor: '#6b3127' },
  rockHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rockLabel: { flex: 1, fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, color: colors.bad },
  rockWhen: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  rockTitle: { fontFamily: fonts.text600, fontSize: 17, color: colors.text },
  rockBody: { fontFamily: fonts.text400, fontSize: 13.5, color: colors.muted, marginTop: -4 },
  rockFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  rockFootText: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  rockAvailable: { fontFamily: fonts.text600, color: colors.text },
  rockNote: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  reward: { fontFamily: fonts.text600, fontSize: 13, color: colors.gold },
  vault: { gap: 12 },
  vaultTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  vaultNote: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  vaultWhen: { fontFamily: fonts.text600, color: colors.text },
  collect: { minHeight: 52 },
  value: { fontFamily: fonts.text600, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  valueMuted: { fontFamily: fonts.text400, fontSize: 15, color: colors.muted },
  heat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lately: { flexDirection: 'row', gap: 8, paddingVertical: 9, paddingHorizontal: 14 },
  stamp: { width: 58, fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.faint, fontVariant: ['tabular-nums'] },
  lateText: { flex: 1, fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.text },
})

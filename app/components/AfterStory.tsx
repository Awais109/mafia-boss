import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg'
import { contractBlocked, empireValue, ENDINGS, gameDay, type Contract, type CrewMember, type Ending } from '../../engine'
import { fmt, fmtDuration, fmtRate } from '../format'
import type { TabId } from '../screens/types'
import { CONTRACT_TEXT, ENDING_NAME } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Btn, colors, glyph, Item, List, rich, Section } from './ui'

// After the story (ADR 0052; design: Home after the story). Once an ending clears the final act, Home's Next
// becomes this: the empire value with its week and best, what it's made of, and the contracts board.

const first = (name: string) => name.split(' ')[0]
const names = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

// The empire value now, the change since today's opening figure, and the best (a day start's, or now's).
export function empireNow(game: Snapshot) {
  const { state: s, config: c, derived: d } = game
  const value = empireValue(s, c, d)
  const h = s.after.history
  const opening = h.length ? h[h.length - 1].value : value.total
  const change = value.total - opening
  return {
    value,
    change,
    pct: opening > 0 ? change / opening : 0,
    best: Math.max(s.after.best, value.total),
  }
}

// The ending that closed the story: the first one reached.
export function firstEnding(game: Snapshot): { id: Ending; t: number } | null {
  const reached = ENDINGS.flatMap((id) => (game.state.stats.endings[id] !== undefined ? [{ id, t: game.state.stats.endings[id]! }] : []))
  return reached.sort((a, b) => a.t - b.t)[0] ?? null
}

export function AfterStory({ game, go }: { game: Snapshot; go: (tab: TabId) => void }) {
  const { state: s, config: c } = game
  const ending = firstEnding(game)
  return (
    <Section title="After the story" right={ending ? `${ENDING_NAME[ending.id]} · Day ${gameDay(c, s, ending.t)}` : undefined}>
      <View style={styles.stack}>
        <EmpireCard game={game} />
        <ContractsBoard game={game} go={go} />
      </View>
    </Section>
  )
}

function EmpireCard({ game }: { game: Snapshot }) {
  const { state: s, derived: d } = game
  const { value: v, change, best } = empireNow(game)
  const legal = s.rackets.filter((r) => r.legal).length
  const premises = s.rackets.filter((r) => game.config.rackets.types[r.type].kind === 'premises').length
  const earners = s.rackets.length - premises
  const income = [d.yieldPerHr > 0 ? `${glyph.dirty}${fmtRate(d.yieldPerHr)}` : '', d.legalCleanPerHr > 0 ? `${glyph.clean}${fmtRate(d.legalCleanPerHr)} after tax` : '']
    .filter(Boolean)
    .join(' + ')
  return (
    <View style={styles.card}>
      <View style={styles.pad}>
        <View style={styles.top}>
          <Text style={styles.caps}>Empire value</Text>
          <Text style={styles.muted}>
            {'best '}
            <Text style={styles.bold}>{fmt(best)}</Text>
          </Text>
        </View>
        <View style={styles.bigRow}>
          <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(v.total)}
          </Text>
          <Text style={[styles.change, { color: change >= 0 ? colors.good : colors.bad }]}>{`${change >= 0 ? '+' : '−'}${fmt(Math.abs(change))} since yesterday`}</Text>
        </View>
        <EmpireChart game={game} total={v.total} best={best} />
        <Text style={styles.muted}>Everything you own, plus a day of income.</Text>
      </View>
      <List style={styles.flush}>
        <Item
          label="Businesses"
          hint={`${earners === legal ? `${legal} legal` : `${earners} businesses${legal ? `, ${legal} legal` : ''}`} · ${premises} premises`}
          value={fmt(v.businesses)}
        />
        <Item label="Fronts" hint={String(s.fronts.length)} value={fmt(v.fronts)} />
        <Item
          label="Cash"
          hint={`${glyph.dirty}${fmt(s.dirty + s.vault)} · ${glyph.clean}${fmt(s.clean)}${s.loan ? ` · less ${glyph.clean}${fmt(s.loan.owed)} owed` : ''}`}
          value={fmt(v.cash)}
        />
        <Item label="A day of income" hint={income ? `${income}, 24 hours` : 'nothing coming in'} value={fmt(v.income)} />
      </List>
      <View style={styles.total}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Empire value</Text>
          <Text style={styles.totalValue}>{fmt(v.total)}</Text>
        </View>
        <View style={styles.doubleRule} />
      </View>
    </View>
  )
}

// The week: the figure at each day start, and now. The best as a dashed line, the ending's day marked.
function EmpireChart({ game, total, best }: { game: Snapshot; total: number; best: number }) {
  const { state: s, config: c, now } = game
  const [width, setWidth] = useState(0)
  const points = [...s.after.history.map((h) => ({ t: h.at, v: h.value })), { t: now, v: total }]
  const ending = firstEnding(game)
  const H = 76
  const top = 14
  const bottom = 58
  const values = [...points.map((p) => p.v), best]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const y = (v: number) => (hi > lo ? bottom - ((v - lo) / (hi - lo)) * (bottom - top) : (top + bottom) / 2)
  const x = (i: number) => (points.length > 1 ? 6 + (i / (points.length - 1)) * (width - 12) : width / 2)
  // The ending marks the first day start after it, if that's on the chart.
  const marked = ending && ending.t > points[0].t - 24 * c.time.hourMs ? points.findIndex((p) => p.t >= ending.t) : -1
  const label = { fontFamily: fonts.text400, fontSize: 10 }
  return (
    <View
      style={styles.chart}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Empire value over ${points.length} days: ${points.map((p) => fmt(p.v)).join(', ')}`}
    >
      {width > 0 && (
        <Svg width={width} height={H}>
          <Line x1={0} x2={width} y1={y(best)} y2={y(best)} stroke={colors.rule} strokeWidth={1} strokeDasharray="3 3" />
          <SvgText x={0} y={y(best) - 4} fill={colors.faint} {...label}>
            best
          </SvgText>
          {points.length > 1 && <Polyline points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} fill="none" stroke={colors.muted} strokeWidth={1.5} />}
          {marked >= 0 && marked < points.length - 1 && <Circle cx={x(marked)} cy={y(points[marked].v)} r={4} fill={colors.card} stroke={colors.muted} strokeWidth={1.5} />}
          <Circle cx={x(points.length - 1)} cy={y(total)} r={3.5} fill={colors.accent} />
          <SvgText x={0} y={H - 2} fill={colors.faint} {...label}>
            {`D${gameDay(c, s, points[0].t)}`}
          </SvgText>
          {ending && marked >= 0 && marked < points.length - 1 && (
            <SvgText x={Math.max(x(marked), 34)} y={H - 2} fill={colors.faint} {...label}>
              {ENDING_NAME[ending.id]}
            </SvgText>
          )}
          <SvgText x={width} y={H - 2} fill={colors.accent} textAnchor="end" {...label} fontFamily={fonts.text600}>
            today
          </SvgText>
        </Svg>
      )}
    </View>
  )
}

function ContractsBoard({ game, go }: { game: Snapshot; go: (tab: TabId) => void }) {
  const { state: s, config: c, now } = game
  const items = s.after.contracts.items.filter((k) => k.opId || k.expiresAt > now)
  const under = items.filter((k) => k.opId).length
  return (
    <View style={styles.card}>
      <View style={[styles.top, styles.pad]}>
        <Text style={styles.caps}>Contracts · this week</Text>
        <Text style={styles.muted}>{items.length ? `${under} under way · ${items.length - under} open` : ''}</Text>
      </View>
      {items.length ? (
        items.map((k) => <ContractCard key={k.id} game={game} k={k} onOps={() => go('ops')} />)
      ) : (
        <Text style={[styles.muted, styles.pad, styles.padBottom]}>{`Nothing on the board. New contracts in ${fmtDuration(s.after.contracts.refreshAt - now, c)}.`}</Text>
      )}
    </View>
  )
}

// The crew a contract would take: the picked crew if it's the right size, else the idle crew with the lowest
// stats, since a contract is never rolled.
export function contractTeam(game: Snapshot, k: Contract, picked: CrewMember[]): CrewMember[] {
  if (picked.length === k.crew) return picked
  const idle = game.state.crew.filter((m) => m.status === 'idle')
  if (idle.length < k.crew) return []
  const sum = (m: CrewMember) => m.muscle + m.brains + m.nerve
  return [...idle].sort((a, b) => sum(a) - sum(b)).slice(0, k.crew)
}

// A contract: on Home with a way to Ops; on Ops with the crew that would go and Send.
export function ContractCard({ game, k, onOps, picked, onSent }: { game: Snapshot; k: Contract; onOps?: () => void; picked?: CrewMember[]; onSent?: () => void }) {
  const { state: s, config: c, now } = game
  const op = k.opId ? s.ops.find((o) => o.id === k.opId) : undefined
  const pays = `${glyph.clean}${fmt(k.pay)} · ${glyph.gold}${k.gold}`
  const terms = `${k.crew} crew · ${glyph.clean}${fmt(k.cost)} up front · ${fmtDuration(k.hours * c.time.hourMs, c)}`
  const who = op ? names(op.crewIds.map((id) => first(s.crew.find((m) => m.id === id)?.name ?? '?'))) : ''
  const done = op ? Math.min(1, (now - op.startedAt) / Math.max(1, op.completesAt - op.startedAt)) : 0
  const team = picked ? contractTeam(game, k, picked) : []
  const blocked = contractBlocked(s, c, k, now)
  const send = () => {
    if (
      !store.dispatch({
        type: 'START_CONTRACT',
        contractId: k.id,
        crewIds: team.map((m) => m.id),
      })
    )
      onSent?.()
  }
  return (
    <View style={styles.contract}>
      <View style={styles.top}>
        <Text style={styles.name}>{k.name}</Text>
        {op ? (
          <Text style={styles.muted}>{`done in ${fmtDuration(op.completesAt - now, c)}`}</Text>
        ) : (
          <Text style={styles.warn}>{`gone in ${fmtDuration(k.expiresAt - now, c)}`}</Text>
        )}
      </View>
      <Text style={styles.text}>{CONTRACT_TEXT[k.kind]}</Text>
      {op ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${done * 100}%` }]} />
          </View>
          <View style={styles.top}>
            <Text style={styles.muted}>{`Under way · ${who}`}</Text>
            <Text style={styles.bold}>{rich(pays, 13.5)}</Text>
          </View>
        </>
      ) : picked ? (
        <>
          <Text style={styles.bold}>{rich(`Pays ${pays}`, 14)}</Text>
          <Text style={styles.muted}>{rich(terms, 12)}</Text>
          <Btn
            kind="primary"
            title={team.length === k.crew ? `Send ${names(team.map((m) => first(m.name)))}` : `Needs ${k.crew} idle crew`}
            sub={blocked === 'Not enough Clean' ? `needs ${fmt(k.cost)} Clean` : `${fmt(k.cost)} Clean up front`}
            disabled={team.length !== k.crew || blocked !== null}
            onPress={send}
          />
        </>
      ) : (
        <View style={styles.top}>
          <View style={styles.grow}>
            <Text style={styles.bold}>{rich(`Pays ${pays}`, 14)}</Text>
            <Text style={styles.muted}>{rich(terms, 12)}</Text>
          </View>
          {onOps && <Btn small kind="outline" chevron title="Ops" onPress={onOps} />}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  pad: { paddingHorizontal: 14, paddingTop: 12 },
  padBottom: { paddingBottom: 14 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  grow: { flex: 1, gap: 3 },
  caps: {
    fontFamily: fonts.text600,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  muted: {
    fontFamily: fonts.text400,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
  },
  warn: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.warn },
  bold: { fontFamily: fonts.text600, fontSize: 13.5, color: colors.text },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  big: {
    flexShrink: 1,
    fontFamily: fonts.display800,
    fontSize: 34,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  change: { fontFamily: fonts.text600, fontSize: 12.5 },
  chart: { height: 76, marginTop: 8, marginBottom: 6 },
  flush: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  // The ledger's convention: a single brass rule above the total, a double rule below.
  total: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  doubleRule: {
    height: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  totalLabel: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  totalValue: {
    fontFamily: fonts.text600,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  contract: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  name: {
    flex: 1,
    fontFamily: fonts.text600,
    fontSize: 15,
    color: colors.text,
  },
  text: {
    fontFamily: fonts.text400,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  track: {
    height: 5,
    borderRadius: 1,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  fill: { height: 5, backgroundColor: colors.accent },
})

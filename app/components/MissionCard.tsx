import { StyleSheet, Text, View } from 'react-native'
import { missionBlocked, missionOp, missionOut, missionStake, outcomeOdds, STATS, type CrewMember, type MissionId } from '../../engine'
import { ACT_NAME, actProgress } from '../acts'
import { fmt, fmtDuration, pct } from '../format'
import { PEOPLE } from '../people'
import { MISSION_CARD } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Icon } from './Glyph'
import { Head } from './Portrait'
import { Btn, colors, glyph, rich, Title } from './ui'

// A boss mission on Ops (ADR 0050; design: Ops · Unfinished business). A rematch shows its stake and the
// odds for the team that would go; an overreach shows only what it costs and a line from the crew; one not
// open yet says what comes first. The team is the crew you picked, or the idle crew with the best odds.

const STAT_LONG = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const
const first = (name: string) => name.split(' ')[0]
const names = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

// The team that would go: the picked crew if it's the right size, else the idle crew with the best odds.
export function missionTeam(game: Snapshot, id: MissionId, picked: CrewMember[]): CrewMember[] {
  const { state: s, config: c } = game
  const op = missionOp(c, id)
  if (picked.length === op.crew) return picked
  const idle = s.crew.filter((m) => m.status === 'idle')
  if (idle.length < op.crew) return []
  const teams = op.crew === 1 ? idle.map((m) => [m]) : idle.flatMap((a, i) => idle.slice(i + 1).map((b) => [a, b]))
  const win = (team: CrewMember[]) => {
    const o = outcomeOdds(c, op, team)
    return o.full + o.partial
  }
  return teams.reduce((best, team) => (win(team) > win(best) ? team : best), teams[0])
}

export function MissionCard({ game, id, picked, onSent }: { game: Snapshot; id: MissionId; picked: CrewMember[]; onSent?: () => void }) {
  const { state: s, config: c, now } = game
  const m = c.missions.list[id]
  const card = MISSION_CARD[id]
  const boss = PEOPLE.find((p) => p.id === m.boss)!
  const blocked = missionBlocked(s, c, id, now)
  const overreach = m.kind === 'overreach'
  const record = s.missions[id]

  if (blocked === 'The rest of the act comes first') {
    const missing = actProgress(s, c).requirements.filter((r) => !r.done && r.label !== m.name)
    return (
      <View style={styles.locked}>
        <Icon name="lock" size={14} color={colors.faint} />
        <View style={styles.lockedText}>
          <Text style={styles.caps}>{`Overreach · the last step of Act ${ACT_NAME[m.act]}`}</Text>
          <Text style={styles.lockedName}>{m.name}</Text>
          <Text style={styles.hint}>{rich(`Opens once the rest is done: ${missing.map((r) => (r.value ? `${r.label} ${r.value}` : r.label)).join(' · ')}`, 12.5)}</Text>
        </View>
      </View>
    )
  }

  const team = missionTeam(game, id, picked)
  const op = missionOp(c, id)
  const odds = !overreach && team.length === op.crew ? outcomeOdds(c, op, team) : null
  const out = missionOut(s, id)
  const retry = record?.result === 'lost' && record.retryAt !== undefined && record.retryAt > now ? record.retryAt - now : 0
  const weights = STATS.filter((st) => m.w[st]).map((st) => `${STAT_LONG[st]} ${pct(m.w[st]!)}`)
  const stake = overreach ? missionStake(s, c, id) : 0
  const costs = overreach ? [stake ? `−${glyph.dirty}${fmt(stake)}` : '', m.injureHours ? `someone hurt ${m.injureHours}h` : '', m.heat ? `+${glyph.heat}${m.heat}` : ''].filter(Boolean) : []
  const send = () => {
    if (!store.dispatch({ type: 'START_MISSION', missionId: id, crewIds: team.map((x) => x.id) })) onSent?.()
  }
  return (
    <View style={[styles.card, overreach && styles.cardOverreach]}>
      <View style={styles.head}>
        <Head id={m.boss} size={44} />
        <View style={styles.headText}>
          <Text style={styles.caps}>{`${boss.name} · Act ${ACT_NAME[m.act]}`}</Text>
          <Title size={24} weight={800}>
            {m.name}
          </Title>
        </View>
        <Stamp text={overreach ? 'Overreach' : 'Rematch'} color={overreach ? colors.bad : colors.accent} />
      </View>
      <Text style={styles.meta}>{`${fmtDuration((m.minutes / 60) * c.time.hourMs, c)} · ${m.crew} crew · ${weights.join(' · ')}`}</Text>
      <Text style={styles.line}>
        {card.by ? <Text style={styles.by}>{`${card.by}: `}</Text> : null}
        {`“${card.line}”`}
      </Text>
      {overreach ? (
        <View style={styles.box}>
          <Text style={styles.caps}>What it can cost</Text>
          <Text style={styles.boxValue}>{rich(costs.join(' · ') || 'nothing much', 14)}</Text>
          <Text style={styles.hint}>It never costs Clean, a business or anyone for good.</Text>
        </View>
      ) : (
        <View style={styles.box}>
          <Text style={styles.caps}>At stake</Text>
          <Text style={styles.boxValue}>{card.stake ?? 'The arc'}</Text>
          <Text style={styles.hint}>{`Lose, and you can try again in ${c.missions.retryHours}h.`}</Text>
        </View>
      )}
      {odds && (
        <View style={styles.odds}>
          <View style={styles.oddsBar}>
            <View style={{ flex: odds.full, backgroundColor: colors.good }} />
            <View style={{ flex: odds.partial, backgroundColor: colors.accent }} />
            <View style={{ flex: odds.fail, backgroundColor: '#9a3a2c' }} />
          </View>
          <View style={styles.oddsLabels}>
            <Text style={styles.hint}>{`clean ${pct(odds.full)}`}</Text>
            <Text style={styles.hint}>{`partial ${pct(odds.partial)}`}</Text>
            <Text style={styles.hint}>{`fail ${pct(odds.fail)}`}</Text>
          </View>
        </View>
      )}
      {out ? (
        <Text style={styles.outLine}>Out now: it comes back with the crew.</Text>
      ) : retry > 0 ? (
        <Btn title={`Try again in ${fmtDuration(retry, c)}`} disabled onPress={() => undefined} />
      ) : (
        <Btn
          kind={overreach ? 'normal' : 'primary'}
          title={team.length === op.crew ? `${overreach ? 'Send anyway: ' : 'Send '}${names(team.map((x) => first(x.name)))}` : `Needs ${op.crew} idle crew`}
          disabled={team.length !== op.crew || blocked !== null}
          onPress={send}
        />
      )}
    </View>
  )
}

// A rubber stamp: OVERREACH in red ink, REMATCH in brass, FAILED, WON.
export function Stamp({ text, color, big }: { text: string; color: string; big?: boolean }) {
  return (
    <View style={[styles.stamp, { borderColor: color }, big && styles.stampBig]}>
      <View style={[styles.stampInner, { borderColor: color }]}>
        <Text style={[styles.stampText, { color }, big && styles.stampTextBig]}>{text.toUpperCase()}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: '#4a3c24' },
  cardOverreach: { borderColor: '#5a2a22' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, gap: 2 },
  caps: { fontFamily: fonts.text400, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.muted },
  meta: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  line: { fontFamily: fonts.text400, fontSize: 13.5, lineHeight: 19, color: colors.text },
  by: { fontFamily: fonts.text600, color: colors.muted },
  box: { gap: 3, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 4, backgroundColor: colors.cardAlt },
  boxValue: { fontFamily: fonts.text600, fontSize: 14.5, color: colors.text },
  hint: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  odds: { gap: 6 },
  oddsBar: { flexDirection: 'row', height: 8, borderRadius: 1, overflow: 'hidden' },
  oddsLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  outLine: { fontFamily: fonts.text500, fontSize: 13, color: colors.accent },
  locked: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.control },
  lockedText: { flex: 1, gap: 3 },
  lockedName: { fontFamily: fonts.text600, fontSize: 15, color: colors.muted },
  stamp: { padding: 2, borderWidth: 2, borderRadius: 3, transform: [{ rotate: '-6deg' }] },
  stampBig: { padding: 3, borderWidth: 3 },
  stampInner: { paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, borderRadius: 2 },
  stampText: { fontFamily: fonts.display800, fontSize: 13, letterSpacing: 2 },
  stampTextBig: { fontSize: 30, letterSpacing: 4 },
})

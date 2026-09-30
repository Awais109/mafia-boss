import { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { type EventType, type GameEvent } from '../../engine'
import { Icon, type IconName } from '../components/Glyph'
import { colors, List, PageHead, rich, Screen, Section } from '../components/ui'
import { describeEvent } from '../eventText'
import { fmtClock } from '../format'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Log (design: Log): the in-save event log, newest first, grouped by game day, with a filter per kind of
// event and a switch for the bookkeeping lines Home hides.

type Kind = 'decisions' | 'jobs' | 'heat' | 'turf' | 'money'
type Filter = 'all' | Kind

const FILTERS: { key: Filter; title: string; icon?: IconName }[] = [
  { key: 'all', title: 'All' },
  { key: 'decisions', title: 'Decisions', icon: 'fork' },
  { key: 'jobs', title: 'Crew & jobs', icon: 'crew' },
  { key: 'heat', title: 'Heat', icon: 'warning' },
  { key: 'turf', title: 'Turf', icon: 'flag' },
  { key: 'money', title: 'Money', icon: 'cash' },
]

const KIND_LOOK: Record<Kind, { icon: IconName; color: string; tint: string }> = {
  decisions: { icon: 'fork', color: colors.accent, tint: '#2d2418' },
  jobs: { icon: 'crew', color: colors.rep, tint: '#261f2e' },
  heat: { icon: 'warning', color: colors.bad, tint: '#2a1712' },
  turf: { icon: 'flag', color: colors.influence, tint: '#172230' },
  money: { icon: 'cash', color: colors.dirty, tint: '#2d2418' },
}

const GROUPS: Record<Kind, readonly EventType[]> = {
  decisions: ['REPORT_FILED', 'INCIDENT_RAISED', 'INBOX_RESOLVED', 'CONTEST_RESOLVED'],
  jobs: ['OP_STARTED', 'OP_RESOLVED', 'OFFERS_REFRESHED', 'TRAINING_DONE', 'CREW_STAT_UP', 'CREW_RANK_UP', 'PERK_CHOSEN', 'OP_RUSHED','RECRUITED', 'FIRED', 'RAISED', 'CREW_SLOT_BOUGHT', 'POOL_REFRESHED', 'ENFORCER_ASSIGNED', 'ENFORCER_REMOVED', 'WALKOUT', 'RELEASED', 'ARREST', 'WAGES_PAID', 'WAGES_MISSED', 'CREW_INJURED', 'CREW_RECOVERED'],
  heat: ['INSPECTION_STARTED', 'INSPECTION_ENDED', 'RAID', 'ARREST', 'BRIBED', 'BRIBE_EXPIRED', 'OFFICIAL_BOUGHT', 'FRONT_FROZEN', 'FRONT_THAWED', 'CAMPAIGNED', 'ELECTION_HELD'],
  turf: ['TOLYA_TICK', 'TRIBUTE_PAID', 'TRIBUTE_HAGGLED', 'SHIPMENT_BOUGHT', 'SURPLUS_SOLD', 'TRIBUTE_REFUSED', 'DISTRICT_BOUGHT', 'DISTRICT_PRESSURED', 'DISTRICT_FLIPPED', 'NOTE', 'PASSAGE_BOUGHT', 'ENDING_REACHED'],
  money: ['COLLECTED', 'DEPOSITED', 'FRONT_MODE_SET', 'UPKEEP_PAID', 'UPKEEP_MISSED', 'STOCK_OUT', 'STOCK_CAPPED', 'SHORTAGE_STARTED', 'SHORTAGE_ENDED', 'GOLD_GRANTED', 'TIME_SKIPPED', 'GOAL_DONE', 'RACKET_BOUGHT', 'RACKET_UPGRADED', 'RACKET_REPAIRED', 'FRONT_BOUGHT', 'FRONT_UPGRADED', 'VAULT_CAPPED', 'OFFLINE_CAPPED', 'RACKET_CLOSED', 'RACKET_REOPENED', 'LOAN_TAKEN', 'LOAN_PAYMENT', 'LOAN_MISSED', 'LOAN_REPAID', 'LENT', 'LENDING_REPAID', 'LENDING_DEFAULTED', 'LEGALIZED'],
}

const kindOf = (type: EventType): Kind | null => (Object.keys(GROUPS) as Kind[]).find((k) => GROUPS[k].includes(type)) ?? null

export function LogScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const [filter, setFilter] = useState<Filter>('all')
  const [showQuiet, setShowQuiet] = useState(false)

  const all = s.log
    .slice()
    .reverse()
    .filter((e) => filter === 'all' || GROUPS[filter].includes(e.type))
    .map((e) => ({ e, line: describeEvent(e, s, c) }))
  const hidden = all.filter(({ line }) => line.quiet).length
  const lines = all.filter(({ line }) => showQuiet || !line.quiet)
  const dayOf = (t: number) => fmtClock(t, s.createdAt, c).split(' · ')[0]
  const today = dayOf(now)
  const days: { day: string; rows: typeof lines }[] = []
  for (const row of lines) {
    const day = dayOf(row.e.t)
    if (days[days.length - 1]?.day !== day) days.push({ day, rows: [] })
    days[days.length - 1].rows.push(row)
  }

  return (
    <Screen>
      <PageHead title="Log" note="Everything that happened · newest first" />

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const on = filter === f.key
          const color = f.key === 'all' ? colors.text : KIND_LOOK[f.key].color
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.filter, on && styles.filterOn]}>
              {f.icon && <Icon name={f.icon} size={15} color={color} />}
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.title}</Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.quiet}>
        <View style={styles.quietText}>
          <Text style={styles.quietTitle}>Show bookkeeping</Text>
          <Text style={styles.small}>{`Wages, upkeep and every wash · ${hidden ? `${hidden} line${hidden === 1 ? '' : 's'} ${showQuiet ? 'shown' : 'hidden'}` : 'none yet'}`}</Text>
        </View>
        <Switch
          value={showQuiet}
          onValueChange={setShowQuiet}
          trackColor={{ false: colors.control, true: colors.rule }}
          thumbColor={showQuiet ? colors.accent : colors.muted}
          accessibilityLabel="Show bookkeeping"
        />
      </View>

      {days.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name={filter === 'all' ? 'log' : KIND_LOOK[filter].icon} size={18} color={colors.muted} />
          </View>
          <Text style={styles.emptyText}>Nothing here.</Text>
        </View>
      ) : (
        days.map(({ day, rows }) => (
          <Section key={day} title={day === today ? `${day} · today` : day} right={`${rows.length} event${rows.length === 1 ? '' : 's'}`}>
            <List>
              {rows.map(({ e, line }, i) => (
                <LogRow key={`${e.t}-${i}`} e={e} text={line.text} color={line.color} time={fmtClock(e.t, s.createdAt, c).split(' · ')[1]} />
              ))}
            </List>
          </Section>
        ))
      )}

      <Text style={styles.small}>{`The latest ${s.log.length} events. The full log exports from Debug.`}</Text>
    </Screen>
  )
}

function LogRow({ e, text, color, time }: { e: GameEvent; text: string; color?: string; time: string }) {
  const kind = kindOf(e.type)
  const look = kind ? KIND_LOOK[kind] : null
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{time}</Text>
      <View style={[styles.kind, look && { backgroundColor: look.tint }]}>{look && <Icon name={look.icon} size={13} color={look.color} />}</View>
      <Text style={[styles.text, color ? { color } : null]}>{rich(text, 13.5)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { flexBasis: '31%', flexGrow: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.control, borderRadius: 4, backgroundColor: colors.card },
  filterOn: { borderColor: colors.rule, backgroundColor: '#3a3124' },
  filterText: { fontFamily: fonts.text500, fontSize: 13.5, color: colors.muted },
  filterTextOn: { fontFamily: fonts.text600, color: colors.text },
  quiet: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: -14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, borderRadius: 6 },
  quietText: { flex: 1, gap: 2 },
  quietTitle: { fontFamily: fonts.text500, fontSize: 14, color: colors.text },
  small: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  time: { width: 40, paddingTop: 2, fontFamily: fonts.text400, fontSize: 12.5, color: colors.faint, fontVariant: ['tabular-nums'] },
  kind: { width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontFamily: fonts.text400, fontSize: 13.5, lineHeight: 19, color: colors.text },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 80 },
  emptyIcon: { width: 44, height: 44, borderRadius: 4, borderWidth: 1, borderColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.text400, fontSize: 15, color: colors.muted },
})

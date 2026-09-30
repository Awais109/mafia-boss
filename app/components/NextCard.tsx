import { Pressable, StyleSheet, Text, View } from 'react-native'
import { gameDay, missionBlocked, missionDone, missionOut, TUTORIAL_STEPS, type Act } from '../../engine'
import { ACT_NAME, ACT_OPENS, actMilestones, actProgress } from '../acts'
import type { TabId } from '../screens/types'
import { PEOPLE } from '../people'
import { ACT_ARC, ACT_TITLE } from '../story'
import type { Snapshot } from '../store'
import { fonts } from '../theme'
import { AfterStory } from './AfterStory'
import { Icon } from './Glyph'
import { Head as Face } from './Portrait'
import { openingCopy } from './TutorialBanner'
import { Check, colors, Item, List, Section, Tag, Title } from './ui'

const TAB_TITLE: Partial<Record<TabId, string>> = { rackets: 'Business', fronts: 'Fronts', crew: 'Crew', home: 'Home', ops: 'Ops' }

// Home's Next (design: Home · Next): the act the next gate opens, what it opens, each condition with a
// tick, a bar toward it and the milestones so far. During the opening, its thirteen steps instead; after the
// story, After the story (AfterStory.tsx).
export function NextCard({ game, go }: { game: Snapshot; go: (tab: TabId) => void }) {
  const { state: s, config: c } = game
  const progress = actProgress(s, c)
  const day = (t: number) => `Day ${gameDay(c, s, t)}`
  const milestones = [{ label: 'Act I reached', t: s.createdAt }, ...actMilestones(s, c)]
  const footer = (
    <View style={styles.footer}>
      {!progress.cleared && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(1, progress.max > 0 ? progress.value / progress.max : 0) * 100}%` }]} />
        </View>
      )}
      <View style={styles.milestones}>
        <Text style={styles.small}>Milestones</Text>
        <View style={styles.milestoneList}>
          {milestones.map((m) => (
            <Text key={m.label} style={styles.small}>{`${m.label} · ${day(m.t)}`}</Text>
          ))}
        </View>
      </View>
    </View>
  )

  if (!s.tutorial.done && s.act === 1) {
    const copy = openingCopy(c)
    const at = s.tutorial.step
    return (
      <Section title="Next" right={`${TUTORIAL_STEPS.length} steps · step ${Math.min(at + 1, TUTORIAL_STEPS.length)}`}>
        <List style={styles.list}>
          <Head title="The opening" text="You do what Lyosha did in 1974, from scratch: a kiosk, a stall, the factory line, a way to make the money clean, two people you trust." />
          {TUTORIAL_STEPS.map((step, i) => {
            const text = copy[step.id]
            const now = i === at
            return (
              <View key={step.id} style={now && styles.nowRow}>
                <Item
                  left={
                    <View style={styles.stepLeft}>
                      <Check state={i < at ? 'done' : now ? 'now' : 'todo'} />
                      <Text style={styles.stepNo}>{i + 1}</Text>
                    </View>
                  }
                  label={text.title.replace(/^\d+ · /, '')}
                  hint={now && text.tab ? `at ${TAB_TITLE[text.tab] ?? text.tab}` : undefined}
                  muted={i < at}
                  value={now ? <Tag text="now" color={colors.accent} /> : undefined}
                  onPress={now && text.tab ? () => go(text.tab!) : undefined}
                />
              </View>
            )
          })}
          {footer}
        </List>
      </Section>
    )
  }

  // After the story (ADR 0052): the empire value and the contracts board.
  if (progress.cleared) return <AfterStory game={game} go={go} />

  if (progress.nextAct === null) {
    const last = s.act as Act
    return (
      <Section title="Next">
        <List style={styles.list}>
          <Head title={`Act ${ACT_NAME[last]} · ${ACT_TITLE[last]}`} text="The last act. Either ending clears it." />
          {progress.requirements.map((r) => (
            <Item key={r.label} left={<Check state={r.done ? 'done' : 'todo'} />} label={r.label} hint={r.hint} value={r.value} muted={r.done} />
          ))}
          {footer}
        </List>
      </Section>
    )
  }

  const next = progress.nextAct
  const met = progress.requirements.filter((r) => r.done).length
  // The boss's arc (design: Home · Act V) stands in for its missions' rows and the payoff's.
  const arc = c.missions.enabled ? ACT_ARC[s.act] : undefined
  const inArc = new Set(arc ? [...[arc.payoff.mission, arc.overreach].map((id) => (id ? c.missions.list[id].name : '')), arc.payoff.requirement ?? ''] : [])
  const goalsOnly = progress.requirements.length === 1 && progress.segments
  const note = goalsOnly ? `${s.goals.done.length} of ${c.goals.list.length}` : `${met} of ${progress.requirements.length}`
  return (
    <Section title="Next" right={note}>
      <List style={styles.list}>
        <Head title={`Act ${ACT_NAME[next]} · ${ACT_TITLE[next]}`} text={`Opens ${ACT_OPENS[next]}.`} />
        {progress.requirements
          .filter((r) => !inArc.has(r.label))
          .map((r) => (
            <Item key={r.label} left={<Check state={r.done ? 'done' : 'todo'} />} label={r.label} hint={r.hint} value={r.value} muted={r.done} />
          ))}
        {arc && <ArcStrip game={game} go={go} />}
        {footer}
      </List>
    </Section>
  )
}

// The act's boss, the payoff that settles their arc and the overreach that ends the act, as chips; tap for Ops.
function ArcStrip({ game, go }: { game: Snapshot; go: (tab: TabId) => void }) {
  const { state: s, config: c, now } = game
  const arc = ACT_ARC[s.act]!
  const boss = PEOPLE.find((p) => p.id === arc.boss)
  const pay = arc.payoff
  const paid = pay.mission ? missionDone(s, pay.mission) : (pay.done?.(s) ?? false)
  const payNote = paid ? (pay.mission ? 'won' : 'done') : pay.mission && missionOut(s, pay.mission) ? 'out' : pay.mission && s.missions[pay.mission]?.result === 'lost' ? 'lost' : 'not yet'
  const over = arc.overreach
  const overName = c.missions.list[over].name
  const overState = missionDone(s, over) ? 'done' : missionOut(s, over) ? 'out' : missionBlocked(s, c, over, now) === 'The rest of the act comes first' ? 'locked' : 'ready'
  return (
    <Pressable onPress={() => go('ops')} accessibilityRole="button" accessibilityLabel={`${boss?.name}'s arc: ${pay.name} ${payNote}; ${overName} ${overState}`} style={styles.arc}>
      <Face id={arc.boss} size={40} />
      <View style={styles.arcBody}>
        <Text style={styles.arcHead}>{`${boss?.name ?? ''} · the arc`.toUpperCase()}</Text>
        <ArcChip text={`${pay.name} · ${payNote}`} state={paid ? 'done' : 'open'} />
        <ArcChip text={overState === 'locked' ? overName : `${overName} · ${overState === 'done' ? 'sent' : overState}`} state={overState === 'out' ? 'open' : overState} />
      </View>
      <Icon name="chevronRight" size={16} color={colors.muted} strokeWidth={2} />
    </Pressable>
  )
}

function ArcChip({ text, state }: { text: string; state: 'open' | 'done' | 'ready' | 'locked' }) {
  return (
    <View style={[styles.chip, state === 'locked' && styles.chipLocked, state === 'ready' && styles.chipReady]}>
      {state === 'locked' ? (
        <Icon name="lock" size={11} color={colors.faint} />
      ) : state === 'done' ? (
        <Icon name="check" size={11} color={colors.good} strokeWidth={2.4} />
      ) : (
        <View style={[styles.ring, state === 'ready' && { borderColor: colors.accent }]} />
      )}
      <Text style={[styles.chipText, state === 'locked' && styles.chipTextLocked, state === 'done' && styles.chipTextDone]}>{text}</Text>
    </View>
  )
}

function Head({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.head}>
      <Title size={22} weight={700}>
        {title}
      </Title>
      <Text style={styles.headText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingVertical: 0 },
  head: { gap: 6, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14 },
  headText: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 19, color: colors.muted },
  footer: { gap: 8, paddingTop: 12, paddingBottom: 14, paddingHorizontal: 14 },
  track: { height: 6, borderRadius: 1, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.accent },
  milestones: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  milestoneList: { alignItems: 'flex-end', gap: 2 },
  small: { fontFamily: fonts.text400, fontSize: 12, color: colors.faint },
  stepLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNo: { width: 16, textAlign: 'right', fontFamily: fonts.text400, fontSize: 13, color: colors.faint, fontVariant: ['tabular-nums'] },
  nowRow: { backgroundColor: '#221c12' },
  arc: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  arcBody: { flex: 1, alignItems: 'flex-start', gap: 6 },
  arcHead: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.3, color: colors.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3, borderWidth: 1, borderColor: colors.control, backgroundColor: colors.cardAlt },
  chipReady: { borderColor: colors.accent },
  chipLocked: { borderStyle: 'dashed', borderColor: colors.border, backgroundColor: 'transparent' },
  ring: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.2, borderColor: colors.text },
  chipText: { fontFamily: fonts.text600, fontSize: 12.5, color: colors.text },
  chipTextLocked: { fontFamily: fonts.text400, color: colors.faint },
  chipTextDone: { color: colors.muted },
})

import { StyleSheet, Text, View } from 'react-native'
import { gameDay, TUTORIAL_STEPS, type Act } from '../../engine'
import { ACT_NAME, ACT_OPENS, actMilestones, actProgress } from '../acts'
import type { TabId } from '../screens/types'
import { ACT_TITLE } from '../story'
import type { Snapshot } from '../store'
import { fonts } from '../theme'
import { AfterStory } from './AfterStory'
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
  const goalsOnly = progress.requirements.length === 1 && progress.segments
  const note = goalsOnly ? `${s.goals.done.length} of ${c.goals.list.length}` : `${met} of ${progress.requirements.length}`
  return (
    <Section title="Next" right={note}>
      <List style={styles.list}>
        <Head title={`Act ${ACT_NAME[next]} · ${ACT_TITLE[next]}`} text={`Opens ${ACT_OPENS[next]}.`} />
        {progress.requirements.map((r) => (
          <Item key={r.label} left={<Check state={r.done ? 'done' : 'todo'} />} label={r.label} hint={r.hint} value={r.value} muted={r.done} />
        ))}
        {footer}
      </List>
    </Section>
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
})

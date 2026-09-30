import { Fragment } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { canAffordEffects, type InboxItem } from '../../engine'
import { fmtDuration } from '../format'
import { effectsText, itemBody, itemTitle } from '../inbox'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Card, colors, rich } from './ui'

// One pending decision (design: Home · Waiting for you). Every option shows exactly what it does; the
// default is marked, because it's what happens if the player doesn't answer in time.
export function InboxCard({ item, game }: { item: InboxItem; game: Snapshot }) {
  const { state: s, config: c, now } = game
  const left = item.expiresAt - now
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{itemTitle(item, c)}</Text>
          <Text style={[styles.left, left < c.time.hourMs && { color: colors.bad }]}>{`${fmtDuration(left, c)} left`}</Text>
        </View>
        <Text style={styles.body}>{rich(itemBody(item, s, c), 13)}</Text>
      </View>
      <View style={styles.options}>
        {item.options.map((o) => (
          <Choice
            key={o.id}
            name={o.name}
            effects={effectsText(o.effects, c, game)}
            isDefault={o.id === item.defaultOptionId}
            disabled={!canAffordEffects(s, o.effects)}
            onPress={() => store.dispatch({ type: 'RESOLVE_INBOX', itemId: item.id, optionId: o.id })}
          />
        ))}
      </View>
    </Card>
  )
}

// Past this, the effects go under the name instead of beside it (a contest, a perk's sentence).
const BESIDE_MAX = 26

// A decision's option: its name (and DEFAULT on the one that happens if time runs out), and its effects,
// each figure in its resource's colour with a faint dot between them.
export function Choice({ name, effects, isDefault, disabled, onPress }: {
  name: string
  effects: string
  isDefault?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const stacked = effects.length > BESIDE_MAX
  const parts = effects ? effects.split(' · ') : []
  const effectLine = (
    <Text style={[styles.effects, stacked && styles.effectsStacked]}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <Text style={styles.sep}>{'  ·  '}</Text>}
          {rich(p, 13)}
        </Fragment>
      ))}
    </Text>
  )
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.choice, isDefault && styles.choiceDefault, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <View style={styles.choiceMain}>
        <View style={styles.nameLine}>
          <Text style={styles.name}>{rich(name, 14)}</Text>
          {isDefault && (
            <View style={styles.defaultTag}>
              <Text style={styles.defaultText}>default</Text>
            </View>
          )}
        </View>
        {!stacked && parts.length > 0 && effectLine}
      </View>
      {stacked && effectLine}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { gap: 5 },
  titleLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  title: { flexShrink: 1, fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  left: { fontFamily: fonts.text400, fontSize: 12, color: colors.warn },
  body: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 19, color: colors.muted },
  options: { gap: 8 },
  choice: { minHeight: 46, justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.control, borderRadius: 4, backgroundColor: colors.cardAlt },
  choiceDefault: { borderColor: colors.rule },
  choiceMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  name: { flexShrink: 1, fontFamily: fonts.text500, fontSize: 14, color: colors.text },
  defaultTag: { borderWidth: 1, borderColor: colors.rule, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  defaultText: { fontFamily: fonts.text600, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.accent },
  effects: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted, textAlign: 'right', flexShrink: 1 },
  effectsStacked: { textAlign: 'left', fontSize: 12.5, lineHeight: 18 },
  sep: { color: '#5d5446' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
})

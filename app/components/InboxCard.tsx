import { View } from 'react-native'
import { canAffordEffects, type InboxItem } from '../../engine'
import { effectsText, itemBody, itemTitle } from '../inbox'
import { fmtDuration } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, Card, colors, T } from './ui'

// One pending decision. Every option shows exactly what it does; the default is marked,
// because it's what happens if the player doesn't answer in time.
export function InboxCard({ item, game }: { item: InboxItem; game: Snapshot }) {
  const { state: s, config: c, now } = game
  const accent = item.kind === 'incident' ? colors.warn : item.kind === 'perk' ? colors.rep : colors.accent
  return (
    <Card style={{ borderColor: accent }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T bold color={accent} style={{ flexShrink: 1 }}>
          {itemTitle(item, c)}
        </T>
        <T small muted>{`${fmtDuration(item.expiresAt - now, c)} left`}</T>
      </View>
      <T small muted>
        {itemBody(item, s, c)}
      </T>
      <View style={{ gap: 6 }}>
        {item.options.map((o) => {
          const effects = effectsText(o.effects)
          const affordable = canAffordEffects(s, o.effects)
          return (
            <Btn
              key={o.id}
              small
              kind={o.id === item.defaultOptionId ? 'normal' : 'primary'}
              title={`${o.name}${effects ? `  (${effects})` : ''}${o.id === item.defaultOptionId ? '  · default' : ''}`}
              disabled={!affordable}
              onPress={() => store.dispatch({ type: 'RESOLVE_INBOX', itemId: item.id, optionId: o.id })}
            />
          )
        })}
      </View>
    </Card>
  )
}

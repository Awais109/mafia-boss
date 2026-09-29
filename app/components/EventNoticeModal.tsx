import { View } from 'react-native'
import { canAffordEffects, DISTRICT_IDS, type LaterAct } from '../../engine'
import { ACT_NAME, ACT_OPENS } from '../acts'
import { ACT_TITLE, ACT_TURN, DISTRICT_STORY, revealedBy } from '../story'
import { describeEvent } from '../eventText'
import { fmtDuration } from '../format'
import { effectsText, itemBody, itemTitle } from '../inbox'
import { unlockInfo, type QueuedNotice } from '../notices'
import { store, type Snapshot } from '../store'
import { ModalPanel } from './Modal'
import { Btn, colors, T } from './ui'

// The head of the live-notice queue (ADR 0038): a freshly filed decision, rendered exactly like
// Home's InboxCard, or a one-off "this happened" line for a notable event with nothing to decide.
// "Decide later" leaves a decision item untouched in `state.inbox` — Home's own list is always
// the fallback for anything not answered here.
export function EventNoticeModal({ notice, game }: { notice: QueuedNotice; game: Snapshot }) {
  const { state: s, config: c, now } = game

  if (notice.kind === 'inbox') {
    const item = notice.item
    const accent = item.kind === 'incident' ? colors.warn : item.kind === 'perk' ? colors.rep : colors.accent
    return (
      <ModalPanel onRequestClose={store.dismissNotice}>
        <T bold color={accent} style={{ fontSize: 17 }}>
          {itemTitle(item, c)}
        </T>
        <T small muted>{`${fmtDuration(item.expiresAt - now, c)} to decide`}</T>
        <T small muted>{itemBody(item, s, c)}</T>
        <View style={{ gap: 6, marginTop: 4 }}>
          {item.options.map((o) => {
            const effects = effectsText(o.effects, c, game)
            const affordable = canAffordEffects(s, o.effects)
            return (
              <Btn
                key={o.id}
                small
                kind={o.id === item.defaultOptionId ? 'normal' : 'primary'}
                title={`${o.name}${effects ? `  (${effects})` : ''}${o.id === item.defaultOptionId ? '  · default' : ''}`}
                disabled={!affordable}
                onPress={() => {
                  store.dispatch({ type: 'RESOLVE_INBOX', itemId: item.id, optionId: o.id })
                  store.dismissNotice()
                }}
              />
            )
          })}
        </View>
        <Btn kind="ghost" title="Decide later" onPress={store.dismissNotice} />
      </ModalPanel>
    )
  }

  if (notice.kind === 'unlock' || notice.kind === 'unlockBatch') {
    const items = notice.kind === 'unlock' ? [notice] : notice.items
    return (
      <ModalPanel onRequestClose={store.dismissNotice}>
        <T bold color={colors.rep} style={{ fontSize: 17 }}>
          {items.length === 1 ? 'Just unlocked' : `${items.length} things just unlocked`}
        </T>
        <View style={{ gap: 10, marginTop: 4 }}>
          {items.map((ref, i) => {
            const info = unlockInfo(c, ref)
            return (
              <View key={i}>
                <T bold>{info.name}</T>
                <T small muted>{info.description}</T>
                <T small color={colors.accent}>{info.stats}</T>
              </View>
            )
          })}
        </View>
        <Btn kind="primary" title="Got it" onPress={store.dismissNotice} />
      </ModalPanel>
    )
  }

  // An act opening is a page of Lyosha's notebook inking in (ADR 0046): the turn that brought you here, the
  // district someone has just shown you, and what the act opens.
  if (notice.event.type === 'ACT_UNLOCKED') {
    const a = notice.event.act
    const ids = revealedBy(c, a, DISTRICT_IDS)
    return (
      <ModalPanel onRequestClose={store.dismissNotice}>
        <T small color={colors.faint}>{`ACT ${ACT_NAME[a]}`}</T>
        <T bold color={colors.rep} style={{ fontSize: 19 }}>
          {ACT_TITLE[a]}
        </T>
        <T style={{ fontStyle: 'italic' }}>{ACT_TURN[a as LaterAct]}</T>
        {ids.map((id) => (
          <View key={id} style={{ gap: 2, marginTop: 6 }}>
            <T bold color={colors.accent}>{`New on the map: ${c.districts.list[id].name}`}</T>
            <T small style={{ fontStyle: 'italic' }}>{DISTRICT_STORY[id].reveal}</T>
          </View>
        ))}
        <T small muted>{`Opens ${ACT_OPENS[a]}.`}</T>
        <Btn kind="primary" title="Turn the page" onPress={store.dismissNotice} />
      </ModalPanel>
    )
  }

  const line = describeEvent(notice.event, s, c)
  return (
    <ModalPanel onRequestClose={store.dismissNotice}>
      <T style={{ fontSize: 16 }} color={line.color}>
        {line.text}
      </T>
      <Btn kind="primary" title="Got it" onPress={store.dismissNotice} />
    </ModalPanel>
  )
}

import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { canAffordEffects, type GameEvent } from '../../engine'
import { ACT_NAME } from '../acts'
import { describeEvent } from '../eventText'
import { fmtDuration } from '../format'
import { effectsText, itemBody, itemTitle } from '../inbox'
import { unlockInfo, type QueuedNotice } from '../notices'
import { ACT_TITLE } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { ChapterPage } from './ChapterPage'
import { Glyph, Icon, type IconName, type Resource } from './Glyph'
import { Choice } from './InboxCard'
import { ModalPanel, NoticeHead } from './Modal'
import { Btn, colors, rich, Title } from './ui'

// The head of the live-notice queue (ADR 0038; design: Notice · decision, just unlocked, event). A freshly
// filed decision with its options ("Decide later" leaves it on Home); what just unlocked, each with its
// figures; a notable event with an icon and, where it helps, what happens next. An act opening is a whole
// chapter page (`ChapterPage`).

type Look = { label: string; icon: IconName | Resource; color: string }

const EVENT_LOOK: Partial<Record<GameEvent['type'], Look>> = {
  RAID: { label: 'Raid', icon: 'heat', color: colors.bad },
  ARREST: { label: 'Arrest', icon: 'blocked', color: colors.bad },
  WALKOUT: { label: 'Walkout', icon: 'walkout', color: colors.bad },
  WAGES_MISSED: { label: 'Payday', icon: 'dirty', color: colors.bad },
  UPKEEP_MISSED: { label: 'Upkeep', icon: 'dirty', color: colors.warn },
  DISTRICT_FLIPPED: { label: 'Turf', icon: 'flag', color: colors.influence },
  GOAL_DONE: { label: 'Act I goal', icon: 'check', color: colors.good },
  ACT_CLEARED: { label: 'Act cleared', icon: 'ending', color: colors.good },
  TOLYA_TICK: { label: 'Tolya', icon: 'flag', color: colors.warn },
  CREW_INJURED: { label: 'Hurt', icon: 'crew', color: colors.warn },
  LOAN_MISSED: { label: 'The lender', icon: 'clean', color: colors.bad },
  LENDING_DEFAULTED: { label: 'The loan desk', icon: 'dirty', color: colors.warn },
  FRONT_FROZEN: { label: 'The Ministry', icon: 'frozen', color: colors.bad },
  ELECTION_HELD: { label: 'Election', icon: 'election', color: colors.accent },
  ENDING_REACHED: { label: 'Ending', icon: 'ending', color: colors.good },
}

const UNLOCK_ICON: Record<string, IconName> = { district: 'map', front: 'fronts', joint: 'business', racket: 'business', premises: 'business', official: 'crew' }

const RESOURCES: readonly string[] = ['dirty', 'clean', 'influence', 'rep', 'heat', 'packs', 'premium', 'gold']

function Badge({ icon, color }: { icon: IconName | Resource; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color + '66', backgroundColor: color + '1c' }]}>
      {RESOURCES.includes(icon) ? <Glyph kind={icon as Resource} size={16} /> : <Icon name={icon as IconName} size={18} color={color} />}
    </View>
  )
}

export function EventNoticeModal({ notice, game }: { notice: QueuedNotice; game: Snapshot }) {
  const { state: s, derived: d, config: c, now } = game
  const count = game.notices.length > 1 ? `1 of ${game.notices.length}` : undefined

  if (notice.kind === 'inbox') {
    const item = notice.item
    return (
      <ModalPanel onRequestClose={store.dismissNotice}>
        <NoticeHead label={item.kind === 'perk' ? 'Promotion' : item.kind === 'report' ? 'The crew reports' : 'Decision'} count={count} />
        <Title size={26} weight={800}>
          {itemTitle(item, c)}
        </Title>
        <Text style={styles.when}>{`${fmtDuration(item.expiresAt - now, c)} to decide`}</Text>
        <Text style={styles.body}>{rich(itemBody(item, s, c), 14)}</Text>
        <View style={styles.options}>
          {item.options.map((o) => (
            <Choice
              key={o.id}
              name={o.name}
              effects={effectsText(o.effects, c, game)}
              isDefault={o.id === item.defaultOptionId}
              disabled={!canAffordEffects(s, o.effects)}
              onPress={() => {
                store.dispatch({ type: 'RESOLVE_INBOX', itemId: item.id, optionId: o.id })
                store.dismissNotice()
              }}
            />
          ))}
        </View>
        <Btn kind="ghost" title="Decide later" onPress={store.dismissNotice} />
      </ModalPanel>
    )
  }

  if (notice.kind === 'unlock' || notice.kind === 'unlockBatch') {
    const items = notice.kind === 'unlock' ? [notice] : notice.items
    return (
      <ModalPanel onRequestClose={store.dismissNotice}>
        <NoticeHead label={`Act ${ACT_NAME[s.act]} · ${ACT_TITLE[s.act]}`} count={`${items.length} new`} />
        <Title size={26} weight={800}>
          Just unlocked
        </Title>
        <ScrollView style={styles.unlocks}>
          {items.map((ref, i) => {
            const info = unlockInfo(c, d, ref)
            return (
              <View key={i} style={[styles.unlock, i > 0 && styles.rule]}>
                <Badge icon={UNLOCK_ICON[info.kind] ?? 'business'} color={colors.accent} />
                <View style={styles.unlockText}>
                  <Text style={styles.unlockName}>
                    {info.name}
                    <Text style={styles.unlockKind}>{`  ${info.kind}`}</Text>
                  </Text>
                  <Text style={styles.unlockDesc}>{info.description}</Text>
                  <Text style={styles.unlockStats}>{rich(info.stats, 12.5)}</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
        <Btn kind="primary" title="Got it" onPress={store.dismissNotice} />
      </ModalPanel>
    )
  }

  if (notice.event.type === 'ACT_UNLOCKED') return <ChapterPage game={game} act={notice.event.act} onTurn={store.dismissNotice} />

  const e = notice.event
  const line = describeEvent(e, s, c)
  const look = EVENT_LOOK[e.type] ?? { label: 'News', icon: 'log' as IconName, color: colors.accent }
  const after =
    e.type === 'RAID'
      ? s.heat >= c.heat.raidThreshold
        ? `Heat ${Math.round(s.heat)}. Raids go on until it’s under ${c.heat.raidThreshold}.`
        : `Heat is ${Math.round(s.heat)} now, under ${c.heat.raidThreshold}: the raids stop.`
      : e.type === 'WAGES_MISSED'
        ? `Everyone lost ${Math.abs(c.crew.loyalty.perMissedWageDay)} loyalty. Below ${c.crew.loyalty.lowThreshold}, people walk.`
        : e.type === 'FRONT_FROZEN'
          ? 'It launders nothing and takes no deposits until it thaws.'
          : e.type === 'WALKOUT'
            ? 'Raises keep loyalty up. Your nephew never walks.'
            : null
  return (
    <ModalPanel onRequestClose={store.dismissNotice}>
      <NoticeHead label={look.label} color={look.color} count={count} />
      <View style={styles.event}>
        <Badge icon={look.icon} color={look.color} />
        <View style={styles.eventText}>
          <Text style={[styles.eventLine, line.color === colors.heat ? null : line.color ? { color: line.color } : null]}>{rich(line.text, 17)}</Text>
          {after ? <Text style={styles.after}>{rich(after, 13)}</Text> : null}
        </View>
      </View>
      <Btn kind="primary" title="Got it" onPress={store.dismissNotice} />
    </ModalPanel>
  )
}

const styles = StyleSheet.create({
  when: { fontFamily: fonts.text600, fontSize: 13, color: colors.warn, marginTop: -6 },
  body: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: colors.text },
  options: { gap: 8 },
  unlocks: { flexGrow: 0 },
  unlock: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  rule: { borderTopWidth: 1, borderTopColor: colors.cardAlt },
  unlockText: { flex: 1, gap: 3 },
  unlockName: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  unlockKind: { fontFamily: fonts.text500, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
  unlockDesc: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.muted },
  unlockStats: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.text },
  badge: { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  event: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eventText: { flex: 1, gap: 6 },
  eventLine: { fontFamily: fonts.text600, fontSize: 17, lineHeight: 23, color: colors.text },
  after: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.muted },
})

import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  canPressure,
  convoyLoad,
  customsChance,
  DISTRICT_IDS,
  hijackChance,
  effectiveStat,
  influenceRoom,
  MISSION_IDS,
  missionBlocked,
  missionDone,
  jobXp,
  opDirtyRewardFor,
  opConfigAt,
  opMinutesFor,
  opName,
  opUnlocked,
  OP_TYPES,
  outcomeOdds,
  passageActive,
  rushCost,
  STATS,
  type CrewMember,
  type DistrictId,
  type Offer,
  type OpConfig,
  type OpType,
} from '../../engine'
import { ACT_NAME } from '../acts'
import { Icon } from '../components/Glyph'
import { MissionCard } from '../components/MissionCard'
import { Btn, BuyRow, colors, Empty, glyph, Item, List, Note, rich, Screen, Section, Tag } from '../components/ui'
import { fmt, fmtDuration, pct } from '../format'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Ops (design: Ops): who's out and when they're back, the crew you're sending, the board's offers, training,
// and every job with what it pays, the XP and the odds for the crew you picked.

const STAT_SHORT = { muscle: 'M', brains: 'B', nerve: 'N' } as const
const STAT_LONG = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const
const first = (name: string) => name.split(' ')[0]
const names = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export function OpsScreen({ game }: ScreenProps) {
  const { state: s, config: c, now } = game
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<DistrictId | null>(null)
  const idle = s.crew.filter((m) => m.status === 'idle')
  const team = selected.map((id) => idle.find((m) => m.id === id)).filter((m) => m !== undefined)
  const pressurable = DISTRICT_IDS.filter((id) => !canPressure(s, c, id))
  const pressureTarget = target && pressurable.includes(target) ? target : pressurable[0]
  const board = s.offers.items.filter((o) => o.expiresAt > now && opUnlocked(s, c, o.opType))
  const training = OP_TYPES.filter((type) => c.ops.list[type].training)
  const trainMinutes = training.length ? c.ops.list[training[0]].minutes : 0

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const start = (type: OpType, cfg: OpConfig, offerId?: string) => {
    const error = store.dispatch({
      type: 'START_OP',
      opType: type,
      crewIds: team.map((m) => m.id),
      ...(cfg.districtPressure && pressureTarget ? { districtId: pressureTarget } : {}),
      ...(offerId ? { offerId } : {}),
    })
    if (!error) setSelected([])
  }

  const missions = MISSION_IDS.filter((id) => c.missions.enabled && c.missions.list[id].act === s.act && !missionDone(s, id))
  const ready = missions.filter((id) => !missionBlocked(s, c, id, now)).length

  return (
    <Screen>
      {missions.length > 0 && (
        <Section title="Unfinished business" right={ready ? `${ready} ready` : undefined}>
          {missions.map((id) => (
            <MissionCard key={id} game={game} id={id} picked={team} onSent={() => setSelected([])} />
          ))}
        </Section>
      )}

      {s.ops.length > 0 && (
        <Section title={`Out on jobs · ${s.ops.length}`}>
          {s.ops.map((op) => {
            const cost = rushCost(c, op.completesAt - now)
            return (
              <View key={op.id} style={styles.out}>
                <View style={styles.outText}>
                  <Text style={styles.caps}>{`Out · ${names(op.crewIds.map((id) => first(s.crew.find((m) => m.id === id)?.name ?? '?')))}`}</Text>
                  <Text style={styles.outName}>{opName(c, op)}</Text>
                  <Text style={styles.outBack}>{`back in ${fmtDuration(op.completesAt - now, c)}${op.districtId ? ` · ${c.districts.list[op.districtId].name}` : ''}`}</Text>
                </View>
                <Pressable
                  onPress={() => store.dispatch({ type: 'RUSH_OP', opId: op.id })}
                  disabled={s.gold < cost}
                  accessibilityRole="button"
                  accessibilityLabel={`Finish now for ${cost} gold`}
                  style={({ pressed }) => [styles.rush, s.gold < cost && styles.off, pressed && styles.pressed]}
                >
                  <Text style={styles.rushText}>{rich(`Finish now ${glyph.gold}${cost}`, 14, { plain: true })}</Text>
                </Pressable>
              </View>
            )
          })}
        </Section>
      )}

      <Section title="Pick your crew" right={<Note>{`${glyph.influence}today ${fmt(c.ops.influenceDailyCap - influenceRoom(s, c, now))}/${c.ops.influenceDailyCap}`}</Note>}>
        <View style={styles.pick}>
          {idle.length === 0 ? (
            <Text style={styles.muted}>{s.crew.length ? 'Nobody is free right now.' : 'Nobody hired yet: Crew is under More.'}</Text>
          ) : (
            <View style={styles.chips} accessibilityLabel="Idle crew">
              {idle.map((m) => {
                const on = selected.includes(m.id)
                return (
                  <Pressable key={m.id} onPress={() => toggle(m.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.chip, on && styles.chipOn]}>
                    {on && <Icon name="check" size={13} color={colors.accent} strokeWidth={2.4} />}
                    <Text style={styles.chipName}>{first(m.name)}</Text>
                    <Text style={styles.chipStats}>{`· ${STATS.map((st) => `${STAT_SHORT[st]}${effectiveStat(c, m, st)}`).join(' ')}`}</Text>
                  </Pressable>
                )
              })}
            </View>
          )}
          <Text style={styles.muted}>{`A job uses the best stat on the team; each extra body adds +${c.ops.teamBonusPerExtra}.`}</Text>
        </View>
      </Section>

      <Section title="On the board" right={board.length ? 'better paid, harder' : `new work in ${fmtDuration(s.offers.refreshAt - now, c)}`}>
        {board.length ? (
          <List>
            {board.map((offer) => (
              <OfferRow key={offer.id} game={game} offer={offer} team={team} onStart={start} />
            ))}
          </List>
        ) : (
          <Empty title="Nothing on offer right now" sub={`New work in ${fmtDuration(s.offers.refreshAt - now, c)}.`} />
        )}
      </Section>

      <Section title="Training" right={`${fmtDuration((trainMinutes / 60) * c.time.hourMs, c)} · no roll, no heat`}>
        <List>
          {training.map((type) => {
            const cfg = c.ops.list[type]
            const cost = (cfg.costDirty ?? 0) * s.act
            const ready = team.length === cfg.crew
            return (
              <Item
                key={type}
                label={cfg.name}
                hint={`${STAT_LONG[cfg.training!]} +${fmt(cfg.xp ?? 0)} XP · no report`}
                value={
                  <Btn
                    small
                    title={ready ? `Train ${glyph.dirty}${fmt(cost)}` : `Pick ${cfg.crew}`}
                    disabled={!ready || s.dirty < cost}
                    onPress={() => start(type, cfg)}
                  />
                }
              />
            )
          })}
        </List>
      </Section>

      <Section title="Jobs" right={team.length ? `odds for ${names(team.map((m) => first(m.name)))}` : 'pick crew for the odds'}>
        {OP_TYPES.filter((type) => !c.ops.list[type].training).map((type) => {
          const op = c.ops.list[type]
          if (!opUnlocked(s, c, type)) return <BuyRow key={type} name={op.name} why={`Opens in Act ${ACT_NAME[op.act ?? 1]}`} />
          return (
            <JobCard key={type} game={game} type={type} cfg={op} team={team} onStart={start}>
              {op.districtPressure && (
                <View style={styles.targets}>
                  <Text style={styles.caps}>Pressure where</Text>
                  {pressurable.length === 0 ? (
                    <Text style={styles.muted}>No district left to pressure.</Text>
                  ) : (
                    <View style={styles.chips}>
                      {pressurable.map((id) => {
                        const district = s.districts.find((x) => x.id === id)!
                        const on = pressureTarget === id
                        return (
                          <Pressable key={id} onPress={() => setTarget(id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.chip, on && styles.chipOn]}>
                            <Text style={styles.chipName}>{c.districts.list[id].name}</Text>
                            <Text style={styles.chipStats}>{`${district.pressureCount}/${c.districts.pressureOpsToFlip}`}</Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  )}
                </View>
              )}
            </JobCard>
          )
        })}
      </Section>
    </Screen>
  )
}

// What a job pays on a clean run, as glyph figures: "◆64 ★4", with packs, premium, Influence or votes.
function rewards(game: Snapshot, cfg: OpConfig, team: CrewMember[]): string {
  const { state: s, config: c } = game
  return [
    cfg.dirty ? `${glyph.dirty}${fmt(opDirtyRewardFor(c, s, cfg, 'full', team))}` : '',
    cfg.influence ? `${glyph.influence}${cfg.influence}` : '',
    cfg.cigarettes ? `${glyph.packs}${cfg.cigarettes}` : '',
    cfg.premium ? `${glyph.premium}${fmt(convoyLoad(s, c, cfg))}` : '',
    cfg.votes ? `${cfg.votes} campaign points` : '',
    `${glyph.rep}${fmt(c.reputation.perOpSuccess)}`,
  ]
    .filter(Boolean)
    .join('  ')
}

// "30m · 1 crew · Muscle 70% · Nerve 40% · difficulty 50 · +▲4"
function meta(game: Snapshot, cfg: OpConfig, team: CrewMember[]): string {
  const { state: s, config: c } = game
  const live = opConfigAt(c, s, cfg) // smuggling gets harder with heat
  const minutes = opMinutesFor(c, cfg, team.length === cfg.crew ? team : [])
  const weights = STATS.filter((st) => cfg.w[st]).map((st) => `${STAT_LONG[st]} ${pct(cfg.w[st]!)}`)
  return [
    `${fmtDuration((minutes / 60) * c.time.hourMs, c)} · ${cfg.crew} crew`,
    ...weights,
    `difficulty ${live.diff}${live.diff !== cfg.diff ? ` (${cfg.diff} + heat)` : ''}`,
    `+${glyph.heat}${fmt(cfg.spike)}`,
  ].join(' · ')
}

function OfferRow({ game, offer, team, onStart }: { game: Snapshot; offer: Offer; team: CrewMember[]; onStart: (type: OpType, cfg: OpConfig, offerId?: string) => void }) {
  const { state: s, config: c, now } = game
  const cfg = offer.cfg
  const ready = team.length === cfg.crew
  const odds = ready ? outcomeOdds(c, opConfigAt(c, s, cfg), team) : null
  return (
    <View style={styles.offer}>
      <View style={styles.titleLine}>
        <Text style={styles.jobName}>{cfg.name}</Text>
        <Text style={styles.gone}>{`gone in ${fmtDuration(offer.expiresAt - now, c)}`}</Text>
      </View>
      <Text style={styles.meta}>{rich(`${c.ops.list[offer.opType].name}, better paid · ${meta(game, cfg, team)}`, 12.5, { plain: true })}</Text>
      {cfg.costClean ? <Text style={styles.meta}>{rich(`costs ${glyph.clean}${fmt(cfg.costClean)} up front`, 12.5)}</Text> : null}
      <View style={styles.offerFoot}>
        <View style={styles.offerPays}>
          <Text style={styles.pays}>
            {'pays  '}
            {rich(rewards(game, cfg, ready ? team : []), 14)}
          </Text>
          <Text style={styles.oddsText}>{odds ? `clean ${pct(odds.full)} · partial ${pct(odds.partial)} · fail ${pct(odds.fail)}` : `pick ${cfg.crew} for the odds`}</Text>
        </View>
        <Btn small title="Send" disabled={!ready || (cfg.costClean ?? 0) > s.clean} onPress={() => onStart(offer.opType, cfg, offer.id)} style={styles.send} />
      </View>
    </View>
  )
}

function JobCard({ game, type, cfg, team, onStart, children }: {
  game: Snapshot
  type: OpType
  cfg: OpConfig
  team: CrewMember[]
  onStart: (type: OpType, cfg: OpConfig, offerId?: string) => void
  children?: ReactNode
}) {
  const { state: s, config: c, now } = game
  const ready = team.length === cfg.crew
  const odds = ready ? outcomeOdds(c, opConfigAt(c, s, cfg), team) : null
  const minutes = opMinutesFor(c, cfg, ready ? team : [])
  const xp = ready
    ? team
        .map((m) => {
          const gain = jobXp(c, cfg, 'full', m, team)
          return `${first(m.name)} ${STATS.filter((st) => gain[st]).map((st) => `${STAT_SHORT[st]}+${fmt(gain[st]!)}`).join(' ')}`
        })
        .join(' · ')
    : null
  const meta = [...STATS.filter((st) => cfg.w[st]).map((st) => `${STAT_LONG[st]} ${pct(cfg.w[st]!)}`), `difficulty ${opConfigAt(c, s, cfg).diff}`].join(' · ')
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.titleLine}>
          <Text style={styles.jobName}>{cfg.name}</Text>
          <Tag text={`${fmtDuration((minutes / 60) * c.time.hourMs, c)} · ${cfg.crew} crew`} />
        </View>
        <Text style={styles.needs}>{rich(`Needs ${meta} · +${glyph.heat}${fmt(cfg.spike)} heat`, 13, { plain: true })}</Text>
      </View>
      <List style={styles.flush}>
        {cfg.costClean ? <Item label="Costs up front" hint="paid when you send; no Rep, and gone if it fails" value={`−${glyph.clean}${fmt(cfg.costClean)}`} color={colors.clean} /> : null}
        {cfg.premium ? (
          <Item
            label="At the border"
            hint={passageActive(s, now) ? 'passage paid' : 'no passage'}
            value={<Text style={styles.border}>{`road ${pct(hijackChance(s, c, now))} · customs ${pct(customsChance(s, c))}`}</Text>}
          />
        ) : null}
        <Item label="Pays" hint={`on a clean job, ${pct(c.ops.partialRewardPct)} if partial`} value={<Text style={styles.paysValue}>{rich(rewards(game, cfg, ready ? team : []), 15)}</Text>} />
        {xp ? <Item label="XP" hint="on a clean job" value={<Text style={styles.xp}>{xp}</Text>} /> : null}
      </List>
      {children ? <View style={styles.children}>{children}</View> : null}
      <View style={styles.foot}>
        {odds ? (
          <>
            <View style={styles.oddsBar} accessibilityLabel={`clean ${pct(odds.full)}, partial ${pct(odds.partial)}, fail ${pct(odds.fail)}`}>
              <View style={{ flex: odds.full, backgroundColor: colors.good }} />
              <View style={{ flex: odds.partial, backgroundColor: colors.accent }} />
              <View style={{ flex: odds.fail, backgroundColor: '#9a3a2c' }} />
            </View>
            <View style={styles.oddsLabels}>
              <Text style={styles.oddsText}>{`clean ${pct(odds.full)}`}</Text>
              <Text style={styles.oddsText}>{`partial ${pct(odds.partial)}`}</Text>
              <Text style={[styles.oddsText, odds.fail > 0.4 && { color: colors.bad }]}>{`fail ${pct(odds.fail)}`}</Text>
            </View>
          </>
        ) : null}
        <Btn
          title={ready ? `Send ${names(team.map((m) => first(m.name)))}` : `Pick ${cfg.crew} idle crew`}
          disabled={!ready || (cfg.costClean ?? 0) > s.clean}
          onPress={() => onStart(type, cfg)}
          style={styles.sendWide}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  caps: { fontFamily: fonts.text400, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.muted },
  muted: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 19, color: colors.muted },
  out: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, borderRadius: 6 },
  outText: { flex: 1, gap: 2 },
  outName: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  outBack: { fontFamily: fonts.text400, fontSize: 13, color: colors.text },
  rush: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#5c4b25', borderRadius: 4, backgroundColor: '#241d10' },
  rushText: { fontFamily: fonts.text600, fontSize: 14, color: colors.gold },
  pick: { gap: 12, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, borderRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.control, borderRadius: 4, backgroundColor: colors.cardAlt },
  chipOn: { borderWidth: 2, borderColor: colors.accent, backgroundColor: '#332a1a', paddingHorizontal: 9 },
  chipName: { fontFamily: fonts.text600, fontSize: 13.5, color: colors.text },
  chipStats: { fontFamily: fonts.text400, fontSize: 13.5, color: colors.muted },
  offer: { gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  titleLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  jobName: { flexShrink: 1, fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  gone: { fontFamily: fonts.text400, fontSize: 12, color: colors.warn },
  meta: { fontFamily: fonts.text400, fontSize: 12.5, lineHeight: 18, color: colors.muted },
  offerFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  offerPays: { flexShrink: 1, gap: 2 },
  pays: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  oddsText: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  send: { paddingHorizontal: 16 },
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider },
  cardHead: { gap: 6, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14 },
  needs: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 19, color: colors.muted },
  flush: { borderWidth: 0, borderTopWidth: 1, borderTopColor: colors.cardAlt, borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  border: { fontFamily: fonts.text600, fontSize: 13, color: colors.premium },
  paysValue: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  xp: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.text600, fontSize: 13, color: colors.accent },
  children: { paddingHorizontal: 14, paddingBottom: 12 },
  targets: { gap: 8 },
  foot: { gap: 6, paddingTop: 12, paddingBottom: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: colors.cardAlt },
  oddsBar: { flexDirection: 'row', height: 8, borderRadius: 1, overflow: 'hidden' },
  oddsLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sendWide: { marginTop: 6 },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
})

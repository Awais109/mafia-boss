import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { baseWage, effectiveStat, formulas, RANK_NAMES, STATS, type Config, type CrewMember, type TraitId } from '../../engine'
import { Icon } from '../components/Glyph'
import { CrewHead } from '../components/Portrait'
import { Btn, BuyRow, colors, Empty, glyph, Item, List, rich, Screen, Section, Strip, Tag, Title } from '../components/ui'
import { fmt, fmtDuration, fmtRate } from '../format'
import { openingCrew } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Crew (design: Crew): slots and wages, then each member as a card (portrait for the opening's three, rank,
// tags, each stat against its ceiling with XP under it, loyalty against the walkout line, and what you can
// do), then the people looking for work.

const STAT_LABEL = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const
const TRAIT_NAME: Record<TraitId, string> = { exArmy: 'ex-army', gambler: 'gambler', alcoholic: 'drinks' }
const first = (name: string) => name.split(' ')[0]

function traitText(c: Config, t: TraitId): string {
  const tr = c.crew.traits
  if (t === 'exArmy') return `Ex-army: +${tr.exArmy.muscleBonus} Muscle.`
  if (t === 'gambler') return `Gambler: +${tr.gambler.nerveBonus} Nerve, wage ×${tr.gambler.wageMult}.`
  return `Drinks: wage ×${tr.alcoholic.wageMult}, −0–${tr.alcoholic.randomPenalty} on jobs.`
}

export function CrewScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const slotsFree = d.crewSlots - s.crew.length
  const idle = s.crew.filter((m) => m.status === 'idle').length
  const out = s.crew.filter((m) => m.status === 'on_op').length
  const canBuySlot = s.crewSlotsBought < c.crew.extraSlotMax

  return (
    <Screen>
      <Section title="Crew" right={s.crew.length ? `${idle} idle${out ? ` · ${out} out` : ''}` : undefined}>
        <View style={styles.summary}>
          <List style={styles.flush}>
            <Item label="Slots" hint={slotsFree > 0 ? `${slotsFree} free` : 'all taken'} value={`${s.crew.length}/${d.crewSlots}`} />
            <Item
              label="Wages"
              hint={s.crew.length ? s.crew.map((m) => `${first(m.name)} ${fmt(baseWage(c, m) * d.wageMult)}`).join(' · ') : 'nobody on the books'}
              value={`−${glyph.dirty}${fmtRate(d.wagesPerHr)}`}
              plain
            />
            {d.wageMult !== 1 && <Item label="District discount" hint="where your crew live" value={`×${d.wageMult}`} color={colors.good} />}
          </List>
          <View style={styles.pad}>
            {canBuySlot && <Btn title={`Buy a slot ${glyph.clean}${fmt(d.costs.crewSlot)}`} disabled={s.clean < d.costs.crewSlot} onPress={() => store.dispatch({ type: 'BUY_CREW_SLOT' })} />}
            <Text style={styles.note}>
              {`Each bar is a stat against its ceiling; the thin line under it is XP toward the next point. Jobs, training and enforcing earn XP, and ${c.crew.experience.ranks.soldier} and ${c.crew.experience.ranks.made} points earned bring a promotion with a perk. Wage = (Muscle + Brains + Nerve) ÷ ${c.crew.wageDivisor} an hour, paid daily from Dirty; a missed payday costs everyone ${Math.abs(c.crew.loyalty.perMissedWageDay)} loyalty.`}
            </Text>
          </View>
        </View>
      </Section>

      {s.crew.length === 0 ? (
        <Empty title="Nobody yet" sub="Hire from the people looking for work below." />
      ) : (
        s.crew.map((m) => <MemberCard key={m.id} game={game} m={m} />)
      )}

      <Section title="Looking for work" right={`new faces in ${fmtDuration(s.recruitPool.refreshAt - now, c)}`}>
        {slotsFree <= 0 && s.recruitPool.candidates.length > 0 && (
          <Strip tone="warn">{canBuySlot ? `No free slot: buy one for ${glyph.clean}${fmt(d.costs.crewSlot)} before you hire.` : 'No free slot, and no more to buy.'}</Strip>
        )}
        {s.recruitPool.candidates.length === 0 && <Empty title="Nobody right now" />}
        {s.recruitPool.candidates.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.recruitHead}>
              <Title size={18} weight={700}>
                {m.name}
              </Title>
              <View style={styles.tags}>
                {m.traits.map((t) => (
                  <Tag key={t} text={TRAIT_NAME[t]} />
                ))}
              </View>
            </View>
            {m.traits.length > 0 && <Text style={[styles.note, styles.padX]}>{m.traits.map((t) => traitText(c, t)).join(' ')}</Text>}
            <View style={styles.statsBlock}>
              <Stats c={c} m={m} />
            </View>
            <View style={styles.recruitFoot}>
              <Text style={styles.wage}>{rich(`wage ${glyph.dirty}${fmtRate(baseWage(c, m) * d.wageMult)}`, 13)}</Text>
              <Btn
                title={`Hire ${glyph.clean}${fmt(d.costs.recruit)}`}
                disabled={slotsFree <= 0 || s.clean < d.costs.recruit}
                onPress={() => store.dispatch({ type: 'RECRUIT', candidateId: m.id })}
              />
            </View>
          </View>
        ))}
      </Section>
    </Screen>
  )
}

// Each stat against its ceiling in three columns; for your own crew, a thin XP line toward the next point.
function Stats({ c, m, growth }: { c: Config; m: CrewMember; growth?: boolean }) {
  return (
    <View style={styles.stats}>
      {STATS.map((stat) => {
        const eff = effectiveStat(c, m, stat)
        const capped = m[stat] >= m.potential[stat]
        const cost = formulas.statPointCost(c, m[stat])
        return (
          <View key={stat} style={styles.stat}>
            <View style={styles.statLine}>
              <Text style={styles.statLabel}>{STAT_LABEL[stat]}</Text>
              <Text style={styles.statValue}>
                {eff}
                <Text style={styles.statCap}>{` / ${m.potential[stat]}`}</Text>
              </Text>
            </View>
            <View style={styles.statTrack}>
              <View style={[styles.statFill, { width: `${Math.min(100, (m[stat] / Math.max(1, m.potential[stat])) * 100)}%` }]} />
            </View>
            {growth && (
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: capped ? '0%' : `${Math.min(100, (m.xp[stat] / cost) * 100)}%` }]} />
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

function MemberCard({ game, m }: { game: Snapshot; m: CrewMember }) {
  const { state: s, derived: d, config: c, now } = game
  const [assigning, setAssigning] = useState(false)
  const [firing, setFiring] = useState(false)
  const low = c.crew.loyalty.lowThreshold
  const story = openingCrew(c, m.name)
  const status = (() => {
    switch (m.status) {
      case 'idle':
        return { text: 'idle' }
      case 'on_op': {
        const op = s.ops.find((o) => o.id === m.assignedTo)
        return { text: op ? `on a job · ${fmtDuration(op.completesAt - now, c)}` : 'on a job' }
      }
      case 'enforcer': {
        const r = s.rackets.find((x) => x.id === m.assignedTo)
        return { text: `minding the ${r ? c.rackets.types[r.type].name : 'racket'}`, color: colors.accent }
      }
      case 'jailed':
        return { text: `jailed · ${fmtDuration((m.jailedUntil ?? now) - now, c)}`, color: colors.bad }
      case 'injured':
        return { text: `hurt · ${fmtDuration((m.injuredUntil ?? now) - now, c)}`, color: colors.warn }
    }
  })()
  const notes = [...m.traits.map((t) => traitText(c, t)), ...m.perks.map((p) => `${c.crew.experience.perks[p].name}: ${c.crew.experience.perks[p].text}.`)]
  const targets = s.rackets.map((r, i) => ({ r, rd: d.perRacket[i] })).filter(({ r, rd }) => !r.enforcerId && rd.kind !== 'premises' && !r.legal)
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {story && <CrewHead id={story.head} size={64} />}
        <View style={styles.who}>
          <View style={styles.nameLine}>
            <Title size={22} weight={700} style={styles.name}>
              {m.name}
            </Title>
            <Tag text={status.text} color={status.color} />
          </View>
          <Text style={styles.role}>
            {story ? `${story.epithet} · ` : ''}
            <Text style={styles.rank}>{RANK_NAMES[m.rank] ?? 'Associate'}</Text>
          </Text>
          <View style={styles.tags}>
            {(m.nephew || m.stays) && <Tag text="never leaves" color={colors.accent} />}
            {m.nephew && <Tag text="nephew" color={colors.accent} />}
            {m.traits.map((t) => (
              <Tag key={t} text={TRAIT_NAME[t]} />
            ))}
            {m.perks.map((p) => (
              <Tag key={p} text={c.crew.experience.perks[p].name} color={colors.text} />
            ))}
          </View>
        </View>
      </View>
      {notes.length > 0 && <Text style={[styles.note, styles.padX, styles.notes]}>{notes.join(' ')}</Text>}

      <View style={styles.statsBlock}>
        <Stats c={c} m={m} growth />
      </View>

      <View style={styles.loyalty}>
        <View style={styles.statLine}>
          <Text style={styles.label}>Loyalty</Text>
          <Text style={[styles.loyaltyValue, m.loyalty < low && { color: colors.bad }]}>{Math.round(m.loyalty)}</Text>
        </View>
        <View style={styles.loyaltyTrack}>
          <View style={[styles.loyaltyFill, { width: `${Math.max(0, Math.min(100, m.loyalty))}%` }, m.loyalty < low && { backgroundColor: colors.bad }]} />
          <View style={[styles.loyaltyMark, { left: `${low}%` }]} />
        </View>
        <View style={styles.statLine}>
          <Text style={styles.small}>{m.nephew || m.stays ? 'Never walks out' : `Below the red line at ${low}, ${first(m.name)} might walk out`}</Text>
          <Text style={styles.small}>{rich(`wage ${glyph.dirty}${fmtRate(baseWage(c, m) * d.wageMult)}`, 12)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Btn
          small
          title={`Raise ${glyph.clean}${fmt(d.costs.raise)}`}
          sub={`loyalty +${c.crew.loyalty.perRaise}`}
          disabled={s.clean < d.costs.raise || m.loyalty >= 100}
          onPress={() => store.dispatch({ type: 'RAISE', crewId: m.id })}
          style={styles.action}
        />
        {m.status === 'enforcer' ? (
          <Btn small title="Stop enforcing" sub="back to idle" onPress={() => store.dispatch({ type: 'ASSIGN_ENFORCER', crewId: m.id, racketId: null })} style={styles.action} />
        ) : (
          <Btn
            small
            title="Make enforcer"
            sub={m.status === 'idle' ? 'at a business' : 'when back'}
            disabled={m.status !== 'idle' || targets.length === 0}
            onPress={() => setAssigning(!assigning)}
            style={styles.action}
          />
        )}
        {!m.nephew && (
          <Btn
            small
            kind="danger"
            title={firing ? 'Fire them?' : 'Fire'}
            sub={firing ? 'tap again' : 'two taps'}
            disabled={m.status === 'on_op'}
            onPress={() => {
              if (!firing) return setFiring(true)
              store.dispatch({ type: 'FIRE', crewId: m.id })
              setFiring(false)
            }}
            style={styles.action}
          />
        )}
      </View>
      {m.nephew && (
        <View style={[styles.family, styles.padX]}>
          <Icon name="lock" size={12} color={colors.faint} />
          <Text style={styles.small}>{`Family: ${first(m.name)} can’t be fired.`}</Text>
        </View>
      )}
      {assigning && m.status === 'idle' && (
        <View style={styles.assign}>
          <Text style={styles.note}>{`An enforcer minds one business: yield ×${c.rackets.enforcer.yieldMult}, heat ×${c.rackets.enforcer.heatMult}. They can’t work jobs.`}</Text>
          {targets.map(({ r, rd }) => (
            <BuyRow
              key={r.id}
              name={`${c.rackets.types[r.type].name} · tier ${r.tier}`}
              kind={c.districts.list[r.districtId].name}
              does={`${glyph.dirty}${fmtRate(rd.yield)} · ${glyph.heat}${fmt(rd.exposure)}`}
              onPress={() => {
                store.dispatch({ type: 'ASSIGN_ENFORCER', crewId: m.id, racketId: r.id })
                setAssigning(false)
              }}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, paddingTop: 2 },
  flush: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  pad: { gap: 10, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14 },
  padX: { paddingHorizontal: 14 },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  notes: { marginTop: -4, paddingBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider },
  head: { flexDirection: 'row', gap: 12, padding: 14 },
  who: { flex: 1, gap: 6 },
  nameLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { flexShrink: 1 },
  role: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
  rank: { fontFamily: fonts.text600, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statsBlock: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.cardAlt },
  stats: { flexDirection: 'row', gap: 14 },
  stat: { flex: 1, gap: 5 },
  statLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 },
  statLabel: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted },
  statValue: { fontFamily: fonts.text600, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  statCap: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.faint },
  statTrack: { height: 6, borderRadius: 1, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  statFill: { height: 6, backgroundColor: colors.text },
  xpTrack: { height: 3, borderRadius: 1, backgroundColor: colors.cardAlt, overflow: 'hidden', marginTop: -1 },
  xpFill: { height: 3, backgroundColor: colors.rep },
  loyalty: { gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.cardAlt },
  label: { fontFamily: fonts.text400, fontSize: 14, color: colors.text },
  loyaltyValue: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  loyaltyTrack: { height: 8, borderRadius: 1, backgroundColor: colors.cardAlt },
  loyaltyFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 1, backgroundColor: '#a2957c' },
  loyaltyMark: { position: 'absolute', top: -3, bottom: -3, width: 2, marginLeft: -1, backgroundColor: colors.bad },
  small: { flexShrink: 1, fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  action: { flex: 1, paddingHorizontal: 6 },
  family: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 14, marginTop: -4 },
  assign: { gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  recruitHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: 14, paddingBottom: 10 },
  recruitFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.cardAlt },
  wage: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
})

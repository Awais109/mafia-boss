import { StyleSheet, Text, View } from 'react-native'
import { influenceRoom, OFFICIAL_IDS } from '../../engine'
import { ACT_NAME } from '../acts'
import { Glyph, Icon } from '../components/Glyph'
import { Head } from '../components/Portrait'
import { BigFigure, Btn, colors, Empty, glyph, Item, List, Meter, Note, rich, Screen, Section, Tag } from '../components/ui'
import { fmt, fmtDuration, fmtRate, pct } from '../format'
import { OFFICIAL_PERSON } from '../story'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import type { ScreenProps } from './types'

// Heat (design: Heat): the scale with its three lines and where heat is heading, exposure pushing it up
// and control holding it down as two ledgers, the bribe, and the officials as people.

export function HeatScreen({ game }: ScreenProps) {
  const { state: s, derived: d, config: c, now } = game
  const h = c.heat
  const bribeActive = s.bribeControl > 0 && s.bribeUntil > now
  const cooldown = s.officialCooldownUntil - now
  const heatColor = s.heat >= h.raidThreshold ? colors.bad : s.heat >= h.inspectThreshold ? colors.warn : colors.text
  const earners = d.perRacket.filter((r) => r.kind !== 'premises' && !r.legal && !r.closed).length
  const busy = d.perFront.filter((f) => f.suspicion > 0).map((f) => c.fronts.types[f.type].name)
  const heldDistricts = s.districts.filter((x) => x.controller === 'player' && !c.districts.list[x.id].home).map((x) => c.districts.list[x.id].name)
  const officialsHint = s.officials.map((id) => `${c.officials.list[id].name} ${fmt(c.officials.list[id].control)}`).join(' · ')
  const lines = [
    { key: 'inspect', at: h.inspectThreshold, name: 'Inspections', what: `cut income ${pct(1 - h.inspectYieldMult)}`, color: colors.warn },
    {
      key: 'raid',
      at: h.raidThreshold,
      name: 'Raids',
      what: `${pct(h.raidChancePerHr)} an hour · take ${pct(h.raidSeizePct)} of the vault${d.raidShield > 0 ? `, ${pct(d.raidShield)} of it hidden` : ''}`,
      color: '#e0877a',
    },
    { key: 'arrest', at: h.arrestThreshold, name: 'Arrests', what: `${pct(h.arrestChancePerHr)} an hour · ${h.arrestHours}h in a cell`, color: colors.text },
  ]

  return (
    <Screen>
      <Section title="Heat" right="police attention, 0–100">
        <View style={styles.card}>
          <View style={styles.pad}>
            <View style={styles.top}>
              <BigFigure kind="heat" value={String(Math.round(s.heat))} of="100" color={heatColor} />
              <Text style={styles.heading}>
                {'heading for '}
                <Text style={styles.bold}>{Math.round(d.heatTarget)}</Text>
              </Text>
            </View>
            <Scale heat={s.heat} target={d.heatTarget} lines={lines} />
          </View>
          <List style={styles.flush}>
            {lines.map((l) => (
              <Item
                key={l.key}
                left={<View style={[styles.stripe, { backgroundColor: l.color }]} />}
                label={l.name}
                hint={l.what}
                value={
                  <View style={styles.from}>
                    {s.heat >= l.at && <Tag text="now" color={l.color} />}
                    <Text style={styles.fromText}>{rich(`from ${glyph.heat}${l.at}`, 14, { plain: true })}</Text>
                  </View>
                }
              />
            ))}
          </List>
          <Text style={[styles.note, styles.pad]}>
            {`Heat closes ${pct(h.convergePerHr)} of the gap to its target each hour. Target = exposure ÷ (exposure + control) = ${fmt(d.exposure)} ÷ (${fmt(d.exposure)} + ${fmt(d.control)}).`}
          </Text>
        </View>
      </Section>

      <Section title="Exposure" right="pushes heat up">
        <Ledger
          rows={[
            { label: 'Businesses', hint: `${earners} running`, value: `${glyph.heat}${fmt(d.racketExposure)}` },
            { label: 'Busy fronts', hint: busy.length ? `${busy.join(', ')}, running hot` : `none over ${pct(c.fronts.suspicionStartUtil)}`, value: `${glyph.heat}${fmt(d.frontSuspicion)}` },
          ]}
          total={{ label: 'Total exposure', value: `${glyph.heat}${fmt(d.exposure)}`, color: colors.bad }}
        />
      </Section>

      <Section title="Control" right="holds heat down">
        <Ledger
          rows={[
            { label: 'Base', value: fmt(d.controlParts.base) },
            { label: 'Officials', hint: officialsHint || 'nobody on the payroll', value: `+${fmt(d.controlParts.officials)}` },
            { label: 'Bribe', hint: bribeActive ? `working · ${fmtDuration(s.bribeUntil - now, c)} left` : 'none', value: `+${fmt(d.controlParts.bribe)}`, faint: !bribeActive },
            s.act >= c.opinion.fromAct
              ? { label: 'The mayor’s office', hint: s.politics.mayor ? 'yours' : 'win an election', value: `+${fmt(d.controlParts.mayor)}`, faint: !s.politics.mayor }
              : { label: 'The mayor’s office', value: `Act ${ACT_NAME[c.opinion.fromAct]}`, faint: true },
            { label: 'Districts taken', hint: heldDistricts.join(', ') || `+${pct(h.districtControlPct)} each`, value: `×${d.controlParts.districtMult.toFixed(2)}` },
            s.act >= c.opinion.fromAct
              ? { label: 'Public opinion', hint: `${Math.round(s.politics.opinion)} of 100`, value: `×${d.controlParts.opinionMult.toFixed(2)}` }
              : { label: 'Public opinion', value: `Act ${ACT_NAME[c.opinion.fromAct]}`, faint: true },
          ]}
          total={{ label: 'Total control', value: fmt(d.control) }}
        />
      </Section>

      <Section title="Bribe" right={`+${pct(h.bribe.controlPct)} control for ${h.bribe.hours}h`}>
        <View style={[styles.card, styles.pad, styles.gap]}>
          {bribeActive ? (
            <>
              <View style={styles.top}>
                <Text style={styles.name}>Working</Text>
                <Text style={styles.heading}>{`${fmtDuration(s.bribeUntil - now, c)} left`}</Text>
              </View>
              <Meter value={s.bribeUntil - now} max={h.bribe.hours * c.time.hourMs} color={colors.accent} />
              <Text style={styles.note}>The next one when this runs out.</Text>
              <Empty center title={`Working: ${fmtDuration(s.bribeUntil - now, c)} left`} />
            </>
          ) : (
            <>
              <Text style={styles.note}>{`The emergency lever: +${pct(h.bribe.controlPct)} of your base and official control for ${h.bribe.hours}h. It costs ${h.bribe.costPerExposure} Dirty per point of exposure.`}</Text>
              <Btn kind="primary" title={`Bribe ${glyph.dirty}${fmt(d.costs.bribe)}`} disabled={s.dirty < d.costs.bribe} onPress={() => store.dispatch({ type: 'BRIBE' })} />
            </>
          )}
        </View>
      </Section>

      <Section title="Officials" right={<Note color={colors.influence}>{`${glyph.influence}${fmt(s.influence)} · +${glyph.influence}${fmtRate(d.influencePerHr)}`}</Note>}>
        <Text style={styles.note}>
          {`Officials are permanent control. Influence comes from jobs (${glyph.influence}${fmt(c.ops.influenceDailyCap - influenceRoom(s, c, now))}/${c.ops.influenceDailyCap} today), from officials already on the payroll, and from a Union Office.`}
        </Text>
        {OFFICIAL_IDS.map((id) => (
          <OfficialCard key={id} game={game} id={id} cooldown={cooldown} />
        ))}
        {cooldown > 0 && (
          <View style={styles.cooldown}>
            <Icon name="clock" size={14} color={colors.muted} />
            <Text style={styles.heading}>{`Next official in ${fmtDuration(cooldown, c)}`}</Text>
          </View>
        )}
      </Section>
    </Screen>
  )
}

type Line = { key: string; at: number; name: string; color: string }

// The 0–100 scale: heat's fill, a tick at each line with its label under it, and a small mark at the target.
function Scale({ heat, target, lines }: { heat: number; target: number; lines: Line[] }) {
  return (
    <View style={styles.scale}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, heat))}%` }]} />
        {lines.map((l) => (
          <View key={l.key} style={[styles.tick, { left: `${l.at}%`, backgroundColor: l.color }]} />
        ))}
      </View>
      <View style={[styles.target, { left: `${Math.max(0, Math.min(100, target))}%` }]}>
        <Glyph kind="heat" size={8} color={colors.faint} />
      </View>
      <View style={styles.labels}>
        {lines.map((l, i) => (
          <Text
            key={l.key}
            style={[styles.tickLabel, { top: i % 2 === 1 ? 16 : 0, left: `${l.at}%` }, l.at > 75 ? styles.tickLabelEnd : styles.tickLabelMid]}
            numberOfLines={1}
          >{`${l.at} · ${l.name.toLowerCase()}`}</Text>
        ))}
      </View>
    </View>
  )
}

type LedgerRow = { label: string; hint?: string; value: string; faint?: boolean }

// Rows, then a brass rule, the total, and the double rule.
function Ledger({ rows, total }: { rows: LedgerRow[]; total: { label: string; value: string; color?: string } }) {
  return (
    <View style={[styles.card, styles.ledger]}>
      <List style={styles.flush}>
        {rows.map((r) => (
          <Item key={r.label} label={r.faint ? <Text style={styles.faint}>{r.label}</Text> : r.label} hint={r.hint} value={r.faint ? <Text style={styles.faint}>{rich(r.value, 14, { plain: true })}</Text> : r.value} plain />
        ))}
      </List>
      <View style={styles.totals}>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{total.label}</Text>
          <Text style={[styles.totalValue, total.color ? { color: total.color } : null]}>{rich(total.value, 17, { plain: true })}</Text>
        </View>
        <View style={styles.doubleRule} />
      </View>
    </View>
  )
}

function OfficialCard({ game, id, cooldown }: { game: Snapshot; id: (typeof OFFICIAL_IDS)[number]; cooldown: number }) {
  const { state: s, derived: d, config: c } = game
  const o = c.officials.list[id]
  const person = OFFICIAL_PERSON[id]
  const owned = s.officials.includes(id)
  const open = d.unlocked.official[id]
  const role = `${o.name}${o.act > 1 && !owned ? (o.act > s.act ? ` · Act ${ACT_NAME[o.act]}` : o.act === s.act ? ` · new in Act ${ACT_NAME[o.act]}` : '') : ''}`
  const effects = [
    `+${fmt(o.control)} control`,
    `+${glyph.influence}${fmt(c.officials.influencePerHrEach * 24)} a day`,
    o.seizureMult !== undefined ? `customs ×${o.seizureMult}` : '',
    o.ministryRelief ? `the Ministry −${o.ministryRelief}` : '',
  ].filter(Boolean)
  return (
    <View style={[styles.card, styles.official, open && !owned && styles.officialOpen]}>
      <View style={styles.officialHead}>
        <Head id={person.head} size={44} />
        <View style={styles.officialWho}>
          <Text style={styles.caps}>{role}</Text>
          <Text style={styles.name}>{person.who}</Text>
        </View>
        {owned ? <Tag text="on the payroll" color={colors.good} /> : !open && o.act <= s.act ? <Tag text="mayor only" dashed /> : null}
      </View>
      <View style={styles.chips}>
        {effects.map((e) => (
          <View key={e} style={styles.chip}>
            <Text style={styles.chipText}>{rich(e, 12.5, { plain: true })}</Text>
          </View>
        ))}
      </View>
      {!owned && open && (
        <Btn
          kind="primary"
          title={`Put on the payroll ${glyph.influence}${fmt(o.cost)}`}
          disabled={s.influence < o.cost || cooldown > 0}
          onPress={() => store.dispatch({ type: 'BUY_OFFICIAL', officialId: id })}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider },
  pad: { padding: 14 },
  gap: { gap: 10 },
  flush: { borderWidth: 0, borderTopWidth: 1, borderTopColor: colors.cardAlt, borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 0 },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  heading: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
  bold: { fontFamily: fonts.text600, color: colors.text },
  name: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  faint: { fontFamily: fonts.text400, fontSize: 14, color: colors.faint },
  scale: { marginTop: 14, height: 58 },
  track: { height: 12, borderRadius: 2, backgroundColor: colors.cardAlt, overflow: 'visible' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2, backgroundColor: colors.heat },
  tick: { position: 'absolute', top: -2, bottom: -2, width: 2, marginLeft: -1 },
  target: { position: 'absolute', top: 15, marginLeft: -4 },
  labels: { position: 'absolute', top: 26, left: 0, right: 0, height: 32 },
  tickLabel: { position: 'absolute', width: 110, fontFamily: fonts.text400, fontSize: 11.5, color: colors.muted },
  tickLabelMid: { marginLeft: -55, textAlign: 'center' },
  tickLabelEnd: { marginLeft: -110 + 14, textAlign: 'right' },
  stripe: { width: 3, alignSelf: 'stretch', borderRadius: 1, marginVertical: 2 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fromText: { fontFamily: fonts.text400, fontSize: 14, color: colors.muted },
  ledger: { paddingTop: 2, paddingBottom: 12 },
  totals: { marginHorizontal: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 6 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  totalLabel: { fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  totalValue: { fontFamily: fonts.text600, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginTop: 6 },
  official: { gap: 10, padding: 14 },
  officialOpen: { borderColor: '#4a3c24' },
  officialHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  officialWho: { flex: 1, gap: 2 },
  caps: { fontFamily: fonts.text400, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3, backgroundColor: colors.cardAlt },
  chipText: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.text },
  cooldown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
})

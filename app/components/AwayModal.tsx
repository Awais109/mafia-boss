import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { AwayJob, AwaySummary } from '../away'
import { describeEvent } from '../eventText'
import { fmt, fmtClock, fmtDuration } from '../format'
import type { TabId } from '../screens/types'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Icon } from './Glyph'
import { ModalPanel } from './Modal'
import { Btn, colors, glyph, rich, Strip, Tile, Title } from './ui'

// While you were away (ADR 0023; design: Pop-ups · While you were away): how long, what's waiting on Home,
// each job that came back, the money as a ledger with a total, what else moved, and everything else that
// happened, with its time. After a gold skip the title reads "Skipped N hours".

const OUTCOME = {
  full: { text: 'clean', color: colors.good },
  partial: { text: 'partial', color: colors.warn },
  fail: { text: 'failed', color: colors.bad },
} as const

function gains(j: AwayJob): string {
  return [j.dirty ? `+${glyph.dirty}${fmt(j.dirty)}` : '', j.influence ? `+${glyph.influence}${fmt(j.influence)}` : '', j.rep ? `+${glyph.rep}${fmt(j.rep)}` : ''].filter(Boolean).join('  ')
}

export function AwayModal({ summary: a, game, onGo }: { summary: AwaySummary; game: Snapshot; onGo?: (tab: TabId) => void }) {
  const { state: s, config: c } = game
  const d = glyph.dirty
  const cl = glyph.clean
  const notes = a.events.map((e) => ({ e, line: describeEvent(e, s, c) })).filter(({ line }) => !line.quiet)
  const washed = a.fronts.reduce((sum, f) => sum + f.clean, 0)
  const costs = a.wagesPaid + a.upkeepPaid + a.tributeLost + a.seized
  const net = a.racketsEarned - costs
  const stamp = (t: number) => fmtClock(t, s.createdAt, c).replace(' · ', ', ')
  const heatColor = a.heatTo >= c.heat.raidThreshold ? colors.bad : a.heatTo >= c.heat.inspectThreshold ? colors.warn : undefined
  return (
    <ModalPanel onRequestClose={store.dismissAway} style={styles.panel}>
      <View style={styles.titleLine}>
        <Title size={24} weight={800} style={styles.title}>
          {a.skippedHours ? `Skipped ${a.skippedHours} hour${a.skippedHours === 1 ? '' : 's'}` : 'While you were away'}
        </Title>
        <Text style={styles.duration}>{fmtDuration(a.to - a.from, c)}</Text>
      </View>
      <Text style={styles.span}>{`${stamp(a.from)} to ${stamp(a.to)}`}</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {a.pendingDecisions > 0 && (
          <Pressable
            onPress={() => {
              store.dismissAway()
              onGo?.('home')
            }}
            accessibilityRole="link"
            style={styles.waiting}
          >
            <View style={styles.dot} />
            <Text style={styles.waitingText}>{`${a.pendingDecisions} decision${a.pendingDecisions === 1 ? '' : 's'} waiting on Home`}</Text>
            <Text style={styles.waitingLink}>Home</Text>
            <Icon name="chevronRight" size={13} color={colors.accent} strokeWidth={2} />
          </Pressable>
        )}

        <Heading title="Jobs" note={a.jobs.length ? `${a.jobs.length} back` : 'none back'} />
        {a.jobs.map((j, i) => (
          <View key={i} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.label}>{j.name}</Text>
              <Text style={styles.hint}>
                {`${j.crew} · `}
                <Text style={{ color: OUTCOME[j.outcome].color, fontFamily: fonts.text600 }}>{OUTCOME[j.outcome].text}</Text>
              </Text>
            </View>
            <Text style={styles.value}>{gains(j) ? rich(gains(j), 14) : <Text style={styles.muted}>nothing</Text>}</Text>
          </View>
        ))}

        <Heading title="Money" note={fmtDuration(a.to - a.from, c)} />
        <Line label="Businesses earned" hint="into the vault" value={`+${d}${fmt(a.racketsEarned)}`} color={colors.dirty} />
        {a.wagesPaid > 0 && <Line label="Wages" value={`−${d}${fmt(a.wagesPaid)}`} plain />}
        {a.wagesShort > 0 && <Line label="Wages short" hint="unpaid" value={`${d}${fmt(a.wagesShort)}`} color={colors.bad} />}
        {a.upkeepPaid > 0 && <Line label="Upkeep" value={`−${d}${fmt(a.upkeepPaid)}`} plain />}
        {a.upkeepShort > 0 && <Line label="Upkeep short" hint="premises lost condition" value={`${d}${fmt(a.upkeepShort)}`} color={colors.bad} />}
        {a.tributeLost > 0 && <Line label="Tribute" value={`−${d}${fmt(a.tributeLost)}`} plain />}
        <Line label="Seized" hint={a.seized > 0 ? 'in a raid' : `no raids below ${glyph.heat}${c.heat.raidThreshold}`} value={a.seized > 0 ? `−${d}${fmt(a.seized)}` : 'none'} color={a.seized > 0 ? colors.bad : colors.muted} />
        {a.fronts.map((f) => (
          <Line key={f.id} label={f.name} hint={`washed ${d}${fmt(f.dirty)}`} value={`+${cl}${fmt(f.clean)}`} color={colors.clean} />
        ))}
        <View style={styles.totals}>
          <Line label="Net after costs" value={`${net >= 0 ? '+' : '−'}${d}${fmt(Math.abs(net))}`} color={net >= 0 ? colors.dirty : colors.bad} strong />
          <Line label="Laundered" value={`+${cl}${fmt(washed)}`} color={colors.clean} strong />
          <View style={styles.doubleRule} />
        </View>
        {a.lostToCap > 0 && <Strip tone="warn">{`Lost to a full vault: ${d}${fmt(a.lostToCap)}`}</Strip>}
        {a.vaultFull && <Strip tone="warn">The vault is full. Collect it to get income moving again.</Strip>}

        <View style={styles.tiles}>
          <Tile label="Influence" value={`+${glyph.influence}${fmt(a.influenceEarned)}`} color={colors.influence} />
          <Tile label="Heat" value={`${glyph.heat}${Math.round(a.heatFrom)} → ${Math.round(a.heatTo)}`} color={heatColor} />
          <Tile label="Gold" value={`+${glyph.gold}${fmt(a.goldGranted)}`} color={colors.gold} />
        </View>
        {(a.packsMade > 0 || a.packsSold > 0 || a.packsLost > 0) && (
          <View style={styles.tiles}>
            <Tile label="Packs made" value={`${glyph.packs}${fmt(a.packsMade)}`} color={colors.packs} />
            <Tile label="Sold" value={`${glyph.packs}${fmt(a.packsSold)}`} color={colors.packs} />
            <Tile label="Wasted" value={`${glyph.packs}${fmt(a.packsLost)}`} color={a.packsLost >= 1 ? colors.warn : colors.packs} />
          </View>
        )}

        {notes.length > 0 && (
          <>
            <Heading title="Elsewhere" />
            {notes.map(({ e, line }, i) => (
              <View key={i} style={[styles.note, i > 0 && styles.noteRule]}>
                <Text style={styles.time}>{fmtClock(e.t, s.createdAt, c).split(' · ')[1]}</Text>
                <Text style={[styles.noteText, line.color ? { color: line.color } : null]}>{rich(line.text, 13.5)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <Btn kind="primary" title="Got it" onPress={store.dismissAway} />
    </ModalPanel>
  )
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingText}>{title}</Text>
      <View style={styles.headingRule} />
      {note ? <Text style={styles.muted}>{note}</Text> : null}
    </View>
  )
}

function Line({ label, hint, value, color, plain, strong }: { label: string; hint?: string; value: string; color?: string; plain?: boolean; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.label, strong && styles.strong]}>
        {label}
        {hint ? <Text style={styles.hint}>{'  '}{rich(hint, 12)}</Text> : null}
      </Text>
      <Text style={[styles.value, strong && styles.valueStrong, color ? { color } : null]}>{rich(value, strong ? 17 : 14.5, { plain })}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { maxHeight: '94%', gap: 8 },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  title: { flexShrink: 1 },
  duration: { fontFamily: fonts.text600, fontSize: 17, color: colors.text },
  span: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted, marginTop: -4 },
  scroll: { flexGrow: 0 },
  content: { gap: 8, paddingBottom: 4 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, marginTop: 4, borderWidth: 1, borderColor: colors.rule, borderRadius: 4, backgroundColor: '#221c12' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dot },
  waitingText: { flex: 1, fontFamily: fonts.text600, fontSize: 14, color: colors.text },
  waitingLink: { fontFamily: fonts.text600, fontSize: 13, color: colors.accent },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  headingText: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.accent },
  headingRule: { flex: 1, height: 1, backgroundColor: colors.border },
  muted: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  rowLeft: { flexShrink: 1, gap: 1 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 28 },
  label: { flexShrink: 1, fontFamily: fonts.text500, fontSize: 14, color: colors.text },
  strong: { fontFamily: fonts.text600 },
  hint: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  value: { fontFamily: fonts.text600, fontSize: 14.5, color: colors.text, fontVariant: ['tabular-nums'] },
  valueStrong: { fontSize: 17 },
  totals: { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 6, marginTop: 2, gap: 2 },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginTop: 4 },
  tiles: { flexDirection: 'row', gap: 8 },
  note: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  noteRule: { borderTopWidth: 1, borderTopColor: colors.cardAlt },
  time: { width: 38, fontFamily: fonts.text400, fontSize: 12.5, color: colors.faint, paddingTop: 1 },
  noteText: { flex: 1, fontFamily: fonts.text400, fontSize: 13.5, lineHeight: 19, color: colors.text },
})

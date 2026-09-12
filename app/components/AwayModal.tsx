import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import type { AwayJob, AwaySummary } from '../away'
import { describeEvent } from '../eventText'
import { fmt, fmtDuration } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, colors, Divider, glyph, Row, T } from './ui'

const OUTCOME = {
  full: { text: 'clean job', color: colors.good },
  partial: { text: 'got some of it', color: colors.warn },
  fail: { text: 'went wrong', color: colors.heat },
} as const

function gains(j: AwayJob): string {
  const parts = [
    j.dirty ? `+${glyph.dirty}${fmt(j.dirty)}` : '',
    j.influence ? `+${glyph.influence}${fmt(j.influence)}` : '',
    j.rep ? `+${glyph.rep}${fmt(j.rep)}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join('  ') : 'nothing'
}

// Shown once the store has caught up a gap long enough to count as being away (ADR 0023).
export function AwayModal({ summary: a, game }: { summary: AwaySummary; game: Snapshot }) {
  const { state: s, config: c } = game
  const d = glyph.dirty
  const cl = glyph.clean
  const notes = a.events.map((e) => describeEvent(e, s, c)).filter((line) => !line.quiet)
  const heatColor = a.heatTo >= c.heat.raidThreshold ? colors.heat : a.heatTo >= c.heat.inspectThreshold ? colors.warn : undefined
  return (
    <Modal transparent animationType="fade" visible onRequestClose={store.dismissAway}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <T bold style={styles.title}>
            While you were away
          </T>
          <T small muted>
            {fmtDuration(a.to - a.from, c)}
          </T>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <T small style={styles.heading}>
              Jobs
            </T>
            {a.jobs.length === 0 ? (
              <T small muted>
                No jobs finished.
              </T>
            ) : (
              a.jobs.map((j, i) => (
                <View key={i} style={styles.job}>
                  <View style={styles.jobLeft}>
                    <T>{j.name}</T>
                    <T small muted>
                      {j.crew} ·{' '}
                      <T small color={OUTCOME[j.outcome].color}>
                        {OUTCOME[j.outcome].text}
                      </T>
                    </T>
                  </View>
                  <T style={styles.gains}>{gains(j)}</T>
                </View>
              ))
            )}
            <Divider />
            <T small style={styles.heading}>
              Money
            </T>
            <Row
              label="Rackets → vault"
              hint={a.lostToCap > 0 ? `${d}${fmt(a.lostToCap)} lost to a full vault` : undefined}
              value={`+${d}${fmt(a.racketsEarned)}`}
              color={colors.dirty}
            />
            {a.fronts.map((f) => (
              <Row key={f.id} label={`${f.name} laundered`} value={`${d}${fmt(f.dirty)} → ${cl}${fmt(f.clean)}`} color={colors.clean} />
            ))}
            <Row label="Clean earned" value={`+${cl}${fmt(a.cleanEarned)}`} color={colors.clean} />
            {a.wagesPaid > 0 && <Row label="Wages paid" value={`−${d}${fmt(a.wagesPaid)}`} />}
            {a.wagesShort > 0 && <Row label="Wages short" value={`${d}${fmt(a.wagesShort)} unpaid`} color={colors.heat} />}
            {a.tributeLost > 0 && <Row label="Tribute skimmed" value={`−${d}${fmt(a.tributeLost)}`} />}
            {a.seized > 0 && <Row label="Seized in a raid" value={`−${d}${fmt(a.seized)}`} color={colors.heat} />}
            {a.influenceEarned > 0 && (
              <Row label="Influence" value={`+${glyph.influence}${fmt(a.influenceEarned)}`} color={colors.influence} />
            )}
            <Row label="Heat" value={`${Math.round(a.heatFrom)} → ${Math.round(a.heatTo)}`} color={heatColor} />
            {a.vaultFull && (
              <T small color={colors.warn}>
                The vault is full. Collect it to get income moving again.
              </T>
            )}
            {notes.length > 0 && (
              <>
                <Divider />
                <T small style={styles.heading}>
                  Elsewhere
                </T>
                {notes.map((line, i) => (
                  <T key={i} small color={line.color}>
                    {line.text}
                  </T>
                ))}
              </>
            )}
          </ScrollView>
          <Btn kind="primary" title="Got it" onPress={store.dismissAway} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', padding: 16 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    maxHeight: '85%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  title: { fontSize: 18, color: colors.accent },
  scroll: { flexGrow: 0 },
  content: { gap: 6, paddingBottom: 4 },
  heading: { color: colors.accent, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  job: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  jobLeft: { flexShrink: 1 },
  gains: { fontWeight: '600', fontVariant: ['tabular-nums'] },
})

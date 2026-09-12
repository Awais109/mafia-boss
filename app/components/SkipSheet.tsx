import { useState } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { skipCost } from '../../engine'
import { fmt, fmtDuration } from '../format'
import { store, type Snapshot } from '../store'
import { Btn, BtnRow, colors, glyph, Row, T } from './ui'

// Skip ahead (ADR 0034): pay bars and let the hours pass now. The estimates read `derive` at
// today's rates; the skip itself runs the ordinary catch-up, so raids, Tolya and every roll can
// happen while it plays out.
export function SkipSheet({ game, onClose }: { game: Snapshot; onClose: () => void }) {
  const { state: s, derived: d, config: c, now } = game
  const choices = c.gold.skipChoices
  const [hours, setHours] = useState(choices[0])
  const cost = skipCost(c, hours)
  const sup = d.supply

  const vaultAfter = Math.min(d.vaultCap, s.vault + d.yieldPerHr * hours)
  const laundered = d.perFront.reduce((sum, f) => {
    const buffer = s.fronts.find((x) => x.id === f.id)?.buffer ?? 0
    return sum + Math.min(buffer, f.throughput * hours) * f.rate
  }, 0)
  const end = now + hours * c.time.hourMs
  const finishing = s.ops.filter((op) => op.completesAt <= end).length
  const stockAfter = Math.max(0, Math.min(sup.cap, sup.stock + (sup.madePerHr - sup.demandPerHr) * hours))
  const warnings = [
    s.vault >= d.vaultCap - 1e-6 ? 'The vault is full: collect first, or the skip earns nothing.' : '',
    s.heat >= c.heat.raidThreshold ? `Heat is ${Math.round(s.heat)}: raids can roll while you skip.` : '',
    sup.hoursToEmpty < hours ? `Cigarettes run out in ${fmtDuration(sup.hoursToEmpty * c.time.hourMs, c)}, before the skip ends.` : '',
  ].filter(Boolean)

  const skip = () => {
    if (!store.dispatch({ type: 'SKIP_TIME', hours })) onClose()
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <T bold style={styles.title}>
            Skip ahead
          </T>
          <T small muted>
            {`Each bar buys ${fmt(c.gold.hoursPerBar)} hour${c.gold.hoursPerBar === 1 ? '' : 's'}. Everything that would happen while you wait still happens: income, laundering, jobs, heat, Tolya, raids.`}
          </T>
          <BtnRow>
            {choices.map((h) => (
              <Btn
                key={h}
                small
                kind={h === hours ? 'primary' : 'ghost'}
                title={`${h}h · ${glyph.gold}${skipCost(c, h)}`}
                disabled={s.gold < skipCost(c, h)}
                onPress={() => setHours(h)}
              />
            ))}
          </BtnRow>
          <T small style={styles.heading}>
            Roughly, after the skip
          </T>
          <Row label="Vault" value={`${glyph.dirty}${fmt(vaultAfter)} / ${fmt(d.vaultCap)}`} color={colors.dirty} />
          <Row label="Laundered" value={`+${glyph.clean}${fmt(laundered)}`} color={colors.clean} />
          <Row label="Jobs finishing" value={`${finishing} of ${s.ops.length}`} />
          <Row label="Cigarettes" value={`${glyph.packs}${fmt(stockAfter)} / ${fmt(sup.cap)}`} color={colors.packs} />
          {warnings.map((w) => (
            <T key={w} small color={colors.warn}>
              {w}
            </T>
          ))}
          <BtnRow>
            <Btn kind="primary" title={`Skip ${hours}h for ${glyph.gold}${cost}`} disabled={s.gold < cost} onPress={skip} />
            <Btn kind="ghost" title="Cancel" onPress={onClose} />
          </BtnRow>
          <T small color={colors.faint}>
            {`You have ${glyph.gold}${fmt(s.gold)}. Estimates use today's rates; the skip plays out hour by hour.`}
          </T>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  title: { fontSize: 18, color: colors.gold },
  heading: { color: colors.accent, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
})

import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { skipCost } from '../../engine'
import { fmt, fmtDuration } from '../format'
import { store, type Snapshot } from '../store'
import { fonts } from '../theme'
import { Sheet } from './Modal'
import { Btn, colors, glyph, Item, List, rich, Strip, Title } from './ui'

// Skip ahead (ADR 0034; design: Pop-ups · Skip ahead): pay bars and let the hours pass now. The estimates
// read `derive` at today's rates; the skip itself runs the ordinary catch-up, so raids, Tolya and every roll
// can happen while it plays out.
export function SkipSheet({ game, onClose }: { game: Snapshot; onClose: () => void }) {
  const { state: s, derived: d, config: c, now } = game
  const choices = c.gold.skipChoices
  const [hours, setHours] = useState(choices.find((h) => skipCost(c, h) <= s.gold) ?? choices[0])
  const cost = skipCost(c, hours)
  const sup = d.supply
  const dur = (h: number) => fmtDuration(h * c.time.hourMs, c)

  const fillsIn = d.yieldPerHr > 0 ? (d.vaultCap - s.vault) / d.yieldPerHr : Infinity
  const vaultAfter = Math.min(d.vaultCap, s.vault + d.yieldPerHr * hours)
  const lost = Math.max(0, s.vault + d.yieldPerHr * hours - d.vaultCap)
  const laundered = d.perFront.reduce((sum, f) => {
    const buffer = s.fronts.find((x) => x.id === f.id)?.buffer ?? 0
    return sum + Math.min(buffer, f.throughput * hours) * f.rate
  }, 0)
  const end = now + hours * c.time.hourMs
  const finishing = s.ops.filter((op) => op.completesAt <= end).length
  const stockAfter = Math.max(0, Math.min(sup.cap, sup.stock + (sup.madePerHr - sup.demandPerHr) * hours))
  const runsOut = sup.hoursToEmpty < hours
  const warnings = [
    fillsIn <= 0 ? 'Your vault is full: collect first, or the skip earns nothing.' : fillsIn < hours ? `Your vault fills in ${dur(fillsIn)}: collect first.` : '',
    s.heat >= c.heat.raidThreshold ? `Heat is ${Math.round(s.heat)}: raids can roll while you skip.` : '',
    runsOut ? `Cigarettes run out during the skip, at ${dur(sup.hoursToEmpty)}.` : '',
  ].filter(Boolean)

  const skip = () => {
    if (!store.dispatch({ type: 'SKIP_TIME', hours })) onClose()
  }

  return (
    <Sheet onRequestClose={onClose}>
      <View style={styles.head}>
        <Title size={24} weight={800}>
          Skip ahead
        </Title>
        <Text style={styles.have}>
          {'you have '}
          <Text style={styles.gold}>{rich(`${glyph.gold}${fmt(s.gold)}`, 14)}</Text>
        </Text>
      </View>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="How long to skip">
        {choices.map((h) => {
          const on = h === hours
          const price = skipCost(c, h)
          return (
            <Pressable
              key={h}
              onPress={() => setHours(h)}
              disabled={s.gold < price}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: s.gold < price }}
              style={[styles.choice, on && styles.choiceOn, s.gold < price && styles.off]}
            >
              <Text style={styles.choiceHours}>{`${h}h`}</Text>
              <Text style={styles.choiceCost}>{rich(`${glyph.gold}${price}`, 12.5)}</Text>
            </Pressable>
          )
        })}
      </View>
      <List style={styles.flush}>
        <Item label="Vault after" value={fillsIn <= 0 ? 'full now' : fillsIn < hours ? `full at ${dur(fillsIn)}` : `${glyph.dirty}${fmt(vaultAfter)} / ${fmt(d.vaultCap)}`} color={fillsIn < hours ? colors.bad : colors.dirty} />
        {lost > 0 && <Item label="Lost to a full vault" value={`−${glyph.dirty}${fmt(lost)}`} color={colors.dirty} />}
        <Item label="Clean laundered" value={`+${glyph.clean}${fmt(laundered)}`} color={colors.clean} />
        <Item label="Jobs finishing" value={`${finishing} of ${s.ops.length}`} />
        <Item label="Cigarettes after" value={runsOut ? `${glyph.packs}0 · out at ${dur(sup.hoursToEmpty)}` : `${glyph.packs}${fmt(stockAfter)} / ${fmt(sup.cap)}`} color={runsOut ? colors.bad : colors.packs} />
      </List>
      {warnings.map((w) => (
        <Strip key={w} tone="warn">
          {w}
        </Strip>
      ))}
      <Text style={styles.note}>{`Each bar buys ${fmt(c.gold.hoursPerBar)} hour${c.gold.hoursPerBar === 1 ? '' : 's'}. Everything that would happen while you wait still happens: income, laundering, jobs, heat, Tolya, raids. Estimates use today's rates.`}</Text>
      <View style={styles.actions}>
        <Btn title="Cancel" onPress={onClose} style={styles.grow} />
        <Btn kind="primary" title={`Skip ${hours}h · ${glyph.gold}${cost}`} disabled={s.gold < cost} onPress={skip} style={styles.grow} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  have: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
  gold: { fontFamily: fonts.text600, color: colors.gold },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: colors.control, borderRadius: 4, backgroundColor: colors.cardAlt },
  choiceOn: { borderWidth: 2, borderColor: colors.accent, backgroundColor: '#332a1a' },
  choiceHours: { fontFamily: fonts.text600, fontSize: 16, color: colors.text },
  choiceCost: { fontFamily: fonts.text600, fontSize: 12.5, color: colors.gold },
  flush: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 0, marginHorizontal: -14 },
  note: { fontFamily: fonts.text400, fontSize: 12, lineHeight: 17, color: colors.faint },
  actions: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
  off: { opacity: 0.45 },
})

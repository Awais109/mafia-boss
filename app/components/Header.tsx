import { Pressable, StyleSheet, Text, View } from 'react-native'
import { gameDay } from '../../engine'
import { fmt, fmtClock } from '../format'
import type { Snapshot } from '../store'
import { Bar, colors, glyph } from './ui'

export function Header({ game, onGold }: { game: Snapshot; onGold?: () => void }) {
  const { state: s, derived: d, config: c, now } = game
  const clearedAt = s.stats.actClearedAt[2]
  const nextAct = s.act === 1 ? c.reputation.actThresholds[2] : c.reputation.actThresholds[3]
  // Rep always says what the number is for: the Act II threshold, the Act II clear, or, once
  // that's done, the day it happened. A bare "1,646/540" reads as a target that never fired.
  const rep =
    clearedAt !== undefined
      ? `${fmt(s.reputation)} · Act II cleared on Day ${gameDay(c, s, clearedAt)}`
      : `${fmt(s.reputation)}/${fmt(nextAct)} ${s.act === 1 ? 'to Act II' : 'to clear Act II'}`
  const heatColor = s.heat >= c.heat.raidThreshold ? colors.heat : s.heat >= c.heat.inspectThreshold ? colors.warn : colors.text
  const vaultFull = s.vault >= d.vaultCap - 1e-6

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.title}>SEVGOROD</Text>
        <View style={styles.topRight}>
          <Text style={styles.clock}>
            {fmtClock(now, s.createdAt, c)} · Act {s.act === 1 ? 'I' : 'II'}
            {clearedAt !== undefined ? ' cleared' : ''}
            {s.skippedMs > 0 ? ` · +${fmt(s.skippedMs / c.time.hourMs)}h skipped` : ''}
            {c.meta.name !== 'default' ? ` · ${c.meta.name}` : ''}
          </Text>
          <Pressable onPress={onGold} style={styles.gold} accessibilityRole="button" accessibilityLabel={`${s.gold} gold bars: skip ahead`}>
            <Text style={styles.goldText}>{`${glyph.gold} ${fmt(s.gold)}`}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.resources}>
        <Resource label={vaultFull ? 'Vault FULL' : 'Vault'} value={`${fmt(s.vault)}/${fmt(d.vaultCap)}`} color={vaultFull ? colors.heat : colors.dirty} />
        <Resource label={`${glyph.dirty} Dirty`} value={fmt(s.dirty)} color={colors.dirty} />
        <Resource label={`${glyph.clean} Clean`} value={fmt(s.clean)} color={colors.clean} />
        <Resource label={`${glyph.influence} Infl.`} value={fmt(s.influence)} color={colors.influence} />
        <Resource label={`${glyph.packs} Packs`} value={fmt(s.inventory.cigarettes)} color={s.stockEmpty ? colors.heat : colors.packs} />
        <Resource label={`${glyph.heat} Heat`} value={String(Math.round(s.heat))} color={heatColor} />
      </View>
      <View style={styles.repRow}>
        <Text style={styles.repText}>
          {glyph.rep} Rep {rep}
        </Text>
        <View style={styles.repBar}>
          <Bar value={s.reputation} max={nextAct} color={colors.rep} />
        </View>
      </View>
    </View>
  )
}

function Resource({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.resource}>
      <Text style={styles.resLabel}>{label}</Text>
      <Text style={[styles.resValue, { color }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, gap: 6, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { color: colors.accent, fontWeight: '800', letterSpacing: 3, fontSize: 15 },
  clock: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  gold: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.gold },
  goldText: { color: colors.gold, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  resources: { flexDirection: 'row', justifyContent: 'space-between' },
  resource: { alignItems: 'flex-start' },
  resLabel: { color: colors.faint, fontSize: 10, fontWeight: '600' },
  resValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  repText: { color: colors.rep, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  repBar: { flex: 1 },
})

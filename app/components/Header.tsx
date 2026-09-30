import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ACT_NAME, actProgress } from '../acts'
import { fmt, fmtClock, fmtRate, fmtShort } from '../format'
import type { TabId } from '../screens/types'
import type { Snapshot } from '../store'
import { colors, fonts } from '../theme'
import { empireNow } from './AfterStory'
import { Glyph, type Resource } from './Glyph'
import { rich } from './ui'

// The shell's header (design: Components · The shell). The wordmark, the clock and the gold chip; six cells
// with three significant figures (tap one for the whole figure and its rate; Heat opens the Heat screen);
// and the Rep line, which always says what it's for. After the story the first cell is the empire value, its
// change since the day began and its best (ADR 0052); the vault stays on Home.

type Cell = 'vault' | 'empire' | 'dirty' | 'clean' | 'influence' | 'packs'

export function Header({ game, onGold, go }: { game: Snapshot; onGold?: () => void; go?: (tab: TabId) => void }) {
  const { state: s, derived: d, config: c, now } = game
  const [open, setOpen] = useState<Cell | null>(null)
  const progress = actProgress(s, c)
  const vaultFull = s.vault >= d.vaultCap - 1e-6
  const vaultPct = d.vaultCap > 0 ? Math.min(1, s.vault / d.vaultCap) : 0
  const heat = Math.round(s.heat)
  const heatLine = s.heat >= c.heat.raidThreshold ? 'raids' : s.heat >= c.heat.inspectThreshold ? 'inspections' : null
  const heatColor = s.heat >= c.heat.raidThreshold ? colors.bad : s.heat >= c.heat.inspectThreshold ? colors.warn : colors.text
  const premiumOn = s.act >= c.premium.fromAct
  const toggle = (cell: Cell) => setOpen((o) => (o === cell ? null : cell))
  const empire = progress.cleared ? empireNow(game) : null

  const detail = (() => {
    switch (open) {
      case 'vault':
        return `◆${fmt(s.vault)} of ${fmt(d.vaultCap)} in the vault · +◆${fmtRate(d.yieldPerHr)}`
      case 'empire':
        return empire ? `Empire value ${fmt(empire.value.total)} · ${empire.change >= 0 ? '+' : '−'}${fmt(Math.abs(empire.change))} since yesterday · best ${fmt(empire.best)}` : null
      case 'dirty':
        return `◆${fmt(s.dirty)} Dirty on hand · wages and upkeep −◆${fmtRate(d.wagesPerHr + d.upkeepPerHr)}`
      case 'clean':
        return `●${fmt(s.clean)} Clean · fronts wash up to +●${fmtRate(d.cleanPerHrMax)}${d.legalCleanPerHr > 0 ? ` · legal +●${fmtRate(d.legalCleanPerHr)}` : ''}`
      case 'influence':
        return `✦${fmt(s.influence)} Influence · +✦${fmtRate(d.influencePerHr)}`
      case 'packs':
        return `▮${fmt(s.inventory.cigarettes)} of ${fmt(d.supply.cap)} cigarettes${premiumOn ? ` · ▣${fmt(s.inventory.premium)} of ${fmt(d.premium.cap)} premium` : ''}`
      default:
        return null
    }
  })()

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.wordmark}>SEVGOROD</Text>
        <View style={styles.topRight}>
          <Text style={styles.clock} numberOfLines={1}>
            {fmtClock(now, s.createdAt, c)} · {progress.cleared ? 'cleared' : `Act ${ACT_NAME[s.act]}`}
            {s.skippedMs > 0 ? ` · +${fmt(s.skippedMs / c.time.hourMs)}h` : ''}
            {c.meta.name !== 'default' ? ` · ${c.meta.name}` : ''}
          </Text>
          <Pressable onPress={onGold} style={styles.goldHit} accessibilityRole="button" accessibilityLabel={`Gold ${s.gold}: skip ahead`}>
            <View style={styles.goldChip}>
              <Glyph kind="gold" size={13} />
              <Text style={styles.goldText}>{fmt(s.gold)}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.cells}>
        {empire ? (
          <Pressable style={[styles.cell, styles.vaultCell, styles.empireCell]} onPress={() => toggle('empire')} accessibilityLabel={`Empire value ${fmt(empire.value.total)}, best ${fmt(empire.best)}`}>
            <View style={styles.vaultLabel}>
              <Text style={styles.cellLabel}>Empire</Text>
              <Text style={[styles.cellLabel, { color: empire.change >= 0 ? colors.good : colors.bad }]}>{`${empire.change >= 0 ? '+' : '−'}${Math.abs(empire.pct * 100).toFixed(1)}%`}</Text>
            </View>
            <Text style={styles.cellValue} numberOfLines={1}>
              {fmtShort(empire.value.total)}
            </Text>
            <Text style={styles.empireBest}>{`best ${fmtShort(empire.best)}`}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.cell, styles.vaultCell]} onPress={() => toggle('vault')} accessibilityLabel={`Vault ${fmt(s.vault)} of ${fmt(d.vaultCap)}`}>
            <View style={styles.vaultLabel}>
              <Text style={[styles.cellLabel, vaultFull && { color: colors.bad }]}>{vaultFull ? 'Vault full' : 'Vault'}</Text>
              {!vaultFull && <Text style={styles.cellLabel}>{Math.round(vaultPct * 100)}%</Text>}
            </View>
            <Text style={[styles.cellValue, { color: vaultFull ? colors.bad : colors.text }]} numberOfLines={1}>
              {fmtShort(s.vault)}
              <Text style={styles.cellOf}>/{fmtShort(d.vaultCap)}</Text>
            </Text>
            <View style={styles.vaultTrack}>
              <View style={[styles.vaultFill, { width: `${vaultPct * 100}%`, backgroundColor: vaultFull ? colors.bad : colors.dirty }]} />
            </View>
          </Pressable>
        )}
        <ResCell kind="dirty" label="Dirty" value={fmtShort(s.dirty)} onPress={() => toggle('dirty')} />
        <ResCell kind="clean" label="Clean" value={fmtShort(s.clean)} onPress={() => toggle('clean')} />
        <ResCell kind="influence" label="Infl." value={fmtShort(s.influence)} onPress={() => toggle('influence')} />
        {premiumOn ? (
          // From Act IV the cell holds two stocks side by side, each glyph over its figure; no label fits.
          <Pressable
            style={[styles.cell, styles.stockCell]}
            onPress={() => toggle('packs')}
            accessibilityLabel={`Packs ${fmt(s.inventory.cigarettes)}, premium ${fmt(s.inventory.premium)}`}
          >
            <View style={styles.stock}>
              <Glyph kind="packs" size={9} />
              <Text style={[styles.stockValue, { color: s.stockEmpty ? colors.bad : colors.packs }]} numberOfLines={1}>
                {fmtShort(s.inventory.cigarettes)}
              </Text>
            </View>
            <View style={styles.stock}>
              <Glyph kind="premium" size={9} />
              <Text style={[styles.stockValue, { color: s.premiumEmpty ? colors.bad : colors.premium }]} numberOfLines={1}>
                {fmtShort(s.inventory.premium)}
              </Text>
            </View>
          </Pressable>
        ) : (
          <Pressable style={styles.cell} onPress={() => toggle('packs')} accessibilityLabel={`Packs ${fmt(s.inventory.cigarettes)}`}>
            <View style={styles.cellHead}>
              <Glyph kind="packs" size={9} />
              <Text style={styles.cellLabel}>Packs</Text>
            </View>
            <Text style={[styles.cellValue, { color: s.stockEmpty ? colors.bad : colors.packs }]} numberOfLines={1}>
              {fmtShort(s.inventory.cigarettes)}
            </Text>
            {s.stockEmpty && <Text style={[styles.cellSub, { color: colors.bad }]}>out</Text>}
          </Pressable>
        )}
        <Pressable style={styles.cell} onPress={() => go?.('heat')} accessibilityLabel={`Heat ${heat}`}>
          <View style={styles.cellHead}>
            <Glyph kind="heat" size={9} />
            <Text style={styles.cellLabel}>Heat</Text>
          </View>
          <Text style={[styles.cellValue, { color: heatColor }]}>{heat}</Text>
          {heatLine && <Text style={[styles.cellSub, { color: heatColor }]}>{heatLine}</Text>}
        </Pressable>
      </View>

      {detail && (
        <Pressable style={styles.detail} onPress={() => setOpen(null)}>
          <Text style={styles.detailText}>{rich(detail, 13)}</Text>
        </Pressable>
      )}

      <View style={styles.repRow}>
        <View style={styles.repLine}>
          <View style={styles.repLeft}>
            <Glyph kind="rep" size={12} />
            <Text style={styles.repText}>Rep {fmt(s.reputation)}</Text>
          </View>
          <Text style={styles.repNote} numberOfLines={1}>
            {progress.note}
          </Text>
        </View>
        <RepBar progress={progress} />
      </View>
    </View>
  )
}

function ResCell({ kind, label, value, onPress }: { kind: Resource; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.cell} onPress={onPress} accessibilityLabel={`${label} ${value}`}>
      <View style={styles.cellHead}>
        <Glyph kind={kind} size={9} />
        <Text style={styles.cellLabel}>{label}</Text>
      </View>
      <Text style={[styles.cellValue, { color: colors[kind] }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  )
}

// Steps for the opening and Act I's goals; two bars in Act VI (the Holding, the Empire); one bar otherwise.
function RepBar({ progress }: { progress: ReturnType<typeof actProgress> }) {
  if (progress.split) {
    return (
      <View style={styles.splitBars}>
        {progress.split.map((v, i) => (
          <View key={i} style={[styles.repTrack, { flex: i === 0 ? 3 : 1 }]}>
            <View style={[styles.repFill, { width: `${Math.min(1, v) * 100}%`, backgroundColor: i === 0 ? colors.good : colors.dirty }]} />
          </View>
        ))}
      </View>
    )
  }
  if (progress.segments) {
    return (
      <View style={styles.segments}>
        {Array.from({ length: progress.segments }, (_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i < progress.value ? colors.rep : colors.border }]} />
        ))}
      </View>
    )
  }
  const ratio = progress.max > 0 ? Math.min(1, progress.value / progress.max) : 0
  return (
    <View style={styles.repTrack}>
      <View style={[styles.repFill, { width: `${ratio * 100}%`, backgroundColor: colors.rep }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.shell, borderBottomWidth: 1, borderBottomColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingLeft: 16, paddingRight: 8 },
  wordmark: { fontFamily: fonts.display800, fontSize: 19, letterSpacing: 6.4, color: colors.accent },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  clock: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted, flexShrink: 1 },
  goldHit: { height: 44, minWidth: 44, paddingHorizontal: 4, justifyContent: 'center' },
  goldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#5c4b25',
    borderRadius: 14,
    backgroundColor: '#241d10',
  },
  goldText: { fontFamily: fonts.text600, fontSize: 14, color: colors.gold, fontVariant: ['tabular-nums'] },
  cells: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider },
  cell: { flex: 1, height: 56, justifyContent: 'center', gap: 4, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: colors.divider },
  vaultCell: { flex: 2, paddingLeft: 16, paddingRight: 12, borderLeftWidth: 0 },
  vaultLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  empireCell: { gap: 2 },
  empireBest: { fontFamily: fonts.text400, fontSize: 9.5, lineHeight: 11, color: colors.faint },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cellLabel: { fontFamily: fonts.text400, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  cellValue: { fontFamily: fonts.text600, fontSize: 16, lineHeight: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  cellOf: { fontFamily: fonts.text500, fontSize: 11.5, color: colors.faint },
  cellSub: { fontFamily: fonts.text400, fontSize: 9.5, marginTop: -3 },
  stockCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, paddingLeft: 6 },
  stock: { gap: 5, flexShrink: 1 },
  stockValue: { fontFamily: fonts.text600, fontSize: 15, lineHeight: 17, fontVariant: ['tabular-nums'] },
  vaultTrack: { height: 3, borderRadius: 1, backgroundColor: colors.border, overflow: 'hidden' },
  vaultFill: { height: 3 },
  detail: { borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10 },
  detailText: { fontFamily: fonts.text400, fontSize: 13, color: colors.text },
  repRow: { gap: 7, paddingTop: 9, paddingBottom: 11, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  repLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  repLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  repText: { fontFamily: fonts.text600, fontSize: 12.5, color: colors.rep, fontVariant: ['tabular-nums'] },
  repNote: { fontFamily: fonts.text400, fontSize: 12.5, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  repTrack: { height: 4, borderRadius: 1, backgroundColor: colors.border, overflow: 'hidden' },
  repFill: { height: 4 },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 4, borderRadius: 1 },
  splitBars: { flexDirection: 'row', gap: 6 },
})

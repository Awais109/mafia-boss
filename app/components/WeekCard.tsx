import { StyleSheet, Text, View } from 'react-native'
import { fmt } from '../format'
import type { LedgerView } from '../ledger'
import { fonts } from '../theme'
import { Glyph } from './Glyph'
import { colors } from './ui'

const WEEK = 7

type Line = { key: keyof Pick<LedgerView, 'dirtyIn' | 'costs' | 'cleanIn' | 'cleanOut'>; kind: 'dirty' | 'clean'; label: string; color?: string }
const LINES: Line[] = [
  { key: 'dirtyIn', kind: 'dirty', label: 'in', color: colors.dirty },
  { key: 'costs', kind: 'dirty', label: 'costs' },
  { key: 'cleanIn', kind: 'clean', label: 'in', color: colors.clean },
  { key: 'cleanOut', kind: 'clean', label: 'spent' },
]

// Home's "This week" (ADR 0026; design: Home · This week). In the first week, a column per day with the
// days still to come dotted; after that, a row per day for the last seven.
export function WeekCard({ days, today }: { days: LedgerView[]; today: number }) {
  const rows = days.slice(-WEEK)
  if (today <= WEEK) {
    return (
      <View style={styles.card}>
        <View style={styles.gridRow}>
          <Text style={styles.gridHead} />
          {Array.from({ length: WEEK }, (_, i) => (
            <Text key={i} style={[styles.cell, styles.dayHead, i + 1 === today && styles.todayHead]}>{`D${i + 1}`}</Text>
          ))}
        </View>
        {LINES.map((line) => (
          <View key={line.key + line.kind} style={styles.gridRow}>
            <LineLabel line={line} />
            {Array.from({ length: WEEK }, (_, i) => {
              const row = rows.find((r) => r.day === i + 1)
              return row ? (
                <Text key={i} style={[styles.cell, { color: row[line.key] ? (line.color ?? colors.text) : colors.faint }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmt(row[line.key])}
                </Text>
              ) : (
                <Text key={i} style={[styles.cell, styles.dot]}>
                  ·
                </Text>
              )
            })}
          </View>
        ))}
      </View>
    )
  }
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.rowDay} />
        {LINES.map((line) => (
          <View key={line.key + line.kind} style={styles.colHead}>
            <Glyph kind={line.kind} size={9} />
            <Text style={styles.colHeadText}>{line.label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.day} style={styles.row}>
          <Text style={[styles.rowDay, row.today && styles.todayHead]}>{`D${row.day}`}</Text>
          {LINES.map((line) => (
            <Text key={line.key + line.kind} style={[styles.num, { color: row[line.key] ? (line.color ?? colors.text) : colors.faint }]} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(row[line.key])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function LineLabel({ line }: { line: Line }) {
  return (
    <View style={styles.gridHead}>
      <Glyph kind={line.kind} size={9} />
      <Text style={styles.lineLabel}>{line.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.divider, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 14, gap: 9 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridHead: { width: 62, flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineLabel: { fontFamily: fonts.text400, fontSize: 13, color: colors.muted },
  cell: { flex: 1, textAlign: 'right', fontFamily: fonts.text400, fontSize: 13, fontVariant: ['tabular-nums'], color: colors.text },
  dayHead: { fontSize: 11, color: colors.faint },
  todayHead: { fontFamily: fonts.text600, color: colors.accent },
  dot: { color: '#5d5446' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowDay: { width: 34, fontFamily: fonts.text400, fontSize: 12, color: colors.faint },
  colHead: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  colHeadText: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
  num: { flex: 1, textAlign: 'right', fontFamily: fonts.text400, fontSize: 13, fontVariant: ['tabular-nums'] },
})

import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg'
import { fonts, paper, paperInk } from '../theme'
import { Glyph, Icon, type Resource } from './Glyph'
import { rich } from './ui'

// Lyosha's notebook (design: How it works, the Map): squared paper with a red margin, headings in his hand,
// ink for what you know and pencil for what's still ahead, and red pencil for your own marks.

const GRID = 13
const PENCIL_RULE = 'rgba(107, 103, 95, 0.5)'

// A sheet of squared paper; its content sits inside the margin.
export function Paper({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.paper, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="squared" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <Path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} stroke="rgba(118, 150, 176, 0.28)" strokeWidth={1} fill="none" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#squared)" />
      </Svg>
      <View style={styles.margin} />
      <View style={styles.inside}>{children}</View>
    </View>
  )
}

// The page's title in his hand, with a pencilled note on the right.
export function PaperTitle({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.titleLine}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.titleNote}>{note}</Text> : null}
    </View>
  )
}

// Running text in ink; `pencil` greys it for what's not reached yet.
export function Ink({ children, pencil, size = 15 }: { children: string; pencil?: boolean; size?: number }) {
  return <Text style={[styles.ink, { fontSize: size, lineHeight: size * 1.55 }, pencil && styles.pencil]}>{rich(children, size, { ink: true })}</Text>
}

export function PaperCaps({ children }: { children: string }) {
  return <Text style={styles.caps}>{children}</Text>
}

// A numbered section with a heading in his hand that folds; in pencil until its act.
export function PaperSection({ n, title, open, onToggle, pencil, note, children }: {
  n: number
  title: string
  open: boolean
  onToggle: () => void
  pencil?: boolean
  note?: string
  children: ReactNode
}) {
  const ink = pencil ? paper.pencil : paper.fountain
  return (
    <View style={styles.section}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={[styles.sectionHead, { borderBottomColor: ink }, pencil && styles.dashed]}>
        <Text style={[styles.sectionTitle, { color: ink }]}>
          <Text style={styles.sectionNo}>{`${n}. `}</Text>
          {title}
        </Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={ink} strokeWidth={2} />
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  )
}

export type PaperRow = { key: string; glyph?: Resource; label: string; value?: string; text?: string; pencil?: string; yours?: boolean }

// A list under a caps heading, each entry between dashed pencil rules: a glyph, a name, a figure on the right,
// and a line under it. `pencil` (the act it opens in) greys an entry; `yours` circles it in red pencil.
export function PaperRows({ title, rows }: { title?: string; rows: PaperRow[] }) {
  return (
    <View>
      {title ? <PaperCaps>{title}</PaperCaps> : null}
      {rows.map((r, i) => (
        <View key={r.key} style={[styles.row, i === rows.length - 1 && styles.rowLast]}>
          <View style={styles.rowHead}>
            {r.glyph ? <Glyph kind={r.glyph} size={12} color={r.pencil ? paper.pencil : paperInk[r.glyph]} /> : null}
            <Text style={[styles.rowLabel, r.pencil ? styles.pencil : null]}>{r.label}</Text>
            {r.yours ? <Text style={styles.yours}>yours</Text> : null}
            {r.pencil ? <Text style={styles.rowPencil}>{`${r.pencil} · not yet`}</Text> : r.value ? <Text style={styles.rowValue}>{rich(r.value, 15, { ink: true })}</Text> : null}
          </View>
          {r.text ? <Text style={[styles.rowText, r.glyph ? styles.indent : null, r.pencil ? styles.pencil : null]}>{rich(r.text, 14, { ink: true })}</Text> : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  paper: { backgroundColor: paper.squared, borderRadius: 2, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  margin: { position: 'absolute', top: 0, bottom: 0, right: 26, width: 1, backgroundColor: 'rgba(206, 96, 96, 0.55)' },
  inside: { gap: 30, paddingTop: 16, paddingBottom: 28, paddingLeft: 16, paddingRight: 40 },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: fonts.hand700, fontSize: 36, lineHeight: 40, color: paper.fountain },
  titleNote: { fontFamily: fonts.hand500, fontSize: 18, color: paper.pencil },
  ink: { fontFamily: fonts.text400, color: paper.ink },
  pencil: { color: paper.pencil },
  caps: { paddingBottom: 6, fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#5a5144' },
  section: { gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, minHeight: 50, paddingBottom: 6, borderBottomWidth: 1.5 },
  dashed: { borderStyle: 'dashed' },
  sectionTitle: { flex: 1, fontFamily: fonts.hand700, fontSize: 32, lineHeight: 34 },
  sectionNo: { color: '#5b6a86' },
  sectionNote: { fontFamily: fonts.text500, fontSize: 12, color: paper.pencil, paddingBottom: 6 },
  sectionBody: { gap: 14 },
  row: { gap: 2, paddingVertical: 9, borderTopWidth: 1, borderStyle: 'dashed', borderColor: PENCIL_RULE },
  rowLast: { borderBottomWidth: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowLabel: { flexShrink: 1, fontFamily: fonts.text600, fontSize: 15, color: paper.ink },
  rowValue: { marginLeft: 'auto', fontFamily: fonts.text600, fontSize: 15, color: paper.ink },
  rowPencil: { marginLeft: 'auto', fontFamily: fonts.text500, fontSize: 12, color: paper.pencil },
  rowText: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: '#3d372e' },
  indent: { paddingLeft: 19 },
  yours: { fontFamily: fonts.hand700, fontSize: 17, lineHeight: 18, color: paper.redPencil, transform: [{ rotate: '-4deg' }] },
})

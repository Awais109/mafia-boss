import { Fragment, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { colors as theme, fonts, textFont } from '../theme'
import { CHAR_RESOURCE, Glyph, type Resource } from './Glyph'

// The ledger kit (design/Sevgorod Screens.html, "Components"): section titles with a hairline rule, cards,
// rows with the label left and the figure right, bars with marks, tags, buttons. Resource amounts written
// with their glyph ("−◆20", "+▲3", "★53") are drawn the design's way wherever text goes through `Rich`:
// an SVG glyph at 0.7 of the text size and the figure in the resource's colour.

export const colors = theme

// Text glyphs are still how strings carry resources; `Rich` turns them into drawn glyphs.
export const glyph = { dirty: '◆', clean: '●', influence: '✦', rep: '★', heat: '▲', packs: '▮', premium: '▣', gold: '▰' } as const

// Heat reads as red text; its glyph keeps the brighter red.
const textColorOf = (r: Resource) => (r === 'heat' ? theme.bad : theme[r])

const AMOUNT = /([+\-−]?)([◆●✦★▲▮▣▰])(\s?)(\d[\d,]*(?:\.\d+)?[KM]?(?:\/h)?)?/g

// A glyph that sits inline in running text, at about 0.7 of the text size.
function InlineGlyph({ kind, size }: { kind: Resource; size: number }) {
  const g = Math.max(8, Math.round(size * 0.7))
  return (
    <View style={{ width: g + 2, height: g, paddingRight: 2 }}>
      <Glyph kind={kind} size={g} />
    </View>
  )
}

// Splits a string on resource amounts and draws each one.
export function rich(text: string, size = 14): ReactNode {
  if (!/[◆●✦★▲▮▣▰]/.test(text)) return text
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(AMOUNT)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const kind = CHAR_RESOURCE[m[2]]
    const figure = `${m[1]}`
    out.push(
      <Text key={k++} style={m[4] ? { color: textColorOf(kind), fontFamily: fonts.text600 } : undefined}>
        {figure}
        <InlineGlyph kind={kind} size={size} />
        {m[4] ?? ''}
      </Text>,
    )
    last = at + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function richChildren(children: ReactNode, size: number): ReactNode {
  if (typeof children === 'string') return rich(children, size)
  if (Array.isArray(children)) {
    return children.map((c, i) => (typeof c === 'string' ? <Fragment key={i}>{rich(c, size)}</Fragment> : c))
  }
  return children
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  )
}

// An uppercase brass title, a hairline rule to the edge, and an optional note or link on the right.
export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.sectionRule} />
        {typeof right === 'string' ? <T small muted>{right}</T> : right}
      </View>
      {children}
    </View>
  )
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'brass' | 'alert' | 'warn' }) {
  return (
    <View
      style={[
        styles.card,
        tone === 'brass' && { borderColor: '#4a3c24' },
        tone === 'warn' && { borderColor: '#5c4b25', backgroundColor: '#221c12' },
        tone === 'alert' && { borderColor: '#6b3127', backgroundColor: '#2a1712' },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// Label (and a hint under it) on the left, the figure on the right in tabular numbers.
export function Row({ label, value, color, hint, strong }: { label: string; value: ReactNode; color?: string; hint?: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {label ? <Text style={[styles.rowLabel, strong && { fontFamily: fonts.text600 }]}>{rich(label, 14)}</Text> : null}
        {hint ? <Text style={styles.rowHint}>{rich(hint, 12)}</Text> : null}
      </View>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.rowValue, color ? { color } : null]}>{rich(String(value), 15)}</Text>
      ) : (
        value
      )}
    </View>
  )
}

// The ledger's own convention: a single brass rule above a total, a double rule below the last one.
export function Totals({ children }: { children: ReactNode }) {
  return (
    <View style={styles.totals}>
      {children}
      <View style={styles.doubleRule} />
    </View>
  )
}

export function T({ children, style, muted, small, bold, color, size, display, caps }: {
  children: ReactNode
  style?: StyleProp<TextStyle>
  muted?: boolean
  small?: boolean
  bold?: boolean
  color?: string
  size?: number
  display?: boolean // the condensed display face, caps
  caps?: boolean
}) {
  const fontSize = size ?? (display ? 20 : small ? 12.5 : 14)
  return (
    <Text
      style={[
        styles.text,
        { fontSize, lineHeight: display ? fontSize * 1.05 : fontSize * 1.42 },
        muted && styles.muted,
        bold && { fontFamily: textFont(600) },
        display && styles.display,
        caps && styles.caps,
        color ? { color } : null,
        style,
      ]}
    >
      {richChildren(children, fontSize)}
    </Text>
  )
}

// Display type: condensed, industrial, caps (names, titles, chapter pages).
export function Title({ children, size = 22, color = theme.text, weight = 800, style }: {
  children: ReactNode
  size?: number
  color?: string
  weight?: 700 | 800 | 900
  style?: StyleProp<TextStyle>
}) {
  const family = weight === 900 ? fonts.display900 : weight === 700 ? fonts.display700 : fonts.display800
  return <Text style={[{ fontFamily: family, fontSize: size, lineHeight: size * 1.02, color, textTransform: 'uppercase', letterSpacing: 0.3 }, style]}>{children}</Text>
}

export function Btn({ title, sub, onPress, disabled, kind = 'normal', small, style }: {
  title: string
  sub?: string // a second, smaller line under the title
  onPress: () => void
  disabled?: boolean
  kind?: 'normal' | 'primary' | 'danger' | 'ghost'
  small?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const textStyle = [
    styles.btnText,
    small && styles.btnTextSmall,
    kind === 'primary' && styles.btnTextPrimary,
    kind === 'danger' && { color: theme.bad },
    kind === 'ghost' && { color: theme.accent },
    disabled && styles.btnTextDisabled,
  ]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        kind === 'primary' && styles.btnPrimary,
        kind === 'danger' && styles.btnDanger,
        kind === 'ghost' && styles.btnGhost,
        disabled && (kind === 'primary' ? styles.btnPrimaryDisabled : styles.btnDisabled),
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
    >
      <Text style={textStyle}>{kind === 'primary' ? title : rich(title, small ? 13.5 : 15)}</Text>
      {sub ? <Text style={[styles.btnSub, kind === 'primary' && { color: '#3a2e18' }]}>{rich(sub, 11.5)}</Text> : null}
    </Pressable>
  )
}

export function BtnRow({ children }: { children: ReactNode }) {
  return <View style={styles.btnRow}>{children}</View>
}

// A thin track with a fill and optional threshold marks.
export function Bar({ value, max, color, marks, thick }: { value: number; max: number; color: string; marks?: number[]; thick?: boolean }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const h = thick ? 8 : 5
  return (
    <View style={[styles.bar, { height: h }]}>
      <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color, height: h }]} />
      {marks?.map((m) => (
        <View key={m} style={[styles.barMark, { left: `${Math.min(100, (m / max) * 100)}%`, height: h + 6, top: -3 }]} />
      ))}
    </View>
  )
}

// Small caps in a hairline box; the colour says what kind of tag it is.
export function Tag({ text, color = theme.muted, dashed }: { text: string; color?: string; dashed?: boolean }) {
  return (
    <View style={[styles.tag, { borderColor: color, backgroundColor: color + '14' }, dashed && { borderStyle: 'dashed' }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  )
}

export function Money({ kind, value, suffix }: { kind: keyof typeof glyph; value: string; suffix?: string }) {
  return (
    <Text style={[styles.money, { color: textColorOf(kind) }]}>
      <InlineGlyph kind={kind} size={15} />
      {value}
      {suffix ? <Text style={styles.muted}>{suffix}</Text> : null}
    </Text>
  )
}

export function Divider() {
  return <View style={styles.divider} />
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  screenContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 30, gap: 26 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 20 },
  sectionTitle: { color: theme.accent, fontSize: 11, fontFamily: fonts.text600, letterSpacing: 1.8, textTransform: 'uppercase', flexShrink: 1 },
  sectionRule: { flexGrow: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: theme.border, minWidth: 12 },
  card: { backgroundColor: theme.card, borderRadius: 6, padding: 14, gap: 10, borderWidth: 1, borderColor: theme.divider },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, minHeight: 24 },
  rowLeft: { flexShrink: 1, gap: 1 },
  rowLabel: { color: theme.text, fontSize: 14, fontFamily: fonts.text400 },
  rowHint: { color: theme.muted, fontSize: 12, fontFamily: fonts.text400 },
  rowValue: { color: theme.text, fontSize: 15, fontFamily: fonts.text600, fontVariant: ['tabular-nums'], textAlign: 'right' },
  totals: { borderTopWidth: 1, borderTopColor: theme.rule, paddingTop: 8, gap: 6 },
  doubleRule: { height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.rule, marginTop: 2 },
  text: { color: theme.text, fontFamily: fonts.text400 },
  muted: { color: theme.muted },
  display: { fontFamily: fonts.display800, textTransform: 'uppercase', letterSpacing: 0.4 },
  caps: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11 },
  btn: {
    backgroundColor: theme.cardAlt,
    borderRadius: 4,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.control,
  },
  btnSmall: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 6 },
  btnPrimary: { backgroundColor: theme.accent, borderColor: theme.accent },
  btnPrimaryDisabled: { backgroundColor: '#5c4d31', borderColor: '#5c4d31' },
  btnDanger: { backgroundColor: '#231511', borderColor: '#6b3127' },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.75 },
  btnText: { color: theme.text, fontSize: 15, fontFamily: fonts.text600, textAlign: 'center' },
  btnTextSmall: { fontSize: 13.5 },
  btnTextPrimary: { color: '#16130f' },
  btnTextDisabled: { color: theme.faint },
  btnSub: { color: theme.muted, fontSize: 11.5, fontFamily: fonts.text400, marginTop: 2, textAlign: 'center' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bar: { backgroundColor: theme.border, borderRadius: 1 },
  barFill: { borderRadius: 1 },
  barMark: { position: 'absolute', width: 2, marginLeft: -1, backgroundColor: theme.text },
  tag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  tagText: { fontSize: 10.5, fontFamily: fonts.text600, letterSpacing: 1, textTransform: 'uppercase' },
  money: { fontSize: 15, fontFamily: fonts.text600, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: theme.divider, marginVertical: 2 },
})

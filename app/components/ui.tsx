import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { colors as theme, fonts, textFont } from '../theme'
import { CHAR_RESOURCE, Glyph, Icon, type IconName, type Resource } from './Glyph'

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
function InlineGlyph({ kind, size, color }: { kind: Resource; size: number; color?: string }) {
  const g = Math.max(8, Math.round(size * 0.7))
  return (
    <View style={{ width: g + 2, height: g, paddingRight: 2 }}>
      <Glyph kind={kind} size={g} color={color} />
    </View>
  )
}

// Splits a string on resource amounts and draws each one. `mono` draws every glyph in one colour (a brass
// button's dark label); `plain` keeps the glyphs' colours but leaves the figures in the text's own (a cost).
// Either way the figures keep the text's colour.
export function rich(text: string, size = 14, opts: { mono?: string; plain?: boolean } = {}): ReactNode {
  const { mono, plain } = opts
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
      <Text key={k++} style={m[4] && !mono && !plain ? { color: textColorOf(kind), fontFamily: fonts.text600 } : undefined}>
        {figure}
        <InlineGlyph kind={kind} size={size} color={mono} />
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

export function Btn({ title, sub, onPress, disabled, kind = 'normal', small, chevron, style }: {
  title: string
  sub?: string // a second, smaller line under the title
  onPress: () => void
  disabled?: boolean
  kind?: 'normal' | 'primary' | 'danger' | 'ghost' | 'outline' // outline: brass text in a hairline box, for "go there"
  small?: boolean
  chevron?: boolean // a › after the title: the button goes somewhere
  style?: StyleProp<ViewStyle>
}) {
  const textStyle = [
    styles.btnText,
    small && styles.btnTextSmall,
    kind === 'primary' && styles.btnTextPrimary,
    kind === 'danger' && { color: theme.bad },
    (kind === 'ghost' || kind === 'outline') && { color: theme.accent },
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
        kind === 'outline' && styles.btnOutline,
        chevron && styles.btnChevron,
        disabled && (kind === 'primary' ? styles.btnPrimaryDisabled : styles.btnDisabled),
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
    >
      <Text style={textStyle}>{rich(title, small ? 13.5 : 15, kind === 'primary' ? { mono: disabled ? theme.faint : '#3a2e18' } : {})}</Text>
      {chevron ? <Icon name="chevronRight" size={14} color={disabled ? theme.faint : theme.accent} strokeWidth={2} /> : null}
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

// A card whose rows run edge to edge, each under a hairline (design: Operation, Money flow, checklists).
export function List({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <View style={[styles.list, style]}>
      {rows.map((row, i) => (
        <View key={row.key ?? i} style={i > 0 ? styles.listRule : undefined}>
          {row}
        </View>
      ))}
    </View>
  )
}

// One row of a List: an optional mark on the left (a Check, an icon), the label with a hint under it, and
// the figure on the right. Tappable when it has onPress.
export function Item({ label, hint, value, color, left, strong, muted, plain, onPress, children }: {
  label: ReactNode
  hint?: ReactNode
  value?: ReactNode
  color?: string
  left?: ReactNode
  strong?: boolean
  muted?: boolean // done rows read quieter
  plain?: boolean // the figure in the text colour, only the glyph coloured (costs)
  onPress?: () => void
  children?: ReactNode // anything under the row, full width (a bar, a note)
}) {
  const body = (
    <>
      <View style={styles.item}>
        {left}
        <View style={styles.itemLeft}>
          <Text style={[styles.rowLabel, strong && { fontFamily: fonts.text600 }, muted && styles.muted]}>{typeof label === 'string' ? rich(label, 14) : label}</Text>
          {hint ? <Text style={styles.rowHint}>{typeof hint === 'string' ? rich(hint, 12) : hint}</Text> : null}
        </View>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text style={[styles.rowValue, color ? { color } : null]}>{rich(String(value), 15, { plain })}</Text>
        ) : (
          value
        )}
      </View>
      {children ? <View style={styles.itemBelow}>{children}</View> : null}
    </>
  )
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.btnPressed}>
      {body}
    </Pressable>
  ) : (
    body
  )
}

// A checklist box: empty, ticked, or the step you're on.
export function Check({ state }: { state: 'todo' | 'done' | 'now' }) {
  return (
    <View style={[styles.check, state === 'done' && styles.checkDone, state === 'now' && styles.checkNow]}>
      {state === 'done' && <Icon name="check" size={12} color={theme.good} strokeWidth={2.4} />}
      {state === 'now' && <View style={styles.checkNowFill} />}
    </View>
  )
}

// The thick boxed bar under a big figure: the vault, a stock.
export function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <View style={styles.meter}>
      <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: color }} />
    </View>
  )
}

// A big figure with its glyph, "of" a cap in faint type: "◆ 72,193 / 164,428".
export function BigFigure({ kind, value, of, size = 30, color }: { kind: Resource; value: string; of?: string; size?: number; color?: string }) {
  return (
    <View style={styles.bigFigure}>
      <Glyph kind={kind} size={Math.round(size * 0.62)} color={color} />
      <Text style={[styles.bigValue, { fontSize: size, color: color ?? textColorOf(kind) }]}>{value}</Text>
      {of ? <Text style={[styles.bigOf, { fontSize: size >= 28 ? 15 : 14 }]}>{`/ ${of}`}</Text> : null}
    </View>
  )
}

// A nested box inside a card: a caps label, a figure, a line under it.
export function Tile({ label, value, sub, color, subColor }: { label: string; value: string; sub?: string; color?: string; subColor?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, color ? { color } : null]}>{rich(value, 16)}</Text>
      {sub ? <Text style={[styles.rowHint, subColor ? { color: subColor } : null]}>{rich(sub, 12)}</Text> : null}
    </View>
  )
}

// A small state label in a box: ready (brass, with a dot), locked (dashed, with a lock), done, failed.
export function Pill({ text, tone = 'ready' }: { text: string; tone?: 'ready' | 'locked' | 'done' | 'failed' | 'plain' }) {
  const color = tone === 'ready' ? theme.accent : tone === 'done' ? theme.good : tone === 'failed' ? theme.bad : tone === 'plain' ? theme.text : theme.faint
  return (
    <View style={[styles.pill, { borderColor: tone === 'ready' ? '#8a6f3f' : tone === 'locked' ? theme.control : color }, tone === 'locked' && { borderStyle: 'dashed' }]}>
      {tone === 'ready' && <View style={[styles.pillDot, { backgroundColor: color }]} />}
      {tone === 'plain' && <View style={[styles.pillDot, { borderWidth: 1, borderColor: color }]} />}
      {tone === 'locked' && <Icon name="lock" size={11} color={color} />}
      {tone === 'done' && <Icon name="check" size={11} color={color} strokeWidth={2.2} />}
      <Text style={[styles.pillText, { color }, tone === 'locked' && { fontFamily: fonts.text400 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  )
}

// A line that needs acting on, as a row: an icon in a tinted square, what's wrong, why, and where to fix it.
export function AlertRow({ icon, title, sub, tone = 'warn', cta, onPress }: {
  icon: Resource | IconName
  title: string
  sub?: string
  tone?: 'warn' | 'bad'
  cta?: string
  onPress?: () => void
}) {
  const color = tone === 'bad' ? theme.bad : theme.warn
  const isResource = icon in CHAR_RESOURCE_BY_NAME
  return (
    <View style={styles.alert}>
      <View style={[styles.alertIcon, { backgroundColor: tone === 'bad' ? '#2a1712' : '#2d2418' }]}>
        {isResource ? <Glyph kind={icon as Resource} size={14} /> : <Icon name={icon as IconName} size={18} color={color} />}
      </View>
      <View style={styles.itemLeft}>
        <Text style={[styles.rowLabel, { fontFamily: fonts.text500 }]}>{rich(title, 14)}</Text>
        {sub ? <Text style={styles.rowHint}>{rich(sub, 12)}</Text> : null}
      </View>
      {cta && onPress ? <Btn small kind="outline" chevron title={cta} onPress={onPress} /> : null}
    </View>
  )
}
const CHAR_RESOURCE_BY_NAME: Record<string, true> = Object.fromEntries(Object.values(CHAR_RESOURCE).map((r) => [r, true]))

// A tinted strip inside a card: something is wrong right now ("Wages ◆84 behind since 07:00").
export function Strip({ children, tone = 'bad' }: { children: string; tone?: 'bad' | 'warn' }) {
  const color = tone === 'bad' ? theme.bad : theme.warn
  return (
    <View style={[styles.strip, { backgroundColor: tone === 'bad' ? '#2a1712' : '#221c12' }]}>
      <Icon name={tone === 'bad' ? 'blocked' : 'warning'} size={15} color={color} />
      <Text style={[styles.stripText, { color }]}>{rich(children, 13)}</Text>
    </View>
  )
}

// A dashed box where something will be: "Nothing yet", "Nothing to collect yet".
export function Empty({ title, sub, center }: { title: string; sub?: string; center?: boolean }) {
  return (
    <View style={[styles.empty, center && styles.emptyCenter]}>
      <Text style={[styles.emptyTitle, center && { color: theme.faint, fontFamily: fonts.text600, fontSize: 15, textAlign: 'center' }]}>{rich(title, 14)}</Text>
      {sub ? <Text style={styles.rowHint}>{rich(sub, 12.5)}</Text> : null}
    </View>
  )
}

// "Log ›" at the end of a section's rule.
export function SectionLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.sectionLink} hitSlop={8}>
      <Text style={styles.sectionLinkText}>{title}</Text>
      <Icon name="chevronRight" size={13} color={theme.link} strokeWidth={2} />
    </Pressable>
  )
}

// Right-hand notes on a section rule: plain, or warn/red when it's the point.
export function Note({ children, color }: { children: string; color?: string }) {
  return <Text style={[styles.note, color ? { color, fontFamily: fonts.text600 } : null]}>{rich(children, 12)}</Text>
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
  rowValue: { color: theme.text, fontSize: 15, fontFamily: fonts.text600, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 0 },
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
  btnOutline: { backgroundColor: 'transparent', borderColor: theme.control },
  btnChevron: { flexDirection: 'row', gap: 4 },
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
  list: { backgroundColor: theme.card, borderRadius: 6, borderWidth: 1, borderColor: theme.divider, paddingVertical: 2 },
  listRule: { borderTopWidth: 1, borderTopColor: theme.cardAlt },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingVertical: 6, paddingHorizontal: 14 },
  itemLeft: { flexGrow: 1, flexShrink: 1, gap: 1 },
  itemBelow: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  check: { width: 18, height: 18, borderWidth: 1.5, borderColor: '#6f6656', borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  checkDone: { borderColor: theme.good, backgroundColor: '#1d2b20' },
  checkNow: { borderColor: theme.accent },
  checkNowFill: { width: 8, height: 8, borderRadius: 1, backgroundColor: theme.accent },
  meter: { height: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 2, backgroundColor: theme.cardAlt, overflow: 'hidden' },
  bigFigure: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  bigValue: { fontFamily: fonts.text600, fontVariant: ['tabular-nums'] },
  bigOf: { fontFamily: fonts.text400, color: theme.faint, alignSelf: 'flex-end', marginBottom: 2 },
  tile: { flex: 1, gap: 2, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: theme.cardAlt, borderRadius: 4 },
  tileLabel: { fontFamily: fonts.text400, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: theme.muted },
  tileValue: { fontFamily: fonts.text600, fontSize: 16, color: theme.text, fontVariant: ['tabular-nums'] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 8, borderWidth: 1, borderRadius: 3, flexShrink: 1 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: fonts.text600, fontSize: 12, flexShrink: 1 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 10, backgroundColor: theme.card, borderRadius: 6, borderWidth: 1, borderColor: theme.divider },
  alertIcon: { width: 34, height: 34, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 4 },
  stripText: { flexShrink: 1, fontFamily: fonts.text400, fontSize: 13 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.control, borderRadius: 6, paddingVertical: 14, paddingHorizontal: 14, gap: 3 },
  emptyCenter: { minHeight: 52, borderRadius: 4, justifyContent: 'center', paddingVertical: 8 },
  emptyTitle: { fontFamily: fonts.text500, fontSize: 14, color: theme.text },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 32 },
  sectionLinkText: { fontFamily: fonts.text600, fontSize: 12, color: theme.link },
  note: { fontFamily: fonts.text400, fontSize: 12, color: theme.muted },
})

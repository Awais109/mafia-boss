import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'

// Prototype UI kit: lists and numbers, no assets (plan §1). Resource colours are the one
// piece of "design" — they carry the Dirty/Clean rule at a glance.

export const colors = {
  bg: '#14161a',
  card: '#1d2026',
  cardAlt: '#252932',
  border: '#2f343e',
  text: '#e8e6e1',
  muted: '#8f96a3',
  faint: '#5d6470',
  dirty: '#d9a441',
  clean: '#5fbf7f',
  influence: '#6fa8dc',
  rep: '#b48ee6',
  heat: '#e0604f',
  warn: '#e8a33d',
  good: '#5fbf7f',
  accent: '#c9a86a',
}

export const glyph = { dirty: '◆', clean: '●', influence: '✦', rep: '★', heat: '▲' } as const

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  )
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Row({ label, value, color, hint }: { label: string; value: ReactNode; color?: string; hint?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
        {hint ? <Text style={styles.faint}>  {hint}</Text> : null}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.rowValue, color ? { color } : null]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  )
}

export function T({ children, style, muted, small, bold, color }: {
  children: ReactNode
  style?: StyleProp<TextStyle>
  muted?: boolean
  small?: boolean
  bold?: boolean
  color?: string
}) {
  return (
    <Text
      style={[
        styles.text,
        muted && styles.muted,
        small && styles.small,
        bold && styles.bold,
        color ? { color } : null,
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function Btn({ title, onPress, disabled, kind = 'normal', small, style }: {
  title: string
  onPress: () => void
  disabled?: boolean
  kind?: 'normal' | 'primary' | 'danger' | 'ghost'
  small?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        kind === 'primary' && styles.btnPrimary,
        kind === 'danger' && styles.btnDanger,
        kind === 'ghost' && styles.btnGhost,
        small && styles.btnSmall,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
    >
      <Text style={[styles.btnText, kind === 'primary' && styles.btnTextPrimary, small && styles.small, disabled && styles.faint]}>
        {title}
      </Text>
    </Pressable>
  )
}

export function BtnRow({ children }: { children: ReactNode }) {
  return <View style={styles.btnRow}>{children}</View>
}

export function Bar({ value, max, color, marks }: { value: number; max: number; color: string; marks?: number[] }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      {marks?.map((m) => (
        <View key={m} style={[styles.barMark, { left: `${(m / max) * 100}%` }]} />
      ))}
    </View>
  )
}

export function Tag({ text, color = colors.muted }: { text: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  )
}

export function Money({ kind, value, suffix }: { kind: keyof typeof glyph; value: string; suffix?: string }) {
  return (
    <Text style={[styles.money, { color: colors[kind] }]}>
      {glyph[kind]} {value}
      {suffix ? <Text style={styles.faint}>{suffix}</Text> : null}
    </Text>
  )
}

export function Divider() {
  return <View style={styles.divider} />
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 12, paddingBottom: 48, gap: 12 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: colors.card, borderRadius: 8, padding: 12, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowLabel: { color: colors.muted, fontSize: 14, flexShrink: 1 },
  rowValue: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '600' },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.muted },
  faint: { color: colors.faint },
  small: { fontSize: 12 },
  bold: { fontWeight: '700' },
  btn: { backgroundColor: colors.cardAlt, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  btnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnDanger: { borderColor: colors.heat },
  btnGhost: { backgroundColor: 'transparent' },
  btnSmall: { paddingVertical: 5, paddingHorizontal: 9 },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.7 },
  btnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  btnTextPrimary: { color: '#1a1a1a' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bar: { height: 8, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barMark: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.faint },
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '600' },
  money: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
})

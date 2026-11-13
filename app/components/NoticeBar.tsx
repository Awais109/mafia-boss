import { Pressable, StyleSheet, Text } from 'react-native'
import { store, type Notice } from '../store'
import { fonts } from '../theme'
import { Icon } from './Glyph'
import { colors, rich } from './ui'

const VISIBLE_MS = 4000

// A one-line flash for four seconds (design: Components · Notice bar): a refusal in red, anything else
// neutral. Tap to dismiss.
export function NoticeBar({ notice, realNow }: { notice: Notice | null; realNow: number }) {
  if (!notice || realNow - notice.at > VISIBLE_MS) return null
  const error = notice.kind === 'error'
  return (
    <Pressable onPress={store.clearNotice} style={[styles.bar, error ? styles.error : styles.info]} accessibilityRole="alert">
      <Icon name={error ? 'blocked' : 'check'} size={16} color={error ? colors.bad : colors.good} />
      <Text style={styles.text}>{rich(notice.text, 13.5)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, borderRadius: 6, minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  error: { backgroundColor: '#2a1712', borderColor: '#6b3127' },
  info: { backgroundColor: colors.card, borderColor: colors.control },
  text: { flexShrink: 1, fontFamily: fonts.text400, color: colors.text, fontSize: 13.5 },
})

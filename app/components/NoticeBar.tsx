import { Pressable, StyleSheet, Text } from 'react-native'
import { store, type Notice } from '../store'
import { colors } from './ui'

const VISIBLE_MS = 4000

export function NoticeBar({ notice, realNow }: { notice: Notice | null; realNow: number }) {
  if (!notice || realNow - notice.at > VISIBLE_MS) return null
  return (
    <Pressable onPress={store.clearNotice} style={[styles.bar, notice.kind === 'error' ? styles.error : styles.info]}>
      <Text style={styles.text}>{notice.text}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: 12, marginTop: 8, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  error: { backgroundColor: '#4a2320' },
  info: { backgroundColor: '#23374a' },
  text: { color: colors.text, fontSize: 13 },
})

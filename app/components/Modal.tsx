import type { ReactNode } from 'react'
import { Modal as RNModal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fonts } from '../theme'
import { colors } from './ui'

// Every pop-up's frame (design: Pop-ups), so the backdrop and panel live in one place. `ModalPanel` is the
// centred card (the away summary, notices); `Sheet` rises from the bottom (Skip ahead).

export function ModalPanel({ children, onRequestClose, style }: { children: ReactNode; onRequestClose: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <RNModal transparent animationType="fade" visible onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={[styles.panel, style]}>{children}</View>
      </View>
    </RNModal>
  )
}

export function Sheet({ children, onRequestClose }: { children: ReactNode; onRequestClose: () => void }) {
  const insets = useSafeAreaInsets()
  return (
    <RNModal transparent animationType="slide" visible onRequestClose={onRequestClose}>
      <Pressable style={styles.scrim} onPress={onRequestClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        {children}
      </View>
    </RNModal>
  )
}

// A notice's first line: what kind it is (in its colour), a rule, and where it sits in the queue.
export function NoticeHead({ label, color = colors.accent, count }: { label: string; color?: string; count?: string }) {
  return (
    <View style={styles.head}>
      <Text style={[styles.headLabel, { color }]}>{label}</Text>
      <View style={styles.headRule} />
      {count ? <Text style={styles.headCount}>{count}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8, 6, 4, 0.72)', justifyContent: 'center', padding: 16 },
  panel: { backgroundColor: colors.card, borderRadius: 8, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.control, maxHeight: '92%' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8, 6, 4, 0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingHorizontal: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.control, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.control, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headLabel: { fontFamily: fonts.text600, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },
  headRule: { flex: 1, height: 1, backgroundColor: colors.border },
  headCount: { fontFamily: fonts.text400, fontSize: 12, color: colors.muted },
})

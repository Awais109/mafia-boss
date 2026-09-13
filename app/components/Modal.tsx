import type { ReactNode } from 'react'
import { Modal as RNModal, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from './ui'

// Shared backdrop + centered panel for every pop-up (AwayModal, SkipSheet, EventNoticeModal),
// so the backdrop/panel styling lives in exactly one place.
export function ModalPanel({
  children,
  onRequestClose,
  style,
}: {
  children: ReactNode
  onRequestClose: () => void
  style?: StyleProp<ViewStyle>
}) {
  return (
    <RNModal transparent animationType="fade" visible onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={[styles.panel, style]}>{children}</View>
      </View>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', padding: 16 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
})

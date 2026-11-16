import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { onGlobalCrash, recordCrash } from '../crash'
import { store } from '../store'
import { colors, fonts } from '../theme'
import type { CrashLine } from '../../sim/replay'

// "Something went wrong" instead of a white screen (ADR 0071). Catches a render error below it, writes it to
// the play log, and offers the log to share and a way back in. A fatal error outside React lands here too in a
// release build (app/crash.ts). Plain views only: nothing that might be what broke.
export class CrashBoundary extends Component<{ children: ReactNode }, { crash: CrashLine | null; shared: boolean }> {
  state = { crash: null as CrashLine | null, shared: false }
  private unsubscribe: (() => void) | null = null

  static getDerivedStateFromError(): null {
    return null // the line is written in componentDidCatch, which has the component stack
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ crash: recordCrash(error, 'render', true, info.componentStack ?? undefined), shared: false })
  }

  componentDidMount(): void {
    this.unsubscribe = onGlobalCrash((crash) => this.setState({ crash, shared: false }))
  }

  componentWillUnmount(): void {
    this.unsubscribe?.()
  }

  render(): ReactNode {
    const { crash, shared } = this.state
    if (!crash) return this.props.children
    const share = async () => {
      try {
        await store.exportLog()
        this.setState({ shared: true })
      } catch {
        // the share sheet couldn't open; the log stays on the phone
      }
    }
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The game hit an error and stopped this screen. Your save is as it was before it. Sharing your play log sends us
          what happened, this error included.
        </Text>
        <Text style={styles.error} numberOfLines={3}>
          {crash.message}
        </Text>
        <Pressable style={[styles.btn, styles.primary]} onPress={share} accessibilityRole="button">
          <Text style={styles.primaryText}>{shared ? 'Shared: thank you' : 'Share my play log'}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => this.setState({ crash: null })} accessibilityRole="button">
          <Text style={styles.btnText}>Carry on</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 14 },
  title: { fontFamily: fonts.display800, fontSize: 28, color: colors.accent },
  body: { fontFamily: fonts.text400, fontSize: 15, lineHeight: 21, color: colors.text },
  error: { fontFamily: fonts.text400, fontSize: 12, color: colors.faint },
  btn: { borderWidth: 1, borderColor: colors.control, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  primaryText: { fontFamily: fonts.text600, fontSize: 15, color: colors.bg },
  btnText: { fontFamily: fonts.text600, fontSize: 15, color: colors.text },
})

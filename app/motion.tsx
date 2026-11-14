import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Dimensions, Easing, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

// Motion (ADR 0061; docs/app.md, "Motion"): the design brief's restraint, in four moves: a chapter page turns
// in, a new district's ink comes up over the pencil, a mission's stamp lands, and money counts to its new
// figure. None when the phone asks for reduced motion. Transforms and opacity run on the native driver.

// Durations in ms, and the smallest change (a share of the figure) worth counting rather than just showing.
export const MOTION = { pageTurnMs: 480, inkDelayMs: 350, inkMs: 1100, stampMs: 180, tickMs: 450, tickMinShare: 0.01 }

const NATIVE = Platform.OS !== 'web'
// Made once: an easing is a new function each time it's built, and a new one would restart an entrance.
const EASE_OUT = Easing.out(Easing.cubic)
const EASE_IN_OUT = Easing.inOut(Easing.quad)
const EASE_IN = Easing.in(Easing.quad)

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let live = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => live && setReduced(r))
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  return reduced
}

// A figure that counts to a new value over MOTION.tickMs (easing out) when it jumps by more than
// MOTION.tickMinShare of itself: a collect, a deposit. Small drifts, like the per-second accrual, just follow.
export function useTicker(value: number): number {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(value)
  const current = useRef(value)
  useEffect(() => {
    const from = current.current
    if (reduced || Math.abs(value - from) <= Math.max(1, Math.abs(value) * MOTION.tickMinShare)) {
      current.current = value
      setShown(value)
      return
    }
    const started = Date.now()
    let frame = 0
    const step = () => {
      const k = Math.min(1, (Date.now() - started) / MOTION.tickMs)
      const v = from + (value - from) * (1 - Math.pow(1 - k, 3))
      current.current = v
      setShown(v)
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])
  return shown
}

// One animated value from 0 to 1 on mount, after `delay`. At 1 straight away with reduced motion.
function useEntrance(ms: number, delay = 0, easing: (t: number) => number = EASE_OUT): Animated.Value {
  const reduced = useReducedMotion()
  const [v] = useState(() => new Animated.Value(0))
  useEffect(() => {
    if (reduced) {
      v.setValue(1)
      return
    }
    const a = Animated.timing(v, { toValue: 1, duration: ms, delay, easing, useNativeDriver: NATIVE })
    a.start()
    return () => a.stop()
  }, [reduced, v, ms, delay, easing])
  return v
}

// A page turning in from its left edge, as a chapter page does.
export function PageTurn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useEntrance(MOTION.pageTurnMs)
  const half = Dimensions.get('window').width / 2
  const rotateY = v.interpolate({ inputRange: [0, 1], outputRange: ['-75deg', '0deg'] })
  const opacity = v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] })
  return (
    <Animated.View style={[style, { opacity, transform: [{ perspective: 1200 }, { translateX: -half }, { rotateY }, { translateX: half }] }]}>{children}</Animated.View>
  )
}

// Ink coming up over a pencil drawing: `children` (the inked drawing) fades in as `pencil` fades out, so the
// pencil's fragments don't show through where the ink draws nothing.
export function InkIn({ pencil, children, style }: { pencil: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useEntrance(MOTION.inkMs, MOTION.inkDelayMs, EASE_IN_OUT)
  const fade = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  return (
    <Animated.View style={style}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>{pencil}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: v }]}>{children}</Animated.View>
    </Animated.View>
  )
}

// A rubber stamp landing: from a little above the page, fast, with no bounce.
export function Stamped({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useEntrance(MOTION.stampMs, 0, EASE_IN)
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1.7, 1] })
  return <Animated.View style={[style, { opacity: v, transform: [{ scale }] }]}>{children}</Animated.View>
}

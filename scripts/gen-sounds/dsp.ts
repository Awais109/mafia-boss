// A small DSP kit for making the game's sounds from scratch (docs/sound.md, "Generating sounds"). Mono buffers
// are Float32Arrays at SR; stereo is a pair. Everything random takes a seeded Rand, so a run is repeatable.
import { writeFileSync } from 'node:fs'

export const SR = 44100
export type Buf = Float32Array
export type Stereo = [Float32Array, Float32Array]
export type Rand = () => number

// mulberry32 over a string hash.
export function seeded(seed: string): Rand {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const len = (sec: number): number => Math.max(1, Math.round(sec * SR))
export const zeros = (sec: number): Buf => new Float32Array(len(sec))
export const stereo = (sec: number): Stereo => [zeros(sec), zeros(sec)]
export const isStereo = (x: Buf | Stereo): x is Stereo => Array.isArray(x)

// ---- noise

export function white(sec: number, r: Rand): Buf {
  const b = zeros(sec)
  for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1
  return b
}

// Paul Kellet's economy pink filter.
export function pink(sec: number, r: Rand): Buf {
  const b = zeros(sec)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < b.length; i++) {
    const w = r() * 2 - 1
    b0 = 0.99765 * b0 + w * 0.099046
    b1 = 0.963 * b1 + w * 0.2965164
    b2 = 0.57 * b2 + w * 1.0526913
    b[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
  }
  return b
}

// Leaky-integrated white: a low rumble.
export function brown(sec: number, r: Rand): Buf {
  const b = zeros(sec)
  let y = 0
  for (let i = 0; i < b.length; i++) {
    y = 0.995 * y + (r() * 2 - 1) * 0.06
    b[i] = y
  }
  return b
}

// A random step between lo and 1 every `stepMs`: multiply noise by it for paper's crinkle or a nib's scratch.
export function grit(sec: number, r: Rand, stepMs: number, lo: number): Buf {
  const b = zeros(sec)
  const step = Math.max(1, Math.round((stepMs / 1000) * SR))
  let v = 1
  for (let i = 0; i < b.length; i++) {
    if (i % step === 0) v = lo + (1 - lo) * r()
    b[i] = v
  }
  return b
}

// ---- envelopes (a buffer of gains)

// A linear attack, then an exponential decay with time constant `tau` seconds.
export function decay(sec: number, tau: number, attack = 0.0005): Buf {
  const b = zeros(sec)
  const a = len(attack)
  for (let i = 0; i < b.length; i++) b[i] = i < a ? i / a : Math.exp(-(i - a) / SR / tau)
  return b
}

// Piecewise linear through [seconds, gain] points.
export function shape(sec: number, points: [number, number][]): Buf {
  const b = zeros(sec)
  let k = 0
  for (let i = 0; i < b.length; i++) {
    const t = i / SR
    while (k < points.length - 2 && t > points[k + 1][0]) k++
    const [t0, v0] = points[k]
    const [t1, v1] = points[Math.min(k + 1, points.length - 1)]
    b[i] = t1 > t0 ? v0 + ((v1 - v0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))) : v1
  }
  return b
}

export function mul(x: Buf, by: Buf | number): Buf {
  if (typeof by === 'number') for (let i = 0; i < x.length; i++) x[i] *= by
  else for (let i = 0; i < x.length; i++) x[i] *= i < by.length ? by[i] : 0
  return x
}

// ---- filters (RBJ biquads)

export type FilterType = 'lp' | 'hp' | 'bp' | 'peak'

export class Biquad {
  private b0 = 1
  private b1 = 0
  private b2 = 0
  private a1 = 0
  private a2 = 0
  private x1 = 0
  private x2 = 0
  private y1 = 0
  private y2 = 0

  constructor(type: FilterType, f: number, q = 0.707, gainDb = 0) {
    this.set(type, f, q, gainDb)
  }

  set(type: FilterType, f: number, q = 0.707, gainDb = 0): void {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * q)
    let b0: number
    let b1: number
    let b2: number
    let a0: number
    let a1: number
    let a2: number
    if (type === 'lp') {
      ;[b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
      ;[a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha]
    } else if (type === 'hp') {
      ;[b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
      ;[a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha]
    } else if (type === 'bp') {
      ;[b0, b1, b2] = [alpha, 0, -alpha]
      ;[a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha]
    } else {
      const A = Math.pow(10, gainDb / 40)
      ;[b0, b1, b2] = [1 + alpha * A, -2 * cos, 1 - alpha * A]
      ;[a0, a1, a2] = [1 + alpha / A, -2 * cos, 1 - alpha / A]
    }
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = a1 / a0
    this.a2 = a2 / a0
  }

  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

export function filt(x: Buf, type: FilterType, f: number, q = 0.707, gainDb = 0): Buf {
  const bq = new Biquad(type, f, q, gainDb)
  for (let i = 0; i < x.length; i++) x[i] = bq.run(x[i])
  return x
}

// A filter whose frequency moves from f0 to f1 (exponentially) over the buffer: a swish, a passing tram.
export function sweep(x: Buf, type: FilterType, f0: number, f1: number, q = 0.707): Buf {
  const bq = new Biquad(type, f0, q)
  const block = 32
  for (let i = 0; i < x.length; i++) {
    if (i % block === 0) bq.set(type, f0 * Math.pow(f1 / f0, i / x.length), q)
    x[i] = bq.run(x[i])
  }
  return x
}

// ---- sources

// A struck object as a sum of decaying sines (modes): wood, metal, glass, a bell.
export type Mode = { f: number; tau: number; a: number }
export function modal(sec: number, modes: Mode[], r: Rand): Buf {
  const b = zeros(sec)
  for (const m of modes) {
    if (m.f >= SR / 2) continue
    const w = (2 * Math.PI * m.f) / SR
    const k = Math.exp(-1 / (SR * m.tau))
    const ph = r() * Math.PI * 2
    let e = m.a
    for (let i = 0; i < b.length && e > 1e-5; i++) {
      b[i] += e * Math.sin(w * i + ph)
      e *= k
    }
  }
  // A 1 ms attack so the strike doesn't click.
  const a = len(0.001)
  for (let i = 0; i < a && i < b.length; i++) b[i] *= i / a
  return b
}

// One cycle of a waveform from its harmonic amplitudes, to play at any pitch.
export const TABLE = 2048
export function wavetable(amps: number[]): Float32Array {
  const t = new Float32Array(TABLE)
  amps.forEach((a, k) => {
    if (!a) return
    for (let i = 0; i < TABLE; i++) t[i] += a * Math.sin((2 * Math.PI * (k + 1) * i) / TABLE)
  })
  let peak = 0
  for (let i = 0; i < TABLE; i++) peak = Math.max(peak, Math.abs(t[i]))
  for (let i = 0; i < TABLE; i++) t[i] /= peak || 1
  return t
}

// A wavetable played at `hz` (a number, or a function of time for vibrato and glides).
export function osc(sec: number, table: Float32Array, hz: number | ((t: number) => number), phase = 0): Buf {
  const b = zeros(sec)
  let p = phase * TABLE
  for (let i = 0; i < b.length; i++) {
    const f = typeof hz === 'number' ? hz : hz(i / SR)
    const j = Math.floor(p)
    const frac = p - j
    b[i] = table[j % TABLE] * (1 - frac) + table[(j + 1) % TABLE] * frac
    p += (f * TABLE) / SR
    if (p >= TABLE) p -= TABLE
  }
  return b
}

export const SAW = wavetable(Array.from({ length: 24 }, (_, k) => 1 / (k + 1)))
export const TRI = wavetable(Array.from({ length: 12 }, (_, k) => ((k + 1) % 2 ? 1 / (k + 1) ** 2 : 0)))

// ---- mixing

// Adds `src` into `dst` at `at` seconds, growing nothing: what doesn't fit is dropped.
export function add(dst: Buf, src: Buf, at = 0, g = 1): Buf {
  const o = Math.round(at * SR)
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g
  return dst
}

// Adds mono at a pan (−1 left … 1 right, equal power), or stereo as it is.
export function addSt(dst: Stereo, src: Buf | Stereo, at = 0, g = 1, pan = 0): Stereo {
  if (isStereo(src)) {
    add(dst[0], src[0], at, g)
    add(dst[1], src[1], at, g)
    return dst
  }
  const a = ((pan + 1) * Math.PI) / 4
  add(dst[0], src, at, g * Math.cos(a))
  add(dst[1], src, at, g * Math.sin(a))
  return dst
}

export function peak(x: Buf | Stereo): number {
  let p = 0
  for (const ch of isStereo(x) ? x : [x]) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i]))
  return p
}

export function normalize<T extends Buf | Stereo>(x: T, to = 0.9): T {
  const p = peak(x)
  const chans: Buf[] = isStereo(x) ? [x[0], x[1]] : [x as Buf]
  if (p > 0) for (const ch of chans) mul(ch, to / p)
  return x
}

export const toMono = (x: Stereo): Buf => {
  const b = new Float32Array(x[0].length)
  for (let i = 0; i < b.length; i++) b[i] = (x[0][i] + x[1][i]) / 2
  return b
}

// ---- reverb (Freeverb: eight combs and four allpasses a side)

class Comb {
  private buf: Float32Array
  private i = 0
  private store = 0
  constructor(size: number) {
    this.buf = new Float32Array(size)
  }
  run(x: number, feedback: number, damp: number): number {
    const out = this.buf[this.i]
    this.store = out * (1 - damp) + this.store * damp
    this.buf[this.i] = x + this.store * feedback
    if (++this.i >= this.buf.length) this.i = 0
    return out
  }
}

class Allpass {
  private buf: Float32Array
  private i = 0
  constructor(size: number) {
    this.buf = new Float32Array(size)
  }
  run(x: number): number {
    const b = this.buf[this.i]
    this.buf[this.i] = x + b * 0.5
    if (++this.i >= this.buf.length) this.i = 0
    return b - x
  }
}

const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
const ALLPASSES = [556, 441, 341, 225]
const SPREAD = 23

export type Room = { size: number; damp: number; wet: number; dry?: number; width?: number }

// Reverb over `x`, with `tail` seconds added at the end for the reverb to ring out.
export function reverb(x: Buf | Stereo, room: Room, tail = 0): Stereo {
  const [inL, inR] = isStereo(x) ? x : [x, x]
  const n = inL.length + len(tail)
  const out: Stereo = [new Float32Array(n), new Float32Array(n)]
  const feedback = room.size * 0.28 + 0.7
  const damp = room.damp * 0.4
  const width = room.width ?? 1
  const dry = room.dry ?? 1
  const wet1 = room.wet * (width / 2 + 0.5)
  const wet2 = room.wet * ((1 - width) / 2)
  const sides = [0, SPREAD].map((s) => ({ combs: COMBS.map((c) => new Comb(c + s)), aps: ALLPASSES.map((a) => new Allpass(a + s)) }))
  for (let i = 0; i < n; i++) {
    const l = i < inL.length ? inL[i] : 0
    const r = i < inR.length ? inR[i] : 0
    const input = (l + r) * 0.015
    const [L, R] = sides.map(({ combs, aps }) => {
      let s = 0
      for (const c of combs) s += c.run(input, feedback, damp)
      for (const a of aps) s = a.run(s)
      return s
    })
    out[0][i] = L * wet1 + R * wet2 + l * dry
    out[1][i] = R * wet1 + L * wet2 + r * dry
  }
  return out
}

// A small room on a mono one-shot, kept mono.
export const room = (x: Buf, wet: number, tail = 0.4): Buf => toMono(reverb(x, { size: 0.35, damp: 0.6, wet }, tail))

// ---- loops

// A loop of exactly `loopSec`: whatever rings past the end (reverb, a held note) is folded back onto the start,
// so the seam is continuous.
export function foldLoop(x: Stereo, loopSec: number): Stereo {
  const n = len(loopSec)
  return x.map((ch) => {
    const out = ch.slice(0, n)
    for (let i = n; i < ch.length; i++) out[(i - n) % n] += ch[i]
    return out
  }) as Stereo
}

// A loop of stationary sound (rain): the last `fadeSec` crossfades into the first.
export function crossLoop(x: Stereo, loopSec: number, fadeSec: number): Stereo {
  const n = len(loopSec)
  const f = len(fadeSec)
  return x.map((ch) => {
    const out = ch.slice(0, n)
    for (let i = 0; i < f && n + i < ch.length; i++) {
      const g = i / f
      out[i] = ch[i] * g + ch[n + i] * (1 - g)
    }
    return out
  }) as Stereo
}

// ---- files

// 32-bit float WAV, which ffmpeg reads without losing anything.
export function writeWav(path: string, x: Buf | Stereo): void {
  const chans = isStereo(x) ? x : [x]
  const n = chans[0].length
  const data = Buffer.alloc(n * chans.length * 4)
  for (let i = 0; i < n; i++) for (let c = 0; c < chans.length; c++) data.writeFloatLE(chans[c][i], (i * chans.length + c) * 4)
  const head = Buffer.alloc(44)
  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVE', 8)
  head.write('fmt ', 12)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(3, 20) // IEEE float
  head.writeUInt16LE(chans.length, 22)
  head.writeUInt32LE(SR, 24)
  head.writeUInt32LE(SR * chans.length * 4, 28)
  head.writeUInt16LE(chans.length * 4, 32)
  head.writeUInt16LE(32, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  writeFileSync(path, Buffer.concat([head, data]))
}

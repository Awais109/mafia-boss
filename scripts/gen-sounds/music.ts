// The music, made from scratch: a felt piano, a bayan (two reeds a few cents apart), a string pad, a plucked
// bass, brushes and a clock, written out note by note. One motif, in D minor, runs through the theme, the
// stings and the Empire. Loops are folded so the reverb carries across the seam. Names: MUSIC_NAMES.
import type { MusicName } from '../../app/sound/cues'
import { add, addSt, decay, filt, foldLoop, len, modal, mul, osc, pink, reverb, shape, SR, stereo, wavetable, white, zeros, type Buf, type Rand, type Room, type Stereo } from './dsp'

// ---- pitch

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
export function midi(name: string): number {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(name)
  if (!m) throw new Error(`bad note ${name}`)
  return 12 * (Number(m[3]) + 1) + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
const hz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

const CH = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], d7: [0, 4, 7, 10], M7: [0, 4, 7, 11] } as const
type Q = keyof typeof CH
type Chord = [root: string, q: Q]
const tones = (root: string, q: Q, oct: number): number[] => CH[q].map((i) => midi(`${root}${oct}`) + i)

// ---- instruments: (Hz, seconds held, velocity 0–1, rand) → mono, release included

type Inst = (f: number, sec: number, v: number, r: Rand) => Buf

// Felt piano: eight slightly stretched partials, the high ones dying first, a little hammer, darker when soft.
const piano: Inst = (f, sec, v, r) => {
  const out = zeros(sec + 0.3)
  const relAt = len(sec)
  for (let k = 1; k <= 8; k++) {
    const fk = k * f * Math.sqrt(1 + 0.0004 * k * k)
    if (fk > 9000) break
    const w = (2 * Math.PI * fk) / SR
    const kd = Math.exp(-1 / (SR * ((0.6 + 350 / f) / (1 + 0.6 * (k - 1)))))
    const kr = Math.exp(-1 / (SR * 0.07))
    const ph = r() * Math.PI * 2
    let e = Math.pow(k, -1.4) * (k === 1 ? 1 : 0.55 + 0.45 * v)
    for (let i = 0; i < out.length && e > 1e-5; i++) {
      out[i] += e * Math.sin(w * i + ph)
      e *= i < relAt ? kd : kd * kr
    }
  }
  const a = len(0.004)
  for (let i = 0; i < a; i++) out[i] *= i / a
  add(out, filt(mul(white(0.01, r), decay(0.01, 0.002)), 'lp', 2500), 0, 0.04 * v)
  return mul(filt(out, 'lp', 1100 + 2600 * v), v)
}

// The same piano, mellower, with a slow tremolo: an electric piano for the city.
const keys: Inst = (f, sec, v, r) => {
  const out = filt(piano(f, sec, v, r), 'lp', 1500)
  for (let i = 0; i < out.length; i++) out[i] *= 1 - 0.12 * (0.5 + 0.5 * Math.sin((2 * Math.PI * 4.5 * i) / SR))
  return out
}

// Bayan: a reedy wave on two reeds 11 cents apart (the beating is the accordion), a bellows swell.
const REED = wavetable([1, 0.75, 0.6, 0.45, 0.4, 0.3, 0.28, 0.2, 0.18, 0.14, 0.12, 0.1, 0.08, 0.06])
const reed: Inst = (f, sec, v, r) => {
  const total = sec + 0.15
  const out = zeros(total)
  for (const cents of [0, 11]) add(out, osc(total, REED, f * Math.pow(2, cents / 1200), r()), 0, 0.5)
  mul(out, shape(total, [[0, 0], [0.06, 1], [Math.max(0.07, sec), 0.9], [total, 0]]))
  for (let i = 0; i < out.length; i++) out[i] *= 1 + 0.07 * Math.sin((2 * Math.PI * 0.35 * i) / SR)
  filt(out, 'lp', 2400)
  filt(out, 'peak', 1100, 1, 3)
  return mul(out, v)
}

// String pad: three detuned saws with a slow vibrato, a long attack and release.
const PAD = wavetable(Array.from({ length: 10 }, (_, k) => 1 / (k + 1)))
const pad =
  (attack = 1, release = 1.2): Inst =>
  (f, sec, v, r) => {
    const total = sec + release
    const out = zeros(total)
    for (const c of [-7, 0, 7]) {
      const fc = f * Math.pow(2, c / 1200)
      add(out, osc(total, PAD, (t) => fc * (1 + 0.0015 * Math.sin(2 * Math.PI * 5 * t + c)), r()), 0, 0.33)
    }
    mul(out, shape(total, [[0, 0], [attack, 1], [Math.max(attack, sec), 0.85], [total, 0]]))
    return mul(filt(out, 'lp', 1500), v)
  }

// Upright bass: a plucked string (Karplus–Strong), damped on release.
const bass: Inst = (f, sec, v, r) => {
  const out = zeros(sec + 0.3)
  const n = Math.max(2, Math.round(SR / f))
  const line = new Float32Array(n)
  for (let i = 0; i < n; i++) line[i] = r() * 2 - 1
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n; i++) line[i] = 0.5 * (line[i] + line[i - 1])
  const relAt = len(sec)
  for (let i = 0; i < out.length; i++) {
    const j = i % n
    out[i] = line[j]
    line[j] = 0.5 * (line[j] + line[(j + 1) % n]) * (i < relAt ? 0.996 : 0.9)
  }
  return mul(filt(out, 'lp', 700), v * 1.6)
}

// ---- percussion

const brush = (v: number, r: Rand): Buf => mul(filt(mul(white(0.25, r), shape(0.25, [[0, 0], [0.03, 1], [0.25, 0]])), 'bp', 6500, 0.6), v)

function kick(v: number): Buf {
  const out = zeros(0.35)
  let ph = 0
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    ph += (2 * Math.PI * (48 + 47 * Math.exp(-t / 0.03))) / SR
    out[i] = Math.sin(ph) * Math.exp(-t / 0.12)
  }
  return mul(out, v)
}

const tick = (hi: boolean, v: number, r: Rand): Buf => {
  const f = hi ? 2600 : 2050
  return mul(
    modal(
      0.05,
      [
        { f, tau: 0.006, a: 1 },
        { f: f * 2.4, tau: 0.003, a: 0.4 },
      ],
      r,
    ),
    v,
  )
}

// ---- sequencing (in beats; four to a bar)

type Note = { at: number; dur: number; n: string | number; v: number } // n: a note name, or MIDI

// Bars of [note, beats] in order from `bar`; '-' rests.
function melody(bars: [string, number][][], bar: number, v: number): Note[] {
  const out: Note[] = []
  bars.forEach((notes, b) => {
    let at = (bar + b) * 4
    for (const [n, beats] of notes) {
      if (n !== '-') out.push({ at, dur: beats * 0.95, n, v })
      at += beats
    }
  })
  return out
}

// Eighth-note arpeggio over a bar: root, fifth, octave, tenth, and back. Each note rings like a held pedal.
function arp8([root, q]: Chord, oct: number, bar: number, v: number): Note[] {
  const [r0, third, fifth] = tones(root, q, oct)
  return [r0, fifth, r0 + 12, third + 12, fifth + 12, third + 12, r0 + 12, fifth].map((n, k) => ({ at: bar * 4 + k * 0.5, dur: 2, n, v: v * (k === 0 ? 1.15 : 1) }))
}

class Song {
  readonly beat: number
  readonly sec: number
  readonly out: Stereo
  constructor(bpm: number, bars: number, tail = 5) {
    this.beat = 60 / bpm
    this.sec = bars * 4 * this.beat
    this.out = stereo(this.sec + tail)
  }

  // Each note a touch early or late and a touch louder or softer, so it doesn't sound typed in.
  play(inst: Inst, notes: Note[], r: Rand, pan = 0, g = 1): this {
    for (const n of notes) {
      const f = hz(typeof n.n === 'number' ? n.n : midi(n.n))
      const at = Math.max(0, n.at * this.beat + (r() - 0.5) * 0.012)
      addSt(this.out, inst(f, n.dur * this.beat, n.v * (0.94 + 0.12 * r()), r), at, g, pan)
    }
    return this
  }

  hit(b: Buf, at: number, pan = 0): this {
    addSt(this.out, b, at * this.beat, 1, pan)
    return this
  }

  // Tape hiss under the whole loop.
  hiss(r: Rand, g = 0.012): this {
    for (const side of [0, 1] as const) add(this.out[side], filt(filt(pink(this.sec, r), 'hp', 2500), 'lp', 9000), 0, g)
    return this
  }

  loop(room: Room): Stereo {
    return foldLoop(reverb(this.out, room, 3), this.sec)
  }

  // A one-off (a sting): the reverb rings out, then the silence after it is cut.
  once(room: Room, tail: number): Stereo {
    const x = reverb(this.out, room, tail)
    let end = x[0].length
    while (end > 1 && Math.abs(x[0][end - 1]) < 1e-4 && Math.abs(x[1][end - 1]) < 1e-4) end--
    return [x[0].slice(0, end), x[1].slice(0, end)]
  }
}

// ---- the motif (D minor), bar by bar

const MOTIF: [string, number][][] = [
  [['A4', 1.5], ['D5', 0.5], ['C5', 1], ['Bb4', 1]],
  [['A4', 2], ['G4', 1], ['F4', 1]],
  [['E4', 1.5], ['F4', 0.5], ['G4', 1], ['A4', 1]],
  [['D4', 4]],
  [['F4', 1], ['A4', 1], ['D5', 1.5], ['E5', 0.5]],
  [['F5', 2], ['E5', 1], ['D5', 1]],
  [['C5', 1], ['Bb4', 1], ['A4', 1], ['G4', 1]],
  [['A4', 3], ['-', 1]],
]

// The motif an octave down at half speed: each bar becomes two.
const SLOW_MOTIF: [string, number][][] = MOTIF.slice(0, 4).flatMap((bar) => {
  const notes = bar.map(([n, b]): [string, number] => [n === '-' ? n : n.replace(/\d$/, (o) => String(Number(o) - 1)), b * 2])
  const out: [string, number][][] = [[], []]
  let at = 0
  // A note that starts in the first bar stays there whole, even if it rings into the second.
  for (const [n, b] of notes) {
    out[at < 4 ? 0 : 1].push([n, b])
    at += b
  }
  return out
})

// ---- the tracks

export const MUSIC_RECIPES: Record<MusicName, (r: Rand) => Stereo> = {
  // The cover and the credits: the motif on the bayan over piano, then the piano alone.
  theme: (r) => {
    const s = new Song(66, 12)
    const chords: Chord[] = [['D', 'm'], ['Bb', 'M'], ['A', 'M'], ['D', 'm'], ['G', 'm'], ['D', 'm'], ['Bb', 'M'], ['A', 'M'], ['D', 'm'], ['Bb', 'M'], ['G', 'm'], ['A', 'M']]
    chords.forEach((c, bar) => {
      s.play(piano, arp8(c, 3, bar, bar >= 8 ? 0.4 : 0.3), r, -0.15)
      s.play(piano, [{ at: bar * 4, dur: 3.8, n: midi(`${c[0]}2`), v: 0.36 }], r, -0.25)
    })
    s.play(reed, melody(MOTIF, 0, 0.42), r, 0.15)
    s.play(piano, melody([[['A5', 1.5], ['D6', 0.5], ['C6', 1], ['Bb5', 1]], [['A5', 4]]], 8, 0.2), r, 0.25)
    return s.hiss(r).loop({ size: 0.7, damp: 0.5, wet: 0.25 })
  },

  // Acts I–III, under long sessions: an electric piano, an upright bass, brushes, no tune to tire of.
  'city-1': (r) => {
    const s = new Song(70, 12)
    const prog: Chord[] = [['A', 'm7'], ['F', 'M7'], ['D', 'm7'], ['E', 'd7']]
    for (let bar = 0; bar < 12; bar++) {
      const c = prog[bar % 4]
      const voicing = tones(c[0], c[1], 3)
      s.play(keys, voicing.map((n) => ({ at: bar * 4, dur: 1.6, n, v: 0.26 })), r, -0.1)
      s.play(keys, voicing.map((n) => ({ at: bar * 4 + 2.5, dur: 1.2, n, v: 0.2 })), r, -0.1)
      const root = midi(`${c[0]}2`)
      const next = midi(`${prog[(bar + 1) % 4][0]}2`)
      s.play(bass, [{ at: bar * 4, dur: 1.8, n: root, v: 0.7 }, { at: bar * 4 + 2, dur: 1.3, n: root + 7, v: 0.6 }, { at: bar * 4 + 3.5, dur: 0.45, n: next + (next > root ? -1 : 1), v: 0.5 }], r)
      s.hit(kick(0.35), bar * 4).hit(brush(0.2, r), bar * 4 + 1, 0.3).hit(brush(0.2, r), bar * 4 + 3, 0.3)
      if (bar % 2 === 1) {
        const pent = ['G5', 'A5', 'C6', 'D6', 'E6']
        for (let k = 0; k < 2; k++) s.play(piano, [{ at: bar * 4 + Math.floor(r() * 8) / 2, dur: 1.5, n: pent[Math.floor(r() * pent.length)], v: 0.14 }], r, 0.35)
      }
    }
    return s.hiss(r).loop({ size: 0.55, damp: 0.6, wet: 0.18 })
  },

  // Act IV on: colder and bigger. Strings, a pulse on the root, a high note now and then.
  'city-2': (r) => {
    const s = new Song(60, 8)
    const prog: Chord[] = [['E', 'm'], ['C', 'M7'], ['A', 'm7'], ['B', 'd7']]
    for (let bar = 0; bar < 8; bar++) {
      const c = prog[bar % 4]
      s.play(pad(1.2, 1.4), tones(c[0], c[1], 3).map((n) => ({ at: bar * 4, dur: 4, n, v: 0.28 })), r)
      for (let e = 0; e < 8; e++) s.play(bass, [{ at: bar * 4 + e / 2, dur: 0.4, n: midi(`${c[0]}2`), v: e % 2 ? 0.32 : 0.42 }], r)
      s.play(piano, [{ at: bar * 4 + [0.5, 1.5, 2.5][Math.floor(r() * 3)], dur: 2, n: tones(c[0], c[1], 5)[Math.floor(r() * 3)], v: 0.18 }], r, 0.3)
    }
    return s.hiss(r).loop({ size: 0.8, damp: 0.4, wet: 0.3 })
  },

  // Missions and Tolya: a bass ostinato, a clock, a heartbeat, a drone that grinds a semitone.
  tension: (r) => {
    const s = new Song(90, 12)
    const ostinato = ['D2', 'D2', 'F2', 'D2', 'Eb2', 'D2', 'C2', 'D2']
    for (let bar = 0; bar < 12; bar++) {
      s.play(bass, ostinato.map((n, e) => ({ at: bar * 4 + e / 2, dur: 0.45, n, v: e === 0 ? 0.7 : 0.5 })), r)
      for (let e = 0; e < 8; e++) s.hit(tick(e % 2 === 0, 0.22, r), bar * 4 + e / 2, 0.4)
      s.hit(kick(0.4), bar * 4).hit(kick(0.28), bar * 4 + 0.4)
      if (bar % 4 === 0) s.play(pad(1.5, 2), [{ at: bar * 4, dur: 16, n: 'D3', v: 0.25 }, { at: bar * 4, dur: 16, n: 'A3', v: 0.2 }], r, -0.2)
      if (bar % 4 === 2) s.play(pad(3, 2), [{ at: bar * 4, dur: 7, n: 'Eb4', v: 0.16 }], r, 0.25)
    }
    return s.loop({ size: 0.6, damp: 0.5, wet: 0.2 })
  },

  // The prologue, the envelope, the chapters: the piano alone, slowly.
  story: (r) => {
    const s = new Song(60, 8)
    const prog: Chord[] = [['D', 'm'], ['F', 'M'], ['C', 'M'], ['G', 'm'], ['D', 'm'], ['Bb', 'M'], ['A', 'M'], ['D', 'm']]
    prog.forEach(([root, q], bar) => {
      const [r0, third, fifth] = tones(root, q, 3)
      s.play(piano, [r0, fifth, r0 + 12, third + 12].map((n, k) => ({ at: bar * 4 + k, dur: 2.5, n, v: 0.26 })), r, -0.1)
      s.play(piano, [{ at: bar * 4, dur: 4, n: midi(`${root}2`), v: 0.3 }], r, -0.2)
    })
    const top: [string, number][][] = [
      [['A4', 2], ['F4', 2]],
      [['A4', 2], ['C5', 2]],
      [['G4', 2], ['E4', 2]],
      [['D4', 2], ['G4', 2]],
      [['F4', 2], ['A4', 2]],
      [['D5', 2], ['Bb4', 2]],
      [['A4', 2], ['C#5', 2]],
      [['D5', 4]],
    ]
    s.play(piano, melody(top, 0, 0.32), r, 0.1)
    return s.hiss(r).loop({ size: 0.7, damp: 0.5, wet: 0.28 })
  },

  // The Holding: dawn, in D major.
  'ending-holding': (r) => {
    const s = new Song(72, 8)
    const prog: Chord[] = [['D', 'M'], ['A', 'M'], ['B', 'm'], ['G', 'M'], ['D', 'M'], ['G', 'M'], ['A', 'M'], ['D', 'M']]
    prog.forEach((c, bar) => {
      s.play(piano, arp8(c, 3, bar, 0.28), r, -0.15)
      s.play(pad(1, 1.5), tones(c[0], c[1], 3).map((n) => ({ at: bar * 4, dur: 4, n, v: 0.14 })), r, 0.1)
    })
    const tune: [string, number][][] = [
      [['F#4', 2], ['A4', 1], ['B4', 1]],
      [['A4', 2], ['E4', 2]],
      [['F#4', 1], ['D4', 1], ['B3', 2]],
      [['D4', 2], ['G4', 2]],
      [['A4', 2], ['F#4', 1], ['A4', 1]],
      [['B4', 2], ['D5', 2]],
      [['C#5', 2], ['A4', 1], ['E4', 1]],
      [['D4', 4]],
    ]
    s.play(reed, melody(tune, 0, 0.36), r, 0.15)
    return s.loop({ size: 0.75, damp: 0.45, wet: 0.28 })
  },

  // The Empire: night. The motif low and slow over dark strings.
  'ending-empire': (r) => {
    const s = new Song(56, 8)
    const prog: Chord[] = [['D', 'm'], ['Bb', 'M'], ['G', 'm'], ['A', 'M'], ['D', 'm'], ['Bb', 'M'], ['A', 'M'], ['D', 'm']]
    prog.forEach((c, bar) => {
      s.play(pad(1.5, 2), tones(c[0], c[1], 3).map((n) => ({ at: bar * 4, dur: 4, n, v: 0.26 })), r, -0.1)
      s.play(piano, [{ at: bar * 4, dur: 3.5, n: midi(`${c[0]}2`), v: 0.38 }], r, -0.2)
    })
    s.play(reed, melody(SLOW_MOTIF, 0, 0.3), r, 0.15)
    return s.loop({ size: 0.85, damp: 0.35, wet: 0.35 })
  },

  // FAILED: a low cluster and the bayan falling to D.
  'sting-failed': (r) =>
    new Song(60, 1)
      .play(piano, ['D2', 'A2', 'D3', 'F3'].map((n) => ({ at: 0, dur: 3, n, v: 0.55 })), r, -0.1)
      .play(reed, [{ at: 0.05, dur: 0.5, n: 'A3', v: 0.45 }, { at: 0.6, dur: 0.5, n: 'F3', v: 0.45 }, { at: 1.15, dur: 1.6, n: 'D3', v: 0.45 }], r, 0.1)
      .play(pad(0.3, 1.5), [{ at: 0, dur: 2, n: 'D3', v: 0.2 }, { at: 0, dur: 2, n: 'F3', v: 0.18 }], r)
      .once({ size: 0.7, damp: 0.5, wet: 0.35 }, 2.5),

  // WON: a D major swell and the piano rising to it.
  'sting-won': (r) => {
    const s = new Song(60, 1).play(pad(0.25, 1.6), ['D3', 'F#3', 'A3', 'D4'].map((n) => ({ at: 0, dur: 1.8, n, v: 0.3 })), r)
    ;['D4', 'F#4', 'A4', 'D5'].forEach((n, k) => s.play(piano, [{ at: k * 0.11, dur: 2, n, v: 0.4 }], r, 0.15))
    return s
      .play(piano, [{ at: 0.5, dur: 2, n: 'A5', v: 0.3 }], r, 0.25)
      .play(reed, [{ at: 0.45, dur: 1.4, n: 'D5', v: 0.3 }], r, -0.1)
      .once({ size: 0.7, damp: 0.45, wet: 0.32 }, 2.5)
  },

  // A chapter page: the motif's first bar on the bayan over a D minor chord.
  'sting-chapter': (r) =>
    new Song(60, 1)
      .play(piano, ['D3', 'A3', 'F4'].map((n) => ({ at: 0, dur: 3.5, n, v: 0.32 })), r, -0.15)
      .play(reed, [{ at: 0.1, dur: 0.55, n: 'A4', v: 0.4 }, { at: 0.65, dur: 0.25, n: 'D5', v: 0.4 }, { at: 0.9, dur: 0.5, n: 'C5', v: 0.38 }, { at: 1.4, dur: 0.5, n: 'Bb4', v: 0.36 }, { at: 1.9, dur: 1.6, n: 'A4', v: 0.36 }], r, 0.15)
      .once({ size: 0.7, damp: 0.5, wet: 0.3 }, 2.5),
}

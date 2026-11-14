// The sound effects, made from scratch: 1993 office foley out of struck modes, filtered noise and a little room.
// Each recipe takes a seeded Rand and returns mono (stereo for the cover's ambience). Names: SFX_NAMES.
import type { SfxName } from '../../app/sound/cues'
import { add, addSt, brown, SR, crossLoop, decay, filt, grit, mul, modal, osc, pink, room, SAW, shape, stereo, sweep, TRI, white, zeros, type Buf, type Mode, type Rand, type Stereo } from './dsp'

// ---- parts

// A short noise burst through a band: a click, a slap, the contact of a hit.
function burst(sec: number, r: Rand, type: 'lp' | 'hp' | 'bp', f: number, tau: number, q = 0.9): Buf {
  return filt(mul(white(sec, r), decay(sec, tau)), type, f, q)
}

// Wood on wood: a table, a door, a desk.
const wood = (f: number, tau: number, bright = 0.4): Mode[] => [
  { f, tau, a: 1 },
  { f: f * 2.32, tau: tau * 0.55, a: bright },
  { f: f * 4.1, tau: tau * 0.3, a: bright * 0.45 },
  { f: f * 6.8, tau: tau * 0.18, a: bright * 0.2 },
]

// Small metal: keys, a latch, a typebar. Inharmonic, short.
const metal = (f: number, tau: number, r: Rand): Mode[] => [
  { f, tau, a: 1 },
  { f: f * (1.52 + r() * 0.1), tau: tau * 0.8, a: 0.6 },
  { f: f * (2.71 + r() * 0.15), tau: tau * 0.6, a: 0.35 },
  { f: f * (4.05 + r() * 0.2), tau: tau * 0.4, a: 0.2 },
]

// A bell: the phone's, the tram's, a desk bell.
const bell = (f: number, tau: number): Mode[] => [
  { f, tau, a: 1 },
  { f: f * 2.76, tau: tau * 0.5, a: 0.45 },
  { f: f * 5.4, tau: tau * 0.25, a: 0.22 },
  { f: f * 8.93, tau: tau * 0.12, a: 0.1 },
]

// Paper moving: noise with a crinkle, through a band that rises as the sheet moves.
function paper(sec: number, r: Rand, env: [number, number][], f0: number, f1: number, crinkle = 3): Buf {
  const n = white(sec, r)
  mul(n, shape(sec, env))
  mul(n, grit(sec, r, crinkle, 0.35))
  return sweep(n, 'bp', f0, f1, 0.9)
}

// A handful of keys: small metal hits spread over `sec`, landing in a cluster.
function keys(sec: number, r: Rand, count = 9): Buf {
  const out = zeros(sec + 0.3)
  for (let k = 0; k < count; k++) {
    const t = Math.pow(r(), 1.6) * sec
    add(out, modal(0.3, metal(2600 + r() * 3200, 0.04 + r() * 0.07, r), r), t, 0.25 + 0.4 * r())
  }
  return out
}

// An engine idling: a putter of lowpassed pulses at the firing rate.
function engine(sec: number, rate: number, r: Rand): Buf {
  const out = zeros(sec + 0.1)
  for (let t = 0; t < sec; t += (1 / rate) * (0.94 + r() * 0.12)) {
    add(out, burst(0.05, r, 'lp', 260, 0.012), t, 0.6 + 0.4 * r())
    add(out, modal(0.06, [{ f: 55, tau: 0.02, a: 1 }], r), t, 0.5)
  }
  return filt(out, 'lp', 420)
}

// ---- the sounds

export const SFX_RECIPES: Record<SfxName, (r: Rand) => Buf | Stereo> = {
  // A soft pencil tap on paper.
  tap: (r) => {
    const out = zeros(0.1)
    add(out, burst(0.03, r, 'bp', 2600, 0.005, 1.4), 0, 0.5)
    add(out, modal(0.08, wood(210, 0.016, 0.3), r), 0, 1)
    return out
  },

  // One quick page flick.
  page: (r) => paper(0.22, r, [[0, 0], [0.025, 1], [0.08, 0.55], [0.22, 0]], 1800, 5200),

  // A pencil scratching something out: four quick strokes.
  refuse: (r) => {
    const out = zeros(0.36)
    for (let k = 0; k < 4; k++) {
      const s = white(0.075, r)
      mul(s, shape(0.075, [[0, 0], [0.012, 1], [0.06, 0.7], [0.075, 0]]))
      mul(s, grit(0.075, r, 1.5, 0.25))
      add(out, filt(s, 'bp', 2400 + 600 * (k % 2), 1.8), k * 0.068, 0.8)
    }
    return out
  },

  // A bundle of banknotes dropped on a table.
  collect: (r) => {
    const out = zeros(0.45)
    add(out, modal(0.3, wood(115, 0.05, 0.5), r), 0, 0.9)
    add(out, burst(0.07, r, 'bp', 1600, 0.015, 0.8), 0, 0.8)
    add(out, paper(0.25, r, [[0, 0], [0.02, 0.6], [0.25, 0]], 3200, 4200, 4), 0.015, 0.6)
    return out
  },

  // A banknote counter: a motor and the notes flicking through.
  launder: (r) => {
    const out = zeros(1.05)
    const motor = filt(osc(1.0, SAW, 96), 'lp', 480)
    mul(motor, shape(1.0, [[0, 0], [0.08, 1], [0.85, 1], [1.0, 0]]))
    add(out, motor, 0, 0.22)
    for (let t = 0.06; t < 0.9; t += 1 / 32 + (r() - 0.5) * 0.004) add(out, burst(0.008, r, 'bp', 4200, 0.0018, 1.5), t, 0.55 + 0.25 * r())
    return out
  },

  // Two clacks of an abacus.
  buy: (r) => {
    const out = zeros(0.3)
    for (const [t, g] of [
      [0, 0.9],
      [0.085, 0.7],
    ] as const) {
      add(out, modal(0.12, [{ f: 1250 + r() * 120, tau: 0.024, a: 1 }, { f: 2900 + r() * 200, tau: 0.014, a: 0.6 }, { f: 4300 + r() * 300, tau: 0.009, a: 0.3 }], r), t, g)
      add(out, burst(0.006, r, 'hp', 2000, 0.0012), t, 0.35 * g)
    }
    return out
  },

  // A light rubber stamp.
  upgrade: (r) => {
    const out = zeros(0.3)
    add(out, modal(0.25, wood(140, 0.035, 0.45), r), 0, 0.8)
    add(out, burst(0.03, r, 'lp', 2500, 0.006), 0, 0.5)
    return out
  },

  // A heavy metal bar set down on wood.
  gold: (r) => {
    const out = zeros(1.0)
    add(out, modal(0.2, wood(105, 0.04, 0.4), r), 0, 0.8)
    add(out, modal(1.0, [{ f: 880, tau: 0.35, a: 0.5 }, { f: 1418, tau: 0.25, a: 0.35 }, { f: 2370, tau: 0.18, a: 0.25 }, { f: 3610, tau: 0.1, a: 0.15 }], r), 0, 0.5)
    return filt(out, 'lp', 6000)
  },

  // An old car door shut, the starter, and the engine catching.
  'job-start': (r) => {
    const out = zeros(2.2)
    add(out, modal(0.35, wood(75, 0.07, 0.6), r), 0, 0.9)
    add(out, burst(0.12, r, 'lp', 700, 0.025), 0, 0.6)
    add(out, modal(0.05, metal(2600, 0.008, r), r), 0.012, 0.22)
    const t0 = 0.45
    for (let k = 0; k < 5; k++) {
      const crank = white(0.11, r)
      mul(crank, shape(0.11, [[0, 0], [0.02, 1], [0.11, 0]]))
      add(out, filt(crank, 'lp', 600), t0 + k * 0.13, 0.3)
      add(out, mul(filt(osc(0.11, SAW, 68 + k * 3), 'lp', 300), shape(0.11, [[0, 0], [0.02, 1], [0.11, 0]])), t0 + k * 0.13, 0.25)
    }
    const idle = engine(1.15, 26, r)
    mul(idle, shape(1.25, [[0, 0], [0.06, 1], [0.7, 0.8], [1.15, 0]]))
    add(out, idle, t0 + 0.66, 0.7)
    return out
  },

  // Keys tossed on a table.
  'job-done': (r) => {
    const out = zeros(0.75)
    add(out, keys(0.3, r, 7), 0, 0.6)
    add(out, modal(0.2, wood(160, 0.03, 0.4), r), 0.3, 0.6)
    add(out, keys(0.18, r, 6), 0.3, 0.5)
    return out
  },

  // A door slammed, heard through a wall.
  'job-fail': (r) => {
    const out = zeros(0.6)
    add(out, modal(0.6, wood(58, 0.12, 0.7), r), 0, 1)
    add(out, burst(0.15, r, 'lp', 450, 0.03), 0, 0.8)
    return room(filt(out, 'lp', 1800), 0.25)
  },

  // A rotary phone: two bells hammered for about a second.
  phone: (r) => {
    const out = zeros(1.9)
    for (let t = 0, k = 0; t < 1.1; t += 1 / 24, k++) add(out, modal(0.5, bell(k % 2 ? 1180 : 1320, 0.32), r), t, 0.2)
    filt(out, 'peak', 2400, 1, 4)
    return filt(out, 'hp', 300)
  },

  // Three firm knocks on a wooden door.
  knock: (r) => {
    const out = zeros(0.75)
    for (const t of [0, 0.19, 0.38]) {
      add(out, modal(0.15, wood(170 + r() * 15, 0.04, 0.6), r), t, 1)
      add(out, burst(0.012, r, 'bp', 1800, 0.002, 1), t, 0.45)
    }
    return room(out, 0.15)
  },

  // A door kicked in, and a siren a street away.
  raid: (r) => {
    const out = zeros(3.0)
    add(out, modal(0.8, wood(52, 0.15, 0.8), r), 0, 1)
    const crack = white(0.25, r)
    mul(crack, decay(0.25, 0.04))
    mul(crack, grit(0.25, r, 1.5, 0))
    add(out, filt(crack, 'bp', 1400, 0.7), 0.005, 0.9)
    const siren = osc(2.5, TRI, (t) => (Math.floor(t / 0.42) % 2 ? 660 : 880))
    mul(siren, shape(2.5, [[0, 0], [0.4, 1], [1.8, 0.8], [2.5, 0]]))
    add(out, filt(siren, 'lp', 1400), 0.35, 0.18)
    return room(out, 0.3, 0.8)
  },

  // A manga panel slid across: soft paper.
  panel: (r) => paper(0.18, r, [[0, 0], [0.05, 0.8], [0.18, 0]], 1500, 3000, 5),

  // A heavy book page turned, and landing.
  chapter: (r) => {
    const out = zeros(0.55)
    add(out, paper(0.5, r, [[0, 0], [0.2, 0.6], [0.32, 1], [0.4, 0.3], [0.5, 0]], 900, 3500), 0, 1)
    add(out, modal(0.1, wood(140, 0.03, 0.3), r), 0.38, 0.35)
    return out
  },

  // A heavy rubber stamp slammed on a ledger.
  stamp: (r) => {
    const out = zeros(0.5)
    add(out, modal(0.5, [{ f: 95, tau: 0.08, a: 1 }, { f: 210, tau: 0.05, a: 0.6 }, { f: 470, tau: 0.025, a: 0.3 }, { f: 1020, tau: 0.012, a: 0.15 }], r), 0, 1)
    add(out, burst(0.05, r, 'lp', 3500, 0.008), 0, 0.8)
    add(out, modal(0.06, [{ f: 900, tau: 0.012, a: 1 }, { f: 2100, tau: 0.006, a: 0.4 }], r), 0.004, 0.25)
    return room(out, 0.12)
  },

  // A fountain pen writing: three strokes, a nib on paper.
  ink: (r) => {
    const out = zeros(0.75)
    ;[0, 0.22, 0.46].forEach((t, k) => {
      const sec = 0.17 + 0.03 * k
      const s = white(sec, r)
      mul(s, shape(sec, [[0, 0], [0.03, 1], [sec - 0.04, 0.8], [sec, 0]]))
      mul(s, grit(sec, r, 0.8, 0.4))
      add(out, filt(s, 'bp', 5200 - 400 * k, 3), t, 0.7)
      add(out, burst(0.004, r, 'hp', 4000, 0.001), t, 0.3)
    })
    return out
  },

  // Two keystrokes on a typewriter.
  typewriter: (r) => {
    const out = zeros(0.3)
    for (const t of [0, 0.11]) {
      add(out, modal(0.06, metal(1900 + r() * 200, 0.012, r), r), t, 0.6)
      add(out, modal(0.08, wood(180, 0.02, 0.3), r), t + 0.004, 0.7)
      add(out, burst(0.006, r, 'hp', 3000, 0.0012), t, 0.4)
    }
    return out
  },

  // An envelope slid across the desk.
  envelope: (r) => {
    const out = zeros(0.4)
    add(out, paper(0.3, r, [[0, 0], [0.06, 0.8], [0.24, 0.6], [0.3, 0]], 1200, 2600, 6), 0, 1)
    add(out, modal(0.08, wood(300, 0.02, 0.3), r), 0.28, 0.4)
    return out
  },

  // A ring of keys taken from the hook.
  keys: (r) => keys(0.55, r, 14),

  // A pencil underline and a desk bell.
  'rank-up': (r) => {
    const out = zeros(1.0)
    add(out, paper(0.25, r, [[0, 0], [0.03, 0.8], [0.22, 0.8], [0.25, 0]], 2300, 2800, 3), 0, 0.6)
    add(out, modal(0.8, bell(1568, 0.6), r), 0.22, 0.35)
    return out
  },

  // A hall murmuring, then applause.
  election: (r) => {
    const out = zeros(2.6)
    for (let v = 0; v < 12; v++) {
      const voice = white(2.4, r)
      const syll = 3 + r() * 2.5
      const ph = r() * 6
      for (let i = 0; i < voice.length; i++) voice[i] *= 0.5 + 0.5 * Math.sin((2 * Math.PI * syll * i) / SR + ph)
      add(out, filt(voice, 'bp', 380 + r() * 700, 4), 0, 0.12)
    }
    mul(out, shape(2.6, [[0, 0], [0.3, 1], [1.2, 0.7], [2.6, 0.2]]))
    for (let t = 0.7; t < 2.5; t += 1 / (8 + 26 * Math.sin((Math.PI * (t - 0.7)) / 1.8)) + r() * 0.01) add(out, burst(0.012, r, 'bp', 1200 + r() * 1200, 0.003, 1), t, 0.5)
    return room(out, 0.25)
  },

  // A ratchet winding faster and faster: time skipping ahead.
  skip: (r) => {
    const out = zeros(1.15)
    for (let t = 0, rate = 8; t < 1.05; t += 1 / rate, rate *= 1.1) add(out, modal(0.03, [{ f: 3400, tau: 0.004, a: 1 }, { f: 5200, tau: 0.003, a: 0.5 }], r), t, 0.6)
    const whoosh = white(1.1, r)
    mul(whoosh, shape(1.1, [[0, 0], [0.8, 0.5], [1.1, 0]]))
    add(out, sweep(whoosh, 'bp', 400, 2000, 1.2), 0, 0.3)
    return out
  },

  // An adding machine tallying: three pulls of the lever.
  away: (r) => {
    const out = zeros(1.25)
    for (let k = 0; k < 3; k++) {
      const t = k * 0.36
      const pull = white(0.14, r)
      mul(pull, shape(0.14, [[0, 0], [0.1, 0.6], [0.14, 0]]))
      add(out, sweep(pull, 'bp', 300, 1200, 1.5), t, 0.4)
      add(out, modal(0.12, wood(220, 0.03, 0.5), r), t + 0.14, 0.8)
      add(out, modal(0.08, metal(1600, 0.02, r), r), t + 0.145, 0.3)
    }
    return out
  },

  // Rain on the window and a tram going by, as a 40-second loop.
  'amb-cover': (r) => {
    const sec = 44
    const out = stereo(sec)
    for (const side of [0, 1] as const) {
      const rain = pink(sec, r)
      filt(rain, 'hp', 400)
      filt(rain, 'lp', 7000)
      add(out[side], rain, 0, 0.35)
      add(out[side], filt(brown(sec, r), 'lp', 150), 0, 0.5)
    }
    for (let t = 0; t < sec; t += r() / 25) addSt(out, modal(0.06, [{ f: 3000 + r() * 4000, tau: 0.006 + r() * 0.012, a: 1 }], r), t, 0.05 + 0.06 * r(), r() * 1.6 - 0.8)
    // The tram, heard through the glass: rumble, wheels on the rail joints, its bell.
    const t0 = 10
    const pass = 16
    const rumble = filt(brown(pass, r), 'lp', 260)
    mul(rumble, shape(pass, [[0, 0], [6, 0.8], [8, 1], [10, 0.8], [pass, 0]]))
    // Left to right as it passes.
    add(out[0], mul(rumble.slice(), shape(pass, [[0, 1], [pass, 0.25]])), t0, 1.2)
    add(out[1], mul(rumble.slice(), shape(pass, [[0, 0.25], [pass, 1]])), t0, 1.2)
    for (let t = 1; t < pass - 1; t += 1.1) {
      const near = 1 - Math.abs(t - 8) / 8
      const pan = -0.8 + (1.6 * t) / pass
      for (const dt of [0, 0.13]) {
        const clack = modal(0.08, [{ f: 620, tau: 0.03, a: 1 }, { f: 1300, tau: 0.015, a: 0.5 }, { f: 90, tau: 0.04, a: 0.8 }], r)
        addSt(out, filt(clack, 'lp', 2500), t0 + t + dt, 0.35 * near, pan)
      }
    }
    for (const dt of [0, 0.28]) addSt(out, filt(modal(0.8, bell(1250, 0.5), r), 'lp', 3500), t0 + 4 + dt, 0.12, -0.5)
    return crossLoop(out, 40, 4)
  },
}

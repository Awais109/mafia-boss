// Seeded PRNG with seed derivation. Every random roll in the engine comes from
// derive(...parts): the same parts always give the same sequence, so a reconcile
// window always produces the same raids and op outcomes (plan §2.1).

export type Rand = {
  next(): number // [0, 1)
  range(min: number, max: number): number // [min, max)
  int(min: number, max: number): number // [min, max], inclusive
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
}

export type RngFactory = {
  seed: string
  derive(...parts: (string | number)[]): Rand
}

export function makeRng(seed: string): RngFactory {
  return {
    seed,
    derive: (...parts) => rand(`${seed}|${parts.join('|')}`),
  }
}

function rand(key: string): Rand {
  const h = xmur3(key)
  const next = sfc32(h(), h(), h(), h())
  // Discard the first few outputs; sfc32 needs a moment to mix similar seeds.
  for (let i = 0; i < 12; i++) next()
  const r: Rand = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
  }
  return r
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

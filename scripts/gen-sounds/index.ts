// npm run gen-sounds [names…] (docs/sound.md, "Generating sounds").
//
// Makes every sound and track from scratch (./sfx, ./music) into assets/sounds/generated/<name>.wav, ignored by
// git; the npm script then runs `npm run sounds`, which prepares them like any other file. A generated file
// only stands in: a file of yours in raw/ always wins, and a generated one never replaces a sound you added.
// Every run makes the same sounds (each is seeded by its name). With names, it makes only those.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { MUSIC_NAMES, SFX_NAMES } from '../../app/sound/cues'
import { isStereo, normalize, seeded, SR, writeWav } from './dsp'
import { MUSIC_RECIPES } from './music'
import { SFX_RECIPES } from './sfx'

const OUT = join(__dirname, '../../assets/sounds/generated')
const RECIPES = [...SFX_NAMES.map((n) => [n, SFX_RECIPES[n]] as const), ...MUSIC_NAMES.map((n) => [n, MUSIC_RECIPES[n]] as const)]

const wanted = process.argv.slice(2)
const unknown = wanted.filter((w) => !RECIPES.some(([n]) => n === w))
if (unknown.length) {
  console.error(`Not sound names: ${unknown.join(', ')}. Names: ${RECIPES.map(([n]) => n).join(', ')}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
for (const [name, make] of RECIPES) {
  if (wanted.length && !wanted.includes(name)) continue
  const started = Date.now()
  const x = normalize(make(seeded(name)), 0.89)
  writeWav(join(OUT, `${name}.wav`), x)
  const sec = (isStereo(x) ? x[0] : x).length / SR
  console.log(`generated/${name}.wav  ${sec.toFixed(2)} s ${isStereo(x) ? 'stereo' : 'mono'}  (${Date.now() - started} ms)`)
}

// npm run sounds (ADR 0055; docs/sound.md).
//
// 1. Any file in assets/sounds/raw/ named after a sound (stamp.wav, theme.m4a, …: the names are SFX_NAMES and
//    MUSIC_NAMES in app/sound/cues.ts) is prepared with ffmpeg into assets/sounds/sfx/ or music/ as mp3:
//    one-shots trimmed of silence at both ends and peaked at PEAK_DB, stings trimmed at the start only,
//    loops left whole and evened out to a loudness. A raw file older than its mp3 is skipped.
// 2. Any file in assets/sounds/generated/ (made by `npm run gen-sounds`) is prepared the same way, but only as a
//    stand-in: where raw/ has no file of that name, and the mp3 is missing or was generated too. The mp3 says
//    which it is (its comment tag is GENERATED), so a sound you added is never replaced by a generated one.
// 3. app/sound/files.ts is rewritten to list every mp3 there, so the app plays exactly the files it has.
//
// raw/ and generated/ are ignored by git; the prepared mp3s are committed. A prepared mp3 can also be copied
// straight into sfx/ or music/, and this only lists it.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import { MUSIC, MUSIC_NAMES, SFX, SFX_NAMES } from '../app/sound/cues'

const ROOT = join(__dirname, '..')
const DIR = join(ROOT, 'assets/sounds')
const RAW = join(DIR, 'raw')
const GEN = join(DIR, 'generated')
const GENERATED = 'sevgorod-generated'
const OUT = { sfx: join(DIR, 'sfx'), music: join(DIR, 'music') }
const MANIFEST = join(ROOT, 'app/sound/files.ts')
const RAW_EXTS = ['.wav', '.mp3', '.m4a', '.aif', '.aiff', '.flac', '.ogg', '.caf']

// The targets: one-shots peak at PEAK_DB, with headroom for the mp3 encoder's overshoot; loops sit at an
// integrated loudness (LUFS), music under ambience. A trimmed edge gets a few milliseconds' fade, so it can't click.
const PEAK_DB = -4
const LOOP_LUFS = { music: -20, ambience: -24 }
const TRIM_START = 'silenceremove=start_periods=1:start_threshold=-50dB,afade=t=in:d=0.005'
const TRIM_BOTH = `${TRIM_START},areverse,silenceremove=start_periods=1:start_threshold=-50dB,afade=t=in:d=0.01,areverse`

type Kind = 'sfx' | 'music'
const kindOf = (name: string): Kind | null =>
  (SFX_NAMES as readonly string[]).includes(name) ? 'sfx' : (MUSIC_NAMES as readonly string[]).includes(name) ? 'music' : null

function ffmpeg(args: string[]): string {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8' })
  if (r.error) throw new Error('ffmpeg not found: install it (macOS: brew install ffmpeg) and run again.')
  if (r.status !== 0) throw new Error(r.stderr.split('\n').slice(-6).join('\n'))
  return r.stderr
}

// The loudest sample after `filters`, in dB.
function peakDb(input: string, filters: string): number {
  const out = ffmpeg(['-i', input, '-af', `${filters},volumedetect`, '-f', 'null', '-'])
  const m = /max_volume: (-?[\d.]+) dB/.exec(out)
  return m ? Number(m[1]) : 0
}

// Sound effects are mono, music and loops stereo, all at 44.1 kHz. The format comes first in the chain, so the
// peak is measured on what gets encoded (a downmix to mono can add a few dB).
const FORMAT = { mono: 'aformat=sample_rates=44100:channel_layouts=mono', stereo: 'aformat=sample_rates=44100:channel_layouts=stereo' }

function prepare(input: string, name: string, kind: Kind, output: string, generated: boolean): string {
  // The source's own tags are dropped; a generated file is marked as one.
  const tags = ['-map_metadata', '-1', ...(generated ? ['-metadata', `comment=${GENERATED}`] : [])]
  const loop = kind === 'sfx' ? SFX[name as keyof typeof SFX].loop === true : MUSIC[name as keyof typeof MUSIC].loop
  if (loop) {
    const lufs = kind === 'music' ? LOOP_LUFS.music : LOOP_LUFS.ambience
    ffmpeg(['-y', '-i', input, '-af', `loudnorm=I=${lufs}:TP=-2,${FORMAT.stereo}`, '-b:a', '160k', ...tags, output])
    return `loop at ${lufs} LUFS`
  }
  // A one-shot is trimmed at both ends; a sting only at the start, so it keeps its tail.
  const chain = kind === 'sfx' ? `${FORMAT.mono},${TRIM_BOTH}` : `${FORMAT.stereo},${TRIM_START}`
  const gain = PEAK_DB - peakDb(input, chain)
  ffmpeg(['-y', '-i', input, '-af', `${chain},volume=${gain.toFixed(2)}dB`, '-b:a', kind === 'sfx' ? '96k' : '160k', ...tags, output])
  return `trimmed, peak ${PEAK_DB} dB`
}

// Whether an mp3 was made from a generated file (its comment tag).
function isGenerated(mp3: string): boolean {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags=comment', '-of', 'default=nw=1:nk=1', mp3], { encoding: 'utf8' })
  return r.stdout?.trim() === GENERATED
}

const mtime = (path: string): number => statSync(path).mtimeMs

// The source files in a folder that are sound names, by name. Of two with one name, the newer.
function sources(dir: string, label: string): Map<string, string> {
  const found = new Map<string, string>()
  if (!existsSync(dir)) return found
  for (const file of readdirSync(dir).sort()) {
    const { name, ext } = parse(file)
    if (file.startsWith('.') || !RAW_EXTS.includes(ext.toLowerCase())) continue
    if (!kindOf(name)) {
      console.warn(`skipped ${label}/${file}: "${name}" isn't a sound name. Names: ${[...SFX_NAMES, ...MUSIC_NAMES].join(', ')}`)
      continue
    }
    const path = join(dir, file)
    const prev = found.get(name)
    if (!prev || mtime(path) > mtime(prev)) found.set(name, path)
  }
  return found
}

function processSources(): void {
  const raw = sources(RAW, 'raw')
  // Yours: always over a generated mp3, otherwise when newer than the mp3.
  for (const [name, input] of raw) {
    const kind = kindOf(name)!
    const output = join(OUT[kind], `${name}.mp3`)
    if (existsSync(output) && !isGenerated(output) && mtime(output) >= mtime(input)) continue
    console.log(`${kind}/${name}.mp3 ← raw/${parse(input).base} (${prepare(input, name, kind, output, false)})`)
  }
  // Generated: only where you have nothing.
  for (const [name, input] of sources(GEN, 'generated')) {
    if (raw.has(name)) continue
    const kind = kindOf(name)!
    const output = join(OUT[kind], `${name}.mp3`)
    if (existsSync(output) && (!isGenerated(output) || mtime(output) >= mtime(input))) continue
    console.log(`${kind}/${name}.mp3 ← generated/${parse(input).base} (${prepare(input, name, kind, output, true)})`)
  }
}

// The mp3s in a folder that are sound names, sorted.
function present(kind: Kind): string[] {
  if (!existsSync(OUT[kind])) return []
  const names = kind === 'sfx' ? (SFX_NAMES as readonly string[]) : (MUSIC_NAMES as readonly string[])
  return readdirSync(OUT[kind])
    .filter((f) => f.endsWith('.mp3'))
    .map((f) => f.slice(0, -4))
    .filter((n) => {
      if (names.includes(n)) return true
      console.warn(`not listed: ${kind}/${n}.mp3 isn't a sound name`)
      return false
    })
    .sort()
}

function writeManifest(sfx: string[], music: string[]): void {
  const key = (n: string) => (/^[a-z]\w*$/.test(n) ? n : `'${n}'`)
  const block = (kind: Kind, names: string[]) =>
    names.length ? `{\n${names.map((n) => `  ${key(n)}: require('../../assets/sounds/${kind}/${n}.mp3'),`).join('\n')}\n}` : '{}'
  writeFileSync(
    MANIFEST,
    `// Generated by \`npm run sounds\` (scripts/sounds.ts) from the files in assets/sounds/. Don't edit by hand:
// add a file and run the script. A sound that isn't listed here plays its fallback, or nothing.
import type { MusicName, SfxName } from './cues'

export const SFX_FILES: Partial<Record<SfxName, number>> = ${block('sfx', sfx)}

export const MUSIC_FILES: Partial<Record<MusicName, number>> = ${block('music', music)}
`,
  )
}

function main(): void {
  for (const dir of [RAW, OUT.sfx, OUT.music]) mkdirSync(dir, { recursive: true })
  try {
    processSources()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
  const sfx = present('sfx')
  const music = present('music')
  writeManifest(sfx, music)
  const missing = [...SFX_NAMES.filter((n) => !sfx.includes(n)), ...MUSIC_NAMES.filter((n) => !music.includes(n))]
  const standIns = [...sfx.map((n) => ['sfx', n] as const), ...music.map((n) => ['music', n] as const)]
    .filter(([kind, n]) => isGenerated(join(OUT[kind], `${n}.mp3`)))
    .map(([, n]) => n)
  console.log(`app/sound/files.ts: ${sfx.length} of ${SFX_NAMES.length} sounds, ${music.length} of ${MUSIC_NAMES.length} tracks.`)
  if (standIns.length) console.log(`Generated stand-ins (${standIns.length}), to replace with found sounds: ${standIns.join(', ')}`)
  if (missing.length) console.log(`Still missing: ${missing.join(', ')}`)
}

main()

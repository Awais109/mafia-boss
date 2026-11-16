// The app icon, Android's adaptive layers, the splash image and the favicon, drawn from the game's own palette
// and wordmark font (ADR 0070, docs/native-builds.md). Each image is an SVG written here and rendered to PNG by
// headless Chrome, so nothing else needs installing. Run `npm run icons` after changing the mark; the PNGs in
// assets/ are committed. Chrome is found at its usual macOS and Linux paths, or set CHROME.
//
// The mark is a brass seal: a double ring, as a stamp leaves, with the wordmark's S inside and the Dirty
// diamond above and below it.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { colors } from '../app/theme'

const ROOT = resolve(__dirname, '..')
const FONT = join(ROOT, 'node_modules/@expo-google-fonts/fira-sans-extra-condensed/800ExtraBold/FiraSansExtraCondensed_800ExtraBold.ttf')
const ground = colors.bg // #16130f, the shell
const brass = colors.accent // #c9a86a

const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))

// The seal, centred on (512, 512), `r` its outer radius, in one colour. `small` (the favicon): one bolder ring,
// since a hairline blurs at 48 px.
function seal(r: number, ink: string, small = false): string {
  const k = r / 400
  const diamond = (y: number) => {
    const s = 40 * k
    return `<path d="M512 ${y - s}L${512 + s * 0.72} ${y}L512 ${y + s}L${512 - s * 0.72} ${y}Z" fill="${ink}"/>`
  }
  const rings = small
    ? [`<circle cx="512" cy="512" r="${r - 22 * k}" fill="none" stroke="${ink}" stroke-width="${44 * k}"/>`]
    : [
        `<circle cx="512" cy="512" r="${r - 13 * k}" fill="none" stroke="${ink}" stroke-width="${26 * k}"/>`,
        `<circle cx="512" cy="512" r="${r - 48 * k}" fill="none" stroke="${ink}" stroke-width="${9 * k}"/>`,
      ]
  return [
    ...rings,
    diamond(512 - 272 * k),
    diamond(512 + 272 * k),
    `<text x="512" y="${512 + 176 * k}" text-anchor="middle" font-family="Mark" font-size="${510 * k}" fill="${ink}">S</text>`,
  ].join('')
}

// The warm-dark ground, a little lighter where the seal sits.
const groundFill = `<defs><radialGradient id="g" cx="50%" cy="46%" r="70%"><stop offset="0" stop-color="#2a221a"/><stop offset="1" stop-color="${ground}"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>`

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`

// Android's adaptive icon is masked to a shape inside 108 dp, of which the middle 66 dp always shows: the seal
// keeps to that circle (radius 0.66 × 512 ≈ 338).
const ANDROID_R = 300

const IMAGES: { file: string; size: number; transparent: boolean; svg: string }[] = [
  { file: 'icon.png', size: 1024, transparent: false, svg: svg(groundFill + seal(400, brass)) },
  { file: 'android-icon-background.png', size: 1024, transparent: false, svg: svg(groundFill) },
  { file: 'android-icon-foreground.png', size: 1024, transparent: true, svg: svg(seal(ANDROID_R, brass)) },
  { file: 'android-icon-monochrome.png', size: 1024, transparent: true, svg: svg(seal(ANDROID_R, '#ffffff')) },
  {
    file: 'splash-icon.png',
    size: 1024,
    transparent: true,
    svg: svg(
      `<g transform="translate(0 -70)">${seal(330, brass)}</g>` +
        `<text x="512" y="960" text-anchor="middle" font-family="Mark" font-size="118" letter-spacing="38" fill="${brass}">SEVGOROD</text>`,
    ),
  },
  { file: 'favicon.png', size: 48, transparent: false, svg: svg(groundFill + seal(470, brass, true)) },
]

function render(dir: string, image: (typeof IMAGES)[number]): void {
  const font = readFileSync(FONT).toString('base64')
  const page = join(dir, `${image.file}.html`)
  writeFileSync(
    page,
    `<!doctype html><html><head><style>@font-face{font-family:Mark;src:url(data:font/ttf;base64,${font})}` +
      `html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block;width:${image.size}px;height:${image.size}px}</style></head>` +
      `<body>${image.svg}</body></html>`,
  )
  const out = join(ROOT, 'assets', image.file)
  execFileSync(
    CHROME!,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=${join(dir, 'chrome')}`,
      `--window-size=${image.size},${image.size}`,
      '--force-device-scale-factor=1',
      ...(image.transparent ? ['--default-background-color=00000000'] : []),
      '--virtual-time-budget=2000',
      `--screenshot=${out}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  )
  console.log(`assets/${image.file}  ${image.size}×${image.size}${image.transparent ? '  transparent' : ''}`)
}

if (!CHROME) {
  console.error('No Chrome found: set CHROME to its path.')
  process.exit(1)
}
const dir = mkdtempSync(join(tmpdir(), 'sevgorod-icons-'))
try {
  for (const image of IMAGES) render(dir, image)
} finally {
  rmSync(dir, { recursive: true, force: true })
}

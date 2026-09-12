import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir, platform, tmpdir } from 'node:os'
import { join } from 'node:path'

// Environment doctor: what running and installing Sevgorod needs on this machine, and how to fix
// each gap. Usage: npm run doctor [-- general|android|ios]
//
// Requirements come from installed packages where possible (react-native's `engines.node` and its
// Android version catalog), so they follow upgrades. The Xcode minimum can't be read locally: it
// comes from Expo's SDK compatibility table. Update MIN_XCODE when upgrading the Expo SDK.

const MIN_XCODE = '26.4' // Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
const MIN_MACOS_FOR_XCODE = '26.2' // Xcode 26.4 needs macOS Tahoe 26.2: https://developer.apple.com/support/xcode/
const MIN_IOS_RUNTIME = '16.4' // Expo SDK 57 deployment target

type Level = 'ok' | 'warn' | 'fail' | 'info'
type Check = { level: Level; label: string; detail: string; fix?: string }

const ok = (label: string, detail: string): Check => ({ level: 'ok', label, detail })
const info = (label: string, detail: string): Check => ({ level: 'info', label, detail })
const warn = (label: string, detail: string, fix?: string): Check => ({ level: 'warn', label, detail, fix })
const fail = (label: string, detail: string, fix?: string): Check => ({ level: 'fail', label, detail, fix })

function run(cmd: string, args: string[], env: Record<string, string> = {}): string | null {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 30_000 })
  if (r.error || r.status === null) return null
  return `${r.stdout ?? ''}${r.stderr ?? ''}`.trim()
}

function readJson(path: string): Record<string, any> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

// ---- versions

const parts = (v: string) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)

function compare(a: string, b: string): number {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

// Enough of semver ranges for `engines` fields: `||` of `^x.y.z`, `>=`, `>`, `<=`, `<`, or exact.
function satisfies(version: string, range: string): boolean {
  return range.split('||').some((clause) =>
    clause
      .trim()
      .split(/\s+(?=[<>=^~\d])/)
      .filter(Boolean)
      .every((term) => {
        const m = term.match(/^(\^|~|>=|<=|>|<|=)?\s*v?(\d+(?:\.\d+){0,2})$/)
        if (!m) return false
        const [, op = '=', target] = m
        const c = compare(version, target)
        if (op === '^') return c >= 0 && parts(version)[0] === parts(target)[0]
        if (op === '~') return c >= 0 && parts(version)[0] === parts(target)[0] && parts(version)[1] === parts(target)[1]
        if (op === '>=') return c >= 0
        if (op === '>') return c > 0
        if (op === '<=') return c <= 0
        if (op === '<') return c < 0
        return c === 0
      }),
  )
}

// ---- facts shared by the readiness summary

const facts = {
  deps: false,
  node: false,
  jdk17: false,
  androidSdk: false,
  adb: false,
  avds: 0,
  androidDevices: 0,
  androidPackage: false,
  androidBuildParts: true, // SDK Platform, Build tools and NDK at React Native's versions
  xcodeForNative: false,
  xcodeAny: false,
  cocoapods: false,
  iosRuntimes: 0,
  bundleId: false,
}

function general(): Check[] {
  const out: Check[] = []
  const rn = readJson('node_modules/react-native/package.json')
  const expo = readJson('node_modules/expo/package.json')
  facts.deps = rn !== null && expo !== null
  out.push(
    facts.deps
      ? ok('Dependencies', `expo ${expo!.version}, react-native ${rn!.version}`)
      : fail('Dependencies', 'node_modules is missing or incomplete', 'npm install'),
  )

  const range: string | undefined = rn?.engines?.node
  facts.node = range ? satisfies(process.versions.node, range) : true
  out.push(
    facts.node
      ? ok('Node', `${process.version}${range ? ` (react-native supports ${range})` : ''}`)
      : fail('Node', `${process.version} is outside react-native's supported range ${range}`, 'Install a supported Node, e.g. brew install node@22 (or nvm install 22)'),
  )

  const app = readJson('app.json')?.expo ?? {}
  facts.bundleId = typeof app.ios?.bundleIdentifier === 'string'
  facts.androidPackage = typeof app.android?.package === 'string'
  out.push(
    facts.bundleId
      ? ok('iOS bundle ID', app.ios.bundleIdentifier)
      : warn('iOS bundle ID', 'app.json has no expo.ios.bundleIdentifier (needed to install on an iPhone)', 'Add "bundleIdentifier": "com.yourname.sevgorod" under expo.ios'),
    facts.androidPackage
      ? ok('Android package', app.android.package)
      : warn('Android package', 'app.json has no expo.android.package (needed to install on an Android device)', 'Add "package": "com.yourname.sevgorod" under expo.android'),
  )
  return out
}

function androidCatalog(): { compileSdk?: string; buildTools?: string; ndkVersion?: string } {
  try {
    const toml = readFileSync('node_modules/react-native/gradle/libs.versions.toml', 'utf8')
    const get = (key: string) => toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'))?.[1]
    return { compileSdk: get('compileSdk'), buildTools: get('buildTools'), ndkVersion: get('ndkVersion') }
  } catch {
    return {}
  }
}

function javaMajor(javaHome: string): string | null {
  const out = run(join(javaHome, 'bin', 'java'), ['-version'])
  return out?.match(/version "(\d+)/)?.[1] ?? null
}

// Same search order as scripts/with-native-env.sh.
function findJdk17(): string | null {
  const candidates = [
    process.env.JAVA_HOME,
    existsSync('/usr/libexec/java_home') ? run('/usr/libexec/java_home', ['-v', '17']) : null,
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    join(homedir(), 'Applications/Android Studio.app/Contents/jbr/Contents/Home'),
  ]
  return candidates.find((c): c is string => !!c && existsSync(join(c, 'bin', 'java')) && javaMajor(c) === '17') ?? null
}

function findAndroidSdk(): string | null {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, join(homedir(), 'Library/Android/sdk'), join(homedir(), 'Android/Sdk')]
  return candidates.find((c): c is string => !!c && existsSync(c)) ?? null
}

function android(): Check[] {
  const out: Check[] = []
  const need = androidCatalog()

  const jdk = findJdk17()
  facts.jdk17 = jdk !== null
  const shellJava = run('java', ['-version'])?.match(/version "(\d+)/)?.[1]
  out.push(
    jdk
      ? ok('JDK 17', shellJava === '17' ? jdk : `${jdk} (your shell uses Java ${shellJava ?? 'none'}; the npm scripts switch to 17)`)
      : fail('JDK 17', 'not found', 'brew install --cask zulu@17, or install Android Studio (it bundles a JDK 17)'),
  )

  const sdk = findAndroidSdk()
  facts.androidSdk = sdk !== null
  if (!sdk) {
    out.push(fail('Android SDK', 'not found', 'Install Android Studio and open it once; the SDK goes to ~/Library/Android/sdk'))
    return out
  }
  out.push(ok('Android SDK', process.env.ANDROID_HOME ? sdk : `${sdk} (ANDROID_HOME is unset; the npm scripts set it)`))

  const component = (label: string, dir: string, fix: string) => {
    const present = existsSync(join(sdk, dir))
    if (!present) facts.androidBuildParts = false
    out.push(present ? ok(label, 'installed') : warn(label, 'not installed; the first build may download it (needs accepted SDK licenses), installing it first is more reliable', fix))
  }
  const sdkManager = 'Android Studio → Settings → Languages & Frameworks → Android SDK'
  if (need.compileSdk) component(`SDK Platform ${need.compileSdk}`, `platforms/android-${need.compileSdk}`, `${sdkManager} → SDK Platforms → Android ${need.compileSdk}`)
  if (need.buildTools) component(`Build tools ${need.buildTools}`, `build-tools/${need.buildTools}`, `${sdkManager} → SDK Tools → Show Package Details → Build-Tools ${need.buildTools}`)
  if (need.ndkVersion) component(`NDK ${need.ndkVersion}`, `ndk/${need.ndkVersion}`, `${sdkManager} → SDK Tools → Show Package Details → NDK ${need.ndkVersion} (about 1 GB)`)
  out.push(
    existsSync(join(sdk, 'licenses', 'android-sdk-license'))
      ? ok('SDK licenses', 'accepted')
      : warn('SDK licenses', 'not accepted, so Gradle can’t download missing parts', `Accept them in ${sdkManager}`),
  )

  const adb = join(sdk, 'platform-tools', 'adb')
  facts.adb = existsSync(adb)
  if (!facts.adb) {
    out.push(fail('adb', 'platform-tools not installed', `${sdkManager} → SDK Tools → Android SDK Platform-Tools`))
  } else {
    const devices = (run(adb, ['devices', '-l']) ?? '').split('\n').slice(1).map((l) => l.trim()).filter(Boolean)
    facts.androidDevices = devices.filter((l) => /\sdevice\s/.test(`${l} `)).length
    if (devices.length === 0) out.push(info('Android devices', 'none connected (enable USB debugging and plug a phone in to install on it)'))
    for (const line of devices) {
      const [serial, state] = line.split(/\s+/)
      const model = line.match(/model:(\S+)/)?.[1] ?? serial
      if (state === 'device') out.push(ok('Android device', `${model} (${serial})`))
      else out.push(warn('Android device', `${model} is ${state}`, state === 'unauthorized' ? 'Unlock the phone and accept the “Allow USB debugging” prompt' : 'Reconnect the cable'))
    }
  }

  const emulator = join(sdk, 'emulator', 'emulator')
  const avds = existsSync(emulator) ? (run(emulator, ['-list-avds']) ?? '').split('\n').filter((l) => l && !l.startsWith('INFO')) : []
  facts.avds = avds.length
  out.push(avds.length ? ok('Emulators', avds.join(', ')) : warn('Emulators', 'none', 'Android Studio → Device Manager → create a virtual device (needed only for /start-android without a phone)'))
  return out
}

function ios(): Check[] {
  if (platform() !== 'darwin') return [info('iOS', 'skipped: building for iOS needs a Mac')]
  const out: Check[] = []
  const macos = run('sw_vers', ['-productVersion']) ?? '0'
  out.push(info('macOS', macos))

  const selected = run('xcode-select', ['-p']) ?? ''
  const xcode = run('xcodebuild', ['-version'])?.match(/^Xcode (\d+(?:\.\d+)*)/m)?.[1] ?? null
  facts.xcodeAny = xcode !== null && !selected.includes('CommandLineTools')
  facts.xcodeForNative = facts.xcodeAny && compare(xcode!, MIN_XCODE) >= 0
  const upgrade =
    compare(macos, MIN_MACOS_FOR_XCODE) < 0
      ? `Update macOS to Tahoe ${MIN_MACOS_FOR_XCODE} or later (this Mac has ${macos}), then install the latest Xcode from the App Store`
      : 'Install the latest Xcode from the App Store'
  if (!xcode) out.push(fail('Xcode', 'not installed', upgrade))
  else if (selected.includes('CommandLineTools')) out.push(fail('Xcode', 'the command line tools are selected instead of Xcode', 'sudo xcode-select -s /Applications/Xcode.app'))
  else if (!facts.xcodeForNative) out.push(fail('Xcode', `${xcode} can’t build this project for an iPhone; Expo SDK 57 needs ${MIN_XCODE}+ (Expo Go still works)`, upgrade))
  else out.push(ok('Xcode', xcode))

  const pod = run('pod', ['--version'], { LANG: 'en_US.UTF-8' })
  facts.cocoapods = !!pod && /^\d+\.\d+/m.test(pod)
  out.push(facts.cocoapods ? ok('CocoaPods', pod!.split('\n').pop()!) : fail('CocoaPods', 'not installed', 'brew install cocoapods'))
  const lang = process.env.LANG ?? ''
  out.push(/utf-?8/i.test(lang) ? ok('Terminal locale', lang) : info('Terminal locale', `LANG=${lang || 'unset'}; the npm scripts set UTF-8 for CocoaPods`))

  const runtimes = (run('xcrun', ['simctl', 'list', 'runtimes']) ?? '')
    .split('\n')
    .map((l) => l.match(/^iOS (\d+(?:\.\d+)*)/)?.[1])
    .filter((v): v is string => !!v && compare(v, MIN_IOS_RUNTIME) >= 0)
  facts.iosRuntimes = runtimes.length
  out.push(runtimes.length ? ok('Simulator runtimes', runtimes.map((v) => `iOS ${v}`).join(', ')) : warn('Simulator runtimes', `none at iOS ${MIN_IOS_RUNTIME}+`, 'Xcode → Settings → Components (needed only for /start-ios)'))

  const file = join(tmpdir(), `sevgorod-devices-${process.pid}.json`)
  if (run('xcrun', ['devicectl', 'list', 'devices', '--json-output', file]) !== null && existsSync(file)) {
    const devices: any[] = readJson(file)?.result?.devices ?? []
    for (const d of devices) {
      const p = d.deviceProperties ?? {}
      const model = d.hardwareProperties?.marketingName ?? 'device'
      const state = d.connectionProperties?.tunnelState === 'connected' ? 'connected' : 'not connected'
      out.push(info('Apple device', `${p.name ?? model} (${model}), iOS ${p.osVersionNumber ?? '?'}, developer mode ${p.developerModeStatus ?? '?'}, ${state}`))
    }
  }
  return out
}

// ---- output

const SECTIONS: Record<string, () => Check[]> = { general, android, ios }
const wanted = process.argv.slice(2).filter((a) => a in SECTIONS)
const names = wanted.length ? wanted : Object.keys(SECTIONS)
const MARK: Record<Level, string> = { ok: '✓', warn: '!', fail: '✗', info: '·' }
let failures = 0

for (const name of names) {
  console.log(`\n${name.toUpperCase()}`)
  for (const c of SECTIONS[name]()) {
    if (c.level === 'fail') failures++
    console.log(`  ${MARK[c.level]} ${c.label.padEnd(20)} ${c.detail}`)
    if (c.fix) console.log(`  ${' '.repeat(22)} → ${c.fix}`)
  }
}

if (names.length === Object.keys(SECTIONS).length) {
  const yes = (v: boolean) => (v ? 'yes' : 'no').padEnd(5)
  // Node outside react-native's range is flagged above, but it doesn't stop the JS toolchain running.
  const base = facts.deps
  // Missing SDK build parts may download on the first build, but that isn't guaranteed: say "maybe".
  const installAndroid = base && facts.jdk17 && facts.androidSdk && facts.adb && facts.androidPackage
  const installAndroidMark = !installAndroid ? yes(false) : facts.androidBuildParts ? yes(true) : 'maybe'
  const installAndroidNotes = [
    installAndroid && !facts.androidBuildParts ? 'the first build must download missing SDK parts' : '',
    facts.androidDevices ? '' : 'connect a device first',
  ].filter(Boolean)
  console.log('\nREADY TO')
  console.log(`  ${yes(base)}  play on a phone with Expo Go (npx expo start, scan the QR code)`)
  console.log(`  ${yes(base && facts.adb && facts.avds > 0)}  /start-android: Expo Go on an Android emulator`)
  console.log(`  ${installAndroidMark}  /install-android: a standalone build on an Android device${installAndroidNotes.length ? ` (${installAndroidNotes.join('; ')})` : ''}`)
  console.log(`  ${yes(base && facts.xcodeAny && facts.iosRuntimes > 0)}  /start-ios: Expo Go on an iOS simulator`)
  console.log(`  ${yes(base && facts.xcodeForNative && facts.cocoapods && facts.bundleId)}  /install-ios: a standalone build on an iPhone`)
  if (!facts.node) console.log('  (Node is outside react-native’s supported range: fix that before relying on these)')
}

console.log(failures ? `\n${failures} problem${failures === 1 ? '' : 's'} to fix (see → above).` : '\nNo blocking problems.')
process.exit(failures ? 1 : 0)

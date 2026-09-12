import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ConfigError, PRESET_NAMES, tryBuildConfig, type Overrides, type PresetName } from '../engine'
import { simulate } from './driver'
import { CASUAL, withSessions } from './persona'
import { checkOk, formatSummary, summarize, toCsv, type Summary } from './report'

// npm run sim -- --preset default --days 5 --seed 42 [--sessions 3] [--runs 10] [--set heat.baseControl=6]

type Args = {
  preset: string
  days: number
  seed: string
  sessions?: number
  runs: number
  out: string
  csv: boolean
  set: Overrides
}

const USAGE = `Usage: npm run sim -- [options]
  --preset <name>     ${PRESET_NAMES.join(' | ')} (default: default)
  --days <n>          sim days (default: 5)
  --seed <s>          seed (default: 42)
  --sessions <n>      n evenly spaced sessions a day instead of the casual schedule
  --runs <n>          run n seeds (seed, seed+1, …) and print the mean of each target
  --set path=value    override a config value, repeatable (e.g. --set heat.baseControl=6)
  --out <dir>         CSV directory (default: sim/out)
  --no-csv            skip the CSV`

function parseArgs(argv: string[]): Args {
  const args: Args = { preset: 'default', days: 5, seed: '42', runs: 1, out: 'sim/out', csv: true, set: {} }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = () => {
      const v = argv[++i]
      if (v === undefined) fail(`${flag} needs a value`)
      return v
    }
    switch (flag) {
      case '--preset': args.preset = value(); break
      case '--days': args.days = Number(value()); break
      case '--seed': args.seed = value(); break
      case '--sessions': args.sessions = Number(value()); break
      case '--runs': args.runs = Number(value()); break
      case '--out': args.out = value(); break
      case '--no-csv': args.csv = false; break
      case '--set': {
        const [path, raw] = value().split('=')
        args.set[path] = raw === 'true' ? true : raw === 'false' ? false : Number(raw)
        break
      }
      case '--help':
      case '-h':
        console.log(USAGE)
        process.exit(0)
        break
      default:
        fail(`unknown argument ${flag}`)
    }
  }
  if (!(args.days > 0)) fail('--days must be positive')
  return args
}

function fail(msg: string): never {
  console.error(`${msg}\n\n${USAGE}`)
  process.exit(1)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!PRESET_NAMES.includes(args.preset as PresetName)) fail(`unknown preset ${args.preset}`)
  const { config, errors } = tryBuildConfig(args.preset as PresetName, args.set)
  if (errors.length) {
    console.error(new ConfigError(errors).message)
    process.exit(1)
  }
  const persona = args.sessions ? withSessions(CASUAL, args.sessions) : CASUAL
  const label = Object.keys(args.set).length ? `${args.preset}+${Object.keys(args.set).length}` : args.preset

  if (args.runs > 1) {
    const summaries: Summary[] = []
    for (let r = 0; r < args.runs; r++) {
      const seed = String(Number.isNaN(Number(args.seed)) ? `${args.seed}${r}` : Number(args.seed) + r)
      summaries.push(summarize(simulate({ config, preset: label, days: args.days, seed, persona })))
    }
    printRuns(summaries)
    return
  }

  const trace = simulate({ config, preset: label, days: args.days, seed: args.seed, persona })
  const summary = summarize(trace)
  console.log(formatSummary(summary))
  if (args.csv) {
    mkdirSync(args.out, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    const file = join(args.out, `${date}-${args.preset}-${args.seed}.csv`)
    writeFileSync(file, toCsv(trace))
    console.log(`\nCSV → ${file}`)
  }
}

function printRuns(summaries: Summary[]) {
  const first = summaries[0]
  console.log(`${first.title.replace(/seed=\S+/, `seeds=${summaries.length}`)}\n`)
  for (let i = 0; i < first.checks.length; i++) {
    const values = summaries.map((s) => s.checks[i].value).filter((v): v is number => v !== null && !Number.isNaN(v))
    const reached = values.length
    const avg = reached ? values.reduce((a, b) => a + b, 0) / reached : null
    const check = { ...first.checks[i], value: avg }
    const passing = summaries.filter((s) => checkOk(s.checks[i]) === true).length
    const ok = checkOk(check)
    console.log(
      `${check.name.padEnd(32)} mean ${avg === null ? '—' : avg.toFixed(2).padStart(7)}   target ${check.min}–${check.max}   ` +
        `${ok === null ? '·' : ok ? '✓' : '✗'}  (${passing}/${summaries.length} runs in range${reached < summaries.length ? `, ${summaries.length - reached} not reached` : ''})`,
    )
  }
}

main()

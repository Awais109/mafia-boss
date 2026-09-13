import { useMemo, useState } from 'react'
import { Platform, StyleSheet, TextInput, View } from 'react-native'
import { configLeaves, getPath, PRESET_NAMES } from '../../engine'
import { formatSummary, summarize } from '../../sim/report'
import { Btn, BtnRow, Card, colors, Row, Screen, T } from '../components/ui'
import { fmt, fmtClock, fmtDuration } from '../format'
import { store, type Snapshot } from '../store'
import type { ScreenProps } from './types'

// Everything behind config.debug.enabled (plan §10): time, state, config, inspect, data, bot.

type Panel = 'time' | 'state' | 'config' | 'inspect' | 'data' | 'bot'
const PANELS: { id: Panel; title: string }[] = [
  { id: 'time', title: 'Time' },
  { id: 'state', title: 'State' },
  { id: 'config', title: 'Config' },
  { id: 'inspect', title: 'Inspect' },
  { id: 'data', title: 'Save & log' },
  { id: 'bot', title: 'Bot' },
]

export function DebugScreen({ game }: ScreenProps) {
  const [panel, setPanel] = useState<Panel>('time')
  return (
    <Screen>
      <BtnRow>
        {PANELS.map((p) => (
          <Btn key={p.id} small kind={panel === p.id ? 'primary' : 'ghost'} title={p.title} onPress={() => setPanel(p.id)} />
        ))}
      </BtnRow>
      {panel === 'time' && <TimePanel game={game} />}
      {panel === 'state' && <StatePanel game={game} />}
      {panel === 'config' && <ConfigPanel game={game} />}
      {panel === 'inspect' && <InspectPanel game={game} />}
      {panel === 'data' && <DataPanel game={game} />}
      {panel === 'bot' && <BotPanel />}
    </Screen>
  )
}

function TimePanel({ game }: { game: Snapshot }) {
  const { state: s, config: c, now, realNow } = game
  const H = c.time.hourMs
  const [hours, setHours] = useState('')
  const skip = (ms: number) => store.dispatch({ type: 'DEBUG_ADD_OFFSET', ms: Math.round(ms) })
  return (
    <Card>
      <Row label="Real time" value={new Date(realNow).toLocaleString()} />
      <Row label="Game time" value={fmtClock(now, s.createdAt, c)} />
      <Row label="Offset" value={s.debugOffsetMs ? fmtDuration(s.debugOffsetMs, c) : 'none'} />
      <BtnRow>
        <Btn small title="+15m" onPress={() => skip(H / 4)} />
        <Btn small title="+1h" onPress={() => skip(H)} />
        <Btn small title="+6h" onPress={() => skip(6 * H)} />
        <Btn small title="+1d" onPress={() => skip(24 * H)} />
      </BtnRow>
      <View style={styles.inline}>
        <TextInput style={styles.input} value={hours} onChangeText={setHours} placeholder="hours" placeholderTextColor={colors.faint} keyboardType="decimal-pad" />
        <Btn
          small
          title="Skip"
          disabled={!(Number(hours) > 0)}
          onPress={() => {
            skip(Number(hours) * H)
            setHours('')
          }}
        />
      </View>
      <Btn small kind="danger" title="Reset offset" disabled={!s.debugOffsetMs} onPress={() => store.dispatch({ type: 'DEBUG_RESET_OFFSET' })} />
      <T small muted>
        Skipping is exactly like waiting: the engine reconciles the gap. Resetting shifts every timestamp back, so nothing freezes.
      </T>
    </Card>
  )
}

function StatePanel({ game }: { game: Snapshot }) {
  const { state: s } = game
  const [heat, setHeat] = useState('')
  const [rep, setRep] = useState('')
  const d = store.dispatch
  return (
    <>
      <Card>
        <T bold>Grant</T>
        <BtnRow>
          <Btn small title="+◆100" onPress={() => d({ type: 'DEBUG_GRANT', dirty: 100 })} />
          <Btn small title="+◆1000" onPress={() => d({ type: 'DEBUG_GRANT', dirty: 1000 })} />
          <Btn small title="+●100" onPress={() => d({ type: 'DEBUG_GRANT', clean: 100 })} />
          <Btn small title="+●1000" onPress={() => d({ type: 'DEBUG_GRANT', clean: 1000 })} />
          <Btn small title="+✦5" onPress={() => d({ type: 'DEBUG_GRANT', influence: 5 })} />
          <Btn small title="+▮40" onPress={() => d({ type: 'DEBUG_GRANT', cigarettes: 40 })} />
          <Btn small title="+▰10" onPress={() => d({ type: 'DEBUG_GRANT', gold: 10 })} />
        </BtnRow>
      </Card>
      <Card>
        <T bold>Set</T>
        <NumberField label={`Heat (${Math.round(s.heat)})`} value={heat} onChange={setHeat} onSet={(v) => d({ type: 'DEBUG_SET_HEAT', heat: v })} />
        <NumberField label={`Rep (${fmt(s.reputation)})`} value={rep} onChange={setRep} onSet={(v) => d({ type: 'DEBUG_SET_REP', reputation: v })} />
      </Card>
      <Card>
        <T bold>Force</T>
        <BtnRow>
          <Btn small kind="danger" title="Raid" onPress={() => d({ type: 'DEBUG_FORCE_RAID' })} />
          <Btn small kind="danger" title="Arrest" onPress={() => d({ type: 'DEBUG_FORCE_ARREST' })} />
          <Btn small title="Tolya visits" onPress={() => d({ type: 'DEBUG_FORCE_TOLYA' })} />
          <Btn small title={`Finish ${s.ops.length} jobs`} disabled={!s.ops.length} onPress={() => d({ type: 'DEBUG_COMPLETE_OPS' })} />
          <Btn small title="New recruits" onPress={() => d({ type: 'DEBUG_REFRESH_POOL' })} />
          <Btn small title="Incident" onPress={() => d({ type: 'DEBUG_FORCE_INCIDENT' })} />
          <Btn small title="New offers" onPress={() => d({ type: 'DEBUG_REFRESH_OFFERS' })} />
        </BtnRow>
      </Card>
    </>
  )
}

function NumberField({ label, value, onChange, onSet }: { label: string; value: string; onChange: (v: string) => void; onSet: (v: number) => void }) {
  const valid = value.trim() !== '' && Number.isFinite(Number(value))
  return (
    <View style={styles.inline}>
      <T small muted style={{ flex: 1 }}>
        {label}
      </T>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numbers-and-punctuation" placeholderTextColor={colors.faint} />
      <Btn
        small
        title="Set"
        disabled={!valid}
        onPress={() => {
          onSet(Number(value))
          onChange('')
        }}
      />
    </View>
  )
}

function ConfigPanel({ game }: { game: Snapshot }) {
  const { config: c, settings, configErrors } = game
  const presetConfig = useMemo(() => store.presetConfig(), [settings.preset]) // eslint-disable-line react-hooks/exhaustive-deps
  const leaves = useMemo(() => configLeaves(c), [c])
  const groups = useMemo(() => [...new Set(leaves.map((l) => l.path.split('.')[0]))], [leaves])
  const [open, setOpen] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const overrideCount = Object.keys(settings.overrides).length

  const commit = (path: string) => {
    const text = drafts[path]
    if (text === undefined) return
    const value = Number(text)
    if (text.trim() === '' || value === getPath(presetConfig, path)) store.setOverride(path, null)
    else if (Number.isFinite(value)) store.setOverride(path, value)
    setDrafts((cur) => {
      const next = { ...cur }
      delete next[path]
      return next
    })
  }

  return (
    <>
      <Card>
        <T bold>Preset</T>
        <BtnRow>
          {PRESET_NAMES.map((p) => (
            <Btn key={p} small kind={settings.preset === p ? 'primary' : 'ghost'} title={p} onPress={() => store.setPreset(p)} />
          ))}
        </BtnRow>
        <Row label="Your overrides" value={String(overrideCount)} />
        <Btn small kind="danger" title="Reset all overrides" disabled={!overrideCount} onPress={() => store.resetOverrides()} />
        <T small muted>Changes apply on the next action; nothing restarts. Saves never contain config.</T>
        {configErrors.length > 0 && (
          <View>
            {configErrors.map((e) => (
              <T key={e} small color={colors.heat}>
                {e}
              </T>
            ))}
            <T small color={colors.heat}>
              Running on plain defaults until this is fixed.
            </T>
          </View>
        )}
      </Card>
      {groups.map((g) => {
        const changed = Object.keys(settings.overrides).filter((path) => path.startsWith(`${g}.`)).length
        return (
          <Card key={g}>
            <Row
              label={`${g}${changed ? ` · ${changed} changed` : ''}`}
              value={<Btn small kind="ghost" title={open === g ? 'Close' : 'Open'} onPress={() => setOpen(open === g ? null : g)} />}
            />
            {open === g && changed > 0 && <Btn small kind="danger" title="Reset group" onPress={() => store.resetOverrides(`${g}.`)} />}
            {open === g &&
              leaves
                .filter((leaf) => leaf.path.startsWith(`${g}.`))
                .map((leaf) => {
                  const overridden = leaf.path in settings.overrides
                  const preset = getPath(presetConfig, leaf.path)
                  const label = leaf.path.slice(g.length + 1)
                  if (typeof leaf.value === 'boolean') {
                    return (
                      <Row
                        key={leaf.path}
                        label={label}
                        value={
                          <Btn
                            small
                            kind={overridden ? 'primary' : 'normal'}
                            title={String(leaf.value)}
                            onPress={() => store.setOverride(leaf.path, overridden ? null : !leaf.value)}
                          />
                        }
                      />
                    )
                  }
                  return (
                    <View key={leaf.path} style={styles.inline}>
                      <T small color={overridden ? colors.accent : colors.muted} style={{ flex: 1 }}>
                        {label}
                      </T>
                      {overridden && <T small color={colors.faint}>{String(preset)}</T>}
                      <TextInput
                        style={[styles.input, { width: 90 }]}
                        value={drafts[leaf.path] ?? String(leaf.value)}
                        onChangeText={(text) => setDrafts((cur) => ({ ...cur, [leaf.path]: text }))}
                        onSubmitEditing={() => commit(leaf.path)}
                        onBlur={() => commit(leaf.path)}
                        keyboardType="numbers-and-punctuation"
                        selectTextOnFocus
                      />
                    </View>
                  )
                })}
          </Card>
        )
      })}
    </>
  )
}

function InspectPanel({ game }: { game: Snapshot }) {
  const { state: s, derived: d, config: c } = game
  const n = (v: number) => v.toFixed(2)
  const rows: [string, string][] = [
    ['yieldPerHr', n(d.yieldPerHr)],
    ['tributePerHr', n(d.tributePerHr)],
    ['vaultCap (base, +stash h)', `${n(d.vaultCap)} (${n(d.vaultCapBase)}, +${n(d.stashHours)})`],
    ['raid shield', n(d.raidShield)],
    ['exposure (rackets + fronts)', `${n(d.exposure)} (${n(d.racketExposure)} + ${n(d.frontSuspicion)})`],
    ['control', n(d.control)],
    ['heat → target', `${n(s.heat)} → ${n(d.heatTarget)}`],
    ['inspected', String(s.inspected)],
    ['wagesPerHr (owed)', `${n(d.wagesPerHr)} (${n(s.wagesOwed)})`],
    ['upkeepPerHr (owed)', `${n(d.upkeepPerHr)} (${n(s.upkeepOwed)})`],
    ['stock / cap (made − demand)', `${n(d.supply.stock)} / ${n(d.supply.cap)} (${n(d.supply.madePerHr)} − ${n(d.supply.demandPerHr)})${s.stockEmpty ? ' SHORT' : ''}`],
    ['influencePerHr', n(d.influencePerHr)],
    ['throughput / clean max', `${n(d.throughputPerHr)} / ${n(d.cleanPerHrMax)}`],
    ['crewSlots / maxTier', `${d.crewSlots} / ${d.maxTier}`],
    ['act / rep', `${s.act} / ${n(s.reputation)}`],
    ['inbox / offers', `${s.inbox.length} / ${s.offers.items.length} (refresh #${s.offers.refreshCount})`],
    ['gold / skipped', `${s.gold} / ${n(s.skippedMs / c.time.hourMs)} h`],
    ['goals done', `${s.goals.done.length} / ${c.goals.list.length}`],
  ]
  return (
    <>
      <Card>
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </Card>
      <Card>
        <T bold>Rackets</T>
        {s.rackets.map((r, i) => {
          const rd = d.perRacket[i]
          return (
            <T key={r.id} small style={styles.mono}>
              {`${r.id} ${r.type} (${rd.kind}) T${r.tier} @${r.districtId} y=${n(rd.yield)} up=${n(rd.upkeep)} packs=${n(rd.packsPerHr)} served=${n(rd.served)} trib=${n(rd.tribute)} exp=${n(rd.exposure)} cond=${r.condition.toFixed(1)}${r.enforcerId ? ' +enf' : ''}`}
            </T>
          )
        })}
      </Card>
      <Card>
        <T bold>Fronts</T>
        {d.perFront.map((f) => (
          <T key={f.id} small style={styles.mono}>
            {`${f.id} ${f.type} rate=${n(f.rate)} tp=${f.throughput} util=${n(f.util)} susp=${n(f.suspicion)}`}
          </T>
        ))}
      </Card>
      <Card>
        <T bold>Stats</T>
        <T small style={styles.mono}>
          {JSON.stringify({ ...s.stats, opsByCrew: undefined }, null, 1)}
        </T>
      </Card>
    </>
  )
}

function DataPanel({ game }: { game: Snapshot }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <>
      <Card>
        <T bold>Export</T>
        <T small muted>Shares the save or the full event log as JSON. A log replays in the sim: npm run sim -- --replay file.json</T>
        <BtnRow>
          <Btn small kind="primary" title="Export save" onPress={() => void store.exportSave()} />
          <Btn small kind="primary" title="Export log" onPress={() => void store.exportLog()} />
        </BtnRow>
      </Card>
      <Card>
        <T bold>Import save</T>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Paste a save’s JSON"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error && <T small color={colors.heat}>{error}</T>}
        <Btn
          small
          title="Import"
          disabled={!text.trim()}
          onPress={() => {
            const e = store.importSave(text)
            setError(e)
            if (!e) setText('')
          }}
        />
      </Card>
      <Card>
        <T bold>New game</T>
        <T small muted>{`Player ${game.state.playerId.slice(0, 8)} · ${game.state.stats.sessions} sessions`}</T>
        {confirmReset ? (
          <BtnRow>
            <Btn
              small
              kind="danger"
              title="Yes, wipe this save"
              onPress={() => {
                store.resetGame()
                setConfirmReset(false)
              }}
            />
            <Btn small kind="ghost" title="Cancel" onPress={() => setConfirmReset(false)} />
          </BtnRow>
        ) : (
          <Btn small kind="danger" title="Start over" onPress={() => setConfirmReset(true)} />
        )}
      </Card>
    </>
  )
}

function BotPanel() {
  const [report, setReport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const run = (days: number) => {
    setBusy(true)
    // Let the "Playing…" state render before the synchronous run.
    setTimeout(() => {
      const trace = store.runBot(days)
      setReport(trace ? formatSummary(summarize(trace)) : null)
      setBusy(false)
    }, 50)
  }
  return (
    <Card>
      <T bold>Bot</T>
      <T small muted>
        Plays this save as the engaged-casual persona from the sim, then moves the clock forward with it. Shows what an on-pace game looks
        like without playing it.
      </T>
      <BtnRow>
        {[1, 3, 5].map((days) => (
          <Btn key={days} small kind="primary" disabled={busy} title={`Play ${days} day${days > 1 ? 's' : ''}`} onPress={() => run(days)} />
        ))}
      </BtnRow>
      {busy && <T small muted>Playing…</T>}
      {report && (
        <T small style={styles.mono}>
          {report}
        </T>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    fontSize: 13,
    minWidth: 70,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11 },
})

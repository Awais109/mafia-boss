import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { MIX, MUSIC, pickMusic, pickSfx, SFX, type MusicName, type SfxName } from './cues'
import { MUSIC_FILES, SFX_FILES } from './files'

// The player (ADR 0055; docs/sound.md): one-shot sounds, a music loop, an ambience loop, and stings, over
// expo-audio. The rules of what plays live in ./cues; this only plays them. Silent on web: the web build is
// the screenshot rig, and nobody plays there.

export type AudioPrefs = { sound: boolean; music: boolean }

const ON = Platform.OS !== 'web'

// One looping bed that fades between tracks: the music, or the cover's ambience.
class Loop {
  private player: AudioPlayer | null = null
  private playing: number | null = null // the asset now loaded
  private target = 0 // the volume to fade to
  private fade: ReturnType<typeof setInterval> | null = null

  // Fades to `asset` at `volume`, or out to silence for null.
  set(asset: number | null, volume: number): void {
    if (asset === this.playing && asset !== null) {
      this.target = volume
      if (this.player && !this.player.playing) this.player.play()
      this.fadeTo(volume)
      return
    }
    this.fadeTo(0, () => {
      if (asset === null) {
        this.player?.pause()
        this.playing = null
        return
      }
      if (!this.player) this.player = createAudioPlayer(asset)
      else this.player.replace(asset)
      this.player.loop = true
      this.player.volume = 0
      this.player.play()
      this.playing = asset
      this.fadeTo(volume)
    })
  }

  pause(): void {
    this.stopFade()
    this.player?.pause()
  }

  resume(): void {
    if (this.player && this.playing !== null) {
      this.player.volume = this.target
      this.player.play()
    }
  }

  private fadeTo(volume: number, then?: () => void): void {
    this.stopFade()
    this.target = volume
    const p = this.player
    const from = p?.volume ?? 0
    if (!p || from === volume) {
      then?.()
      return
    }
    let step = 0
    this.fade = setInterval(() => {
      step++
      p.volume = from + ((volume - from) * step) / MIX.fadeSteps
      if (step >= MIX.fadeSteps) {
        this.stopFade()
        then?.()
      }
    }, MIX.fadeMs / MIX.fadeSteps)
  }

  private stopFade(): void {
    if (this.fade) clearInterval(this.fade)
    this.fade = null
  }
}

class SoundPlayer {
  private prefs: AudioPrefs = { sound: true, music: true }
  private active = true // the app is in the foreground
  private started = false
  private shots = new Map<SfxName, AudioPlayer>()
  private stingPlayer: AudioPlayer | null = null
  private last: { name: SfxName; at: number } | null = null
  private music = new Loop()
  private ambience = new Loop()
  private wantedMusic: MusicName | null = null
  private previewMusic: MusicName | null = null // Debug's sound board, over the context's music
  private wantedAmbience: SfxName | null = null

  // Once, when the app starts: respect the silent switch, play alongside anything else the phone is playing,
  // and go quiet in the background.
  start(): () => void {
    if (!ON || this.started) return () => {}
    this.started = true
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {})
    const sub = AppState.addEventListener('change', (s) => this.onAppState(s))
    return () => sub.remove()
  }

  configure(prefs: AudioPrefs): void {
    this.prefs = prefs
    this.applyLoops()
  }

  // A one-shot. Within `MIX.gapMs` of another, only the higher priority plays (ties keep the first).
  play(name: SfxName | null): void {
    if (!name || !ON || !this.prefs.sound || !this.active) return
    const file = pickSfx(name, SFX_FILES)
    if (!file || SFX[file].loop) return
    const now = Date.now()
    if (this.last && now - this.last.at < MIX.gapMs && SFX[this.last.name].priority >= SFX[file].priority) return
    this.last = { name: file, at: now }
    const p = this.shot(file)
    p.volume = SFX[file].volume
    void p
      .seekTo(0)
      .then(() => p.play())
      .catch(() => {})
  }

  // A press's tap, unless the press itself made a sound (it bought something, or was refused).
  tap(): void {
    if (!ON || !this.prefs.sound) return
    const pressedAt = Date.now()
    setTimeout(() => {
      if (!this.last || this.last.at < pressedAt) this.play('tap')
    }, MIX.tapDeferMs)
  }

  // A sting: once, over the loop. Under the Music switch.
  sting(name: MusicName): void {
    if (!ON || !this.prefs.music || !this.active) return
    const file = pickMusic(name, MUSIC_FILES)
    const asset = file ? MUSIC_FILES[file] : undefined
    if (!file || asset === undefined || MUSIC[file].loop) return
    if (!this.stingPlayer) this.stingPlayer = createAudioPlayer(asset)
    else this.stingPlayer.replace(asset)
    this.stingPlayer.volume = MUSIC[file].volume
    this.stingPlayer.play()
  }

  // The music for where the player is (`musicFor` in ./cues); null for none.
  setMusic(name: MusicName | null): void {
    this.wantedMusic = name
    this.applyLoops()
  }

  // The cover's ambience, under the Sound switch.
  setAmbience(name: SfxName | null): void {
    this.wantedAmbience = name
    this.applyLoops()
  }

  // Debug's sound board: play a track over the context's music, or null to give it back.
  preview(name: MusicName | null): void {
    this.previewMusic = name
    this.applyLoops()
  }

  // Which files the build has, for the sound board.
  has(): { sfx: Partial<Record<SfxName, number>>; music: Partial<Record<MusicName, number>> } {
    return { sfx: SFX_FILES, music: MUSIC_FILES }
  }

  private applyLoops(): void {
    if (!ON || !this.active) return
    const track = this.prefs.music ? pickMusic(this.previewMusic ?? this.wantedMusic, MUSIC_FILES) : null
    this.music.set(track ? (MUSIC_FILES[track] ?? null) : null, track ? MUSIC[track].volume : 0)
    const bed = this.prefs.sound && this.wantedAmbience ? pickSfx(this.wantedAmbience, SFX_FILES) : null
    this.ambience.set(bed ? (SFX_FILES[bed] ?? null) : null, bed ? SFX[bed].volume : 0)
  }

  private shot(name: SfxName): AudioPlayer {
    let p = this.shots.get(name)
    if (!p) {
      p = createAudioPlayer(SFX_FILES[name]!)
      this.shots.set(name, p)
    }
    return p
  }

  private onAppState(status: AppStateStatus): void {
    if (status === 'active' && !this.active) {
      this.active = true
      void setIsAudioActiveAsync(true).catch(() => {})
      this.music.resume()
      this.ambience.resume()
      this.applyLoops()
    } else if (status === 'background' && this.active) {
      this.active = false
      this.music.pause()
      this.ambience.pause()
      void setIsAudioActiveAsync(false).catch(() => {})
    }
  }
}

export const sound = new SoundPlayer()

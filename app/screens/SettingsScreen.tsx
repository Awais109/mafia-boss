import { Btn, Item, List, Note, PageHead, Screen, Section, Segmented } from '../components/ui'
import { MUSIC_FILES, SFX_FILES } from '../sound/files'
import { store } from '../store'
import type { ScreenProps } from './types'

const ON_OFF = [
  { key: 'on', title: 'On' },
  { key: 'off', title: 'Off' },
] as const

// Settings (ADR 0055): the player's own preferences, kept with the settings file and never in the save: sound
// effects and music, each on or off. And the play log to share, which testers need without Debug (ADR 0057).
export function SettingsScreen({ game }: ScreenProps) {
  const a = game.settings.audio
  const noFiles = Object.keys(SFX_FILES).length === 0 && Object.keys(MUSIC_FILES).length === 0
  return (
    <Screen>
      <PageHead title="Settings" />
      <Section title="Sound">
        <List>
          <Item label="Sound effects" hint="The ledger, the street, the stamps">
            <Segmented label="Sound effects" options={ON_OFF} value={a.sound ? 'on' : 'off'} onChange={(k) => store.setAudio({ sound: k === 'on' })} />
          </Item>
          <Item label="Music" hint="The city’s themes, and the scenes’ stings">
            <Segmented label="Music" options={ON_OFF} value={a.music ? 'on' : 'off'} onChange={(k) => store.setAudio({ music: k === 'on' })} />
          </Item>
        </List>
        <Note>Both follow the phone’s silent switch, and play alongside anything else you’re listening to.</Note>
        {noFiles && <Note>This build has no sounds in it yet.</Note>}
      </Section>
      <Section title="Your play log">
        <Note>Everything you’ve done and everything that happened, as one file. If you’re testing the game, share it when we ask. Nothing leaves the phone unless you share it.</Note>
        <Btn title="Share my play log" onPress={() => void store.exportLog()} />
      </Section>
    </Screen>
  )
}

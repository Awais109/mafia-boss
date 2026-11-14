import { useEffect, useState } from 'react'
import { Linking } from 'react-native'
import { Btn, Item, List, Note, PageHead, Screen, Section, Segmented } from '../components/ui'
import { notifier, type Permission } from '../notify/notifier'
import { NOTIFY } from '../notify/plan'
import { MUSIC_FILES, SFX_FILES } from '../sound/files'
import { store } from '../store'
import type { ScreenProps } from './types'

const ON_OFF = [
  { key: 'on', title: 'On' },
  { key: 'off', title: 'Off' },
] as const

// Settings (ADR 0055): the player's own preferences, kept with the settings file and never in the save: sound
// effects and music, and notifications (ADR 0058), each on or off. And the play log to share, which testers
// need without Debug (ADR 0057).
export function SettingsScreen({ game }: ScreenProps) {
  const a = game.settings.audio
  const n = game.settings.notify
  const [permission, setPermission] = useState<Permission | null>(null)
  useEffect(() => {
    void notifier.permission().then(setPermission)
  }, [n.on])
  const hour = (h: number) => `${String(h).padStart(2, '0')}:00`
  const setNotifications = (on: boolean) => {
    store.setNotify({ on })
    if (on) void store.askNotifications().then(() => notifier.permission().then(setPermission))
  }
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
      <Section title="Notifications">
        <List>
          <Item label="Notifications" hint="The vault full, the crew back, a short payday, Tolya at the door, a decision waiting">
            <Segmented label="Notifications" options={ON_OFF} value={n.on ? 'on' : 'off'} onChange={(k) => setNotifications(k === 'on')} />
          </Item>
        </List>
        <Note>{`At most ${NOTIFY.maxTotal} while you’re away, and none between ${hour(NOTIFY.quietFrom)} and ${hour(NOTIFY.quietTo)}: those wait for the morning.`}</Note>
        {n.on && permission === 'denied' && (
          <>
            <Note>The phone has notifications turned off for Sevgorod.</Note>
            <Btn title="Open the phone’s settings" onPress={() => void Linking.openSettings()} />
          </>
        )}
      </Section>
      <Section title="Your play log">
        <Note>Everything you’ve done and everything that happened, as one file. If you’re testing the game, share it when we ask. Nothing leaves the phone unless you share it.</Note>
        <Btn title="Share my play log" onPress={() => void store.exportLog()} />
      </Section>
    </Screen>
  )
}

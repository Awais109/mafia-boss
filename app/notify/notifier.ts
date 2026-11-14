import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Planned } from './plan'

// The notifier (ADR 0058; docs/notifications.md): schedules what app/notify/plan.ts works out, over
// expo-notifications. Local only: no push, no server. Silent on web, which is only the screenshot rig.

export type NotifyPrefs = { on: boolean; asked: boolean } // asked: the phone's permission prompt has been shown

const ON = Platform.OS !== 'web'
const CHANNEL = 'city'

export type Permission = 'granted' | 'denied' | 'undetermined' | 'unavailable'

class Notifier {
  private started = false

  // Once, when the app starts. While the app is open the game shows what happens itself, so a notification
  // that comes due then isn't shown, and opening the app clears them (a cold start has no 'active' change to
  // do it). Android needs a channel before it can ask.
  start(): void {
    if (!ON || this.started) return
    this.started = true
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
    })
    if (Platform.OS === 'android') void Notifications.setNotificationChannelAsync(CHANNEL, { name: 'The city', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {})
    void this.clear()
  }

  async permission(): Promise<Permission> {
    if (!ON) return 'unavailable'
    try {
      const p = await Notifications.getPermissionsAsync()
      return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied'
    } catch {
      return 'unavailable'
    }
  }

  // The phone's prompt, if it can still be shown. True if notifications are allowed after it.
  async ask(): Promise<boolean> {
    if (!ON) return false
    try {
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'The city', importance: Notifications.AndroidImportance.DEFAULT })
      const now = await Notifications.getPermissionsAsync()
      if (now.granted || !now.canAskAgain) return now.granted
      const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })
      return r.granted
    } catch {
      return false
    }
  }

  // Replaces whatever was scheduled with `plan`. Nothing if notifications aren't allowed.
  async schedule(plan: Planned[]): Promise<void> {
    if (!ON) return
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
      if ((await this.permission()) !== 'granted') return
      for (const p of plan) {
        await Notifications.scheduleNotificationAsync({
          content: { title: p.title, body: p.body, sound: 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
        })
      }
    } catch {
      // A notification that can't be scheduled is a missed reminder, not a broken game.
    }
  }

  // The player is back: nothing left to remind them of, and nothing in the tray.
  async clear(): Promise<void> {
    if (!ON) return
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
      await Notifications.dismissAllNotificationsAsync()
    } catch {
      // as above
    }
  }
}

export const notifier = new Notifier()

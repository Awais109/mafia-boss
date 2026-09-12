import { File, Paths } from 'expo-file-system'
import { Platform } from 'react-native'

// Local persistence. One JSON document per concern in the app's document directory
// (plan §2.3: AsyncStorage's size limits bite once the event log grows). Web has no file
// system, so it falls back to localStorage — good enough for a quick look in a browser.

export const FILES = {
  save: 'sevgorod-save.json',
  settings: 'sevgorod-settings.json',
  log: 'sevgorod-log.jsonl',
  exportSave: 'sevgorod-export-save.json',
  exportLog: 'sevgorod-export-log.json',
} as const

const isWeb = Platform.OS === 'web'
const local = (): Storage | undefined => (globalThis as { localStorage?: Storage }).localStorage

const fileFor = (name: string) => new File(Paths.document, name)

export const storage = {
  read(name: string): string | null {
    if (isWeb) return local()?.getItem(name) ?? null
    const f = fileFor(name)
    return f.exists ? f.textSync() : null
  },

  write(name: string, text: string): void {
    if (isWeb) {
      local()?.setItem(name, text)
      return
    }
    const f = fileFor(name)
    if (!f.exists) f.create()
    f.write(text)
  },

  append(name: string, text: string): void {
    if (isWeb) {
      const ls = local()
      ls?.setItem(name, (ls.getItem(name) ?? '') + text)
      return
    }
    const f = fileFor(name)
    if (!f.exists) f.create()
    f.write(text, { append: true })
  },

  remove(name: string): void {
    if (isWeb) {
      local()?.removeItem(name)
      return
    }
    const f = fileFor(name)
    if (f.exists) f.delete()
  },

  // file:// URI for the share sheet; null on web, where local files can't be shared.
  uri(name: string): string | null {
    return isWeb ? null : fileFor(name).uri
  },
}

import { Platform } from 'react-native'

// On web only, a query parameter from the page's URL: the screenshot rig opens screens with them
// (`?tab=turf&view=people&person=zhanna`; docs/app.md, "Checking screens against the design"). Always null
// on a phone.
export function webParam(name: string): string | null {
  if (Platform.OS !== 'web') return null
  return new URLSearchParams((globalThis as { location?: { search: string } }).location?.search ?? '').get(name)
}

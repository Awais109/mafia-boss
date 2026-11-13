import { Caveat_500Medium } from '@expo-google-fonts/caveat/500Medium'
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold'
import { FiraSansExtraCondensed_700Bold } from '@expo-google-fonts/fira-sans-extra-condensed/700Bold'
import { FiraSansExtraCondensed_800ExtraBold } from '@expo-google-fonts/fira-sans-extra-condensed/800ExtraBold'
import { FiraSansExtraCondensed_900Black } from '@expo-google-fonts/fira-sans-extra-condensed/900Black'
import { IBMPlexSansCondensed_400Regular } from '@expo-google-fonts/ibm-plex-sans-condensed/400Regular'
import { IBMPlexSansCondensed_500Medium } from '@expo-google-fonts/ibm-plex-sans-condensed/500Medium'
import { IBMPlexSansCondensed_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-condensed/600SemiBold'
import { PatrickHandSC_400Regular } from '@expo-google-fonts/patrick-hand-sc/400Regular'
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite/400Regular'
import { fonts } from './theme'

// Loaded once at start with expo-font's useFonts (App.tsx). The keys are the family names in `fonts`.
export const FONT_ASSETS = {
  [fonts.display700]: FiraSansExtraCondensed_700Bold,
  [fonts.display800]: FiraSansExtraCondensed_800ExtraBold,
  [fonts.display900]: FiraSansExtraCondensed_900Black,
  [fonts.text400]: IBMPlexSansCondensed_400Regular,
  [fonts.text500]: IBMPlexSansCondensed_500Medium,
  [fonts.text600]: IBMPlexSansCondensed_600SemiBold,
  [fonts.speech]: PatrickHandSC_400Regular,
  [fonts.caption]: SpecialElite_400Regular,
  [fonts.hand500]: Caveat_500Medium,
  [fonts.hand700]: Caveat_700Bold,
}

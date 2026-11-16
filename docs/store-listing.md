# Store listing, rating and privacy: drafts

(#48) What the App Store and Google Play ask for before a listing, drafted from what the game is today. Fill in the bracketed parts, and update this when the game changes what it collects (#19 cloud save, #20 analytics, #12 ads and purchases). The privacy policy itself is [PRIVACY.md](../PRIVACY.md).

## The listing

| Field | Limit | Draft |
|---|---|---|
| Name | 30 (App Store) | Sevgorod |
| Subtitle (App Store) | 30 | Build a crime empire, idly |
| Short description (Play) | 80 | Wash dirty money clean faster than the heat catches up. A 1993 crime idle game. |
| Category | | Games · Simulation (second choice: Strategy) |
| Keywords (App Store) | 100 | idle,crime,mafia,tycoon,empire,money,laundering,strategy,story,clicker,90s,city |

**Description** (both stores; the App Store allows 4,000 characters, Play 4,000):

> Sevgorod, 1993. Your uncle Lyosha ran cigarettes out of the state tobacco Combine for twenty years and never got rich, because he never spent a rouble he couldn't explain. Now he's dead. You have his notebook, his driver, an envelope of cash, and a city where everything is suddenly for sale.
>
> Run kiosks, market stalls and a tobacco factory. Send your crew on jobs. Wash the Dirty money through fronts before the heat catches up, and spend the Clean on more of everything.
>
> • Six acts, from a street corner to the hills above the city: the port, the centre, the border, the Kombinat, the mayor's office.
> • A story told in ink-and-pencil scenes, with rivals who remember how you treated them.
> • Decisions that matter: pay Tolya or refuse him, fight a hearing or settle it, go legal or stay in the shadows.
> • Crew who grow with the work: train them, promote them, keep them loyal.
> • An idle game that respects your time: your empire runs while you're away, a few visits a day is plenty, and there's always one clear thing to do next.
> • Plays offline. No ads, no account.

**What's new** (first release): The first release of Sevgorod.

**Screenshots:** the App Store needs 6.9" iPhone screenshots (1320 × 2868, or 1290 × 2796), and Play needs at least two phone screenshots. Suggested: Home with the day's goals; the Map; a scene panel; Business; the Empire by night. The web rig in [app.md](app.md#checking-screens-against-the-design) can make drafts, but final ones should come from a phone.

**Support and marketing URLs:** [where the privacy policy and a support page are hosted]

## Hosting the privacy policy

Both stores need a public web address for the policy. This repository is private, so `PRIVACY.md` isn't reachable from here. The simplest options, either free:
- a public GitHub Gist of `PRIVACY.md`;
- GitHub Pages from a small public repository holding only the policy.

Put the address in App Store Connect (App Privacy → Privacy Policy URL) and in the Play Console (App content → Privacy policy).

## Privacy forms

**App Store, App Privacy:** "Data Not Collected" is accurate today. The game sends nothing, and a play log reaches us only when a tester sends it themselves through the share sheet.

**Google Play, Data safety:**
- Does the app collect or share any of the required user data types? **No**: nothing is transmitted off the device by the app.
- Is data encrypted in transit? Not applicable (nothing is transmitted).
- Can users ask for data to be deleted? Not applicable. Everything is on the phone, and deleting the app removes it.

If the play log is ever sent automatically, or if analytics, crash reporting, cloud saves or ads arrive, these answers change: update them and PRIVACY.md in the same release.

## Content rating

Notes for the questionnaires (Apple's age rating, and IARC in the Play Console). Answer them yourself; these are what the game contains.

| Topic | In the game | Suggested answer |
|---|---|---|
| Violence | Described in text: raids, arrests, injuries, "breaking" a business, attacks on crew. Art panels show no blood or weapons in use. | Infrequent/mild realistic violence |
| Crime | The game's theme: extortion, bribery, smuggling, laundering, running illegal businesses | Apple has no separate item. IARC asks about crime: yes, central to play |
| Tobacco | Cigarettes are a traded good (packs, a tobacco factory, smuggling runs) | Frequent/intense references to tobacco (Apple), which may make it 17+; if read as mild references, 12+ |
| Alcohol | A beer tent business; a crew trait ("alcoholic") | Infrequent/mild references |
| Gambling | A slot hall and a card club exist as businesses you own. The player never bets. | No simulated gambling (Apple's item means the player gambling) |
| Profanity, sexual content, horror | None | None |
| Purchases, ads | None today. Gold is earned in play. | None (update when #12 lands) |
| User-generated content, chat, location | None | None |

Expected results: about **12+** on the App Store (17+ if tobacco is answered as frequent), **PEGI 12 / ESRB Teen** from IARC. Target audience in the Play Console: **18 and over**, or 13+ at the youngest. The game isn't designed for children, which also keeps it out of the Families policy.

## Before submitting

- Settle the identifier and the name under the icon (see [native-builds.md](native-builds.md#tester-builds-that-dont-expire-testflight-and-play-internal-testing)).
- Build with `--profile production`, so Debug is off.
- Host the privacy policy, and fill in the contact email in PRIVACY.md.

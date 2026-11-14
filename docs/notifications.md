# Notifications

Local notifications while the player is away ([ADR 0058](decisions/0058-local-notifications.md)): the vault full, the crew back, a payday short, Tolya at the door, an incident to decide, a decision about to take its default. There's no push and no server. The phone schedules them when the app goes to the background, and they're cleared when the player comes back.

**Code:**
- `app/notify/plan.ts`: `planNotifications`, `settle`, `morningIfQuiet`, `NOTIFY`. Pure, and tested.
- `app/notify/notifier.ts`: `notifier`, over `expo-notifications`.
- `app/inboxTitle.ts`: `itemTitle`, shared with Home's cards.
- Settings: `app/screens/SettingsScreen.tsx`, and `setNotify` and `askNotifications` in `app/store.ts`.
- Native config: `app.json` and `plugins/withoutPushEntitlement.js`.

## What's planned

The engine is deterministic and seeded, so the plan comes from it. `planNotifications(state, config, now, { offsetMs, tzOffsetMin })` reconciles the save `NOTIFY.aheadHours` (24) ahead with nobody acting, then reads the events that come after `now`:

| Kind | From | Title · body |
|---|---|---|
| `payday` | `WAGES_MISSED` | Payday came up short · not enough Clean for wages; loyalty drops until they're paid |
| `tolya` | `TOLYA_TICK` with a demand | Tolya's at the door · his cut, and pay, haggle or refuse |
| `expiring` | a waiting decision's `expiresAt`, or one filed in the window, less `NOTIFY.expiringLeadMinutes` | A decision expires within the hour · its title, and that the default happens |
| `decision` | `INCIDENT_RAISED` | A decision is waiting · the incident's name |
| `back` | `OP_RESOLVED`, `MISSION_RESOLVED`, `CONTRACT_DONE`, `ERRAND_DONE`, `TRAINING_DONE` | *Name* is back · the job and how it went, and "Their report is waiting" when the job filed one |
| `vault` | `VAULT_CAPPED` | The vault's full · collect it to get income moving again |

The rules:
- **One of each kind**, the earliest.
- **A job's crew report rides with its "back"** (it's filed at the same moment), rather than sending a second notification.
- **Times are real.** Game time minus `offsetMs` (Debug's offset and the hours bought with gold), so a notification fires when the moment comes on the phone's clock.
- **`settle`:**
  - a time in the quiet hours (local, from `NOTIFY.quietFrom` to `NOTIFY.quietTo`: 22:00 to 08:00) moves to 08:00;
  - of any within `NOTIFY.minGapMinutes` (20) of each other, only the most urgent is kept, at the earlier time. Most urgent first: payday, Tolya, expiring, decision, back, vault;
  - then the soonest `NOTIFY.maxTotal` (4).
- The plan never changes the save. On a day-45 save it takes under 10 ms on a laptop.

These numbers are presentation, not game numbers, so they live in `NOTIFY`, like the sound mix.

## When

- **Going to the background:** the store ends the session, plans from the committed save, and `notifier.schedule` replaces whatever was scheduled. With notifications off, or not allowed by the phone, it schedules none.
- **Coming back:** `notifier.clear` cancels what's scheduled and clears the tray, both on returning to the app and on a cold start (`notifier.start`). The game shows what happened itself (the away summary).
- **While the app is open,** a notification that comes due isn't shown: the handler returns no banner, list, sound or badge.

## Permission and Settings

- **The prompt** is asked once the opening is done (`tutorial.done`), never at first launch, from `App.tsx`. Or when the player turns notifications on in Settings. `notify.asked` records that it's been shown.
- **Android** gets its channel, "The city", before asking, as Android 13 requires.
- **Settings → Notifications:** On or Off (default On), kept in `sevgorod-settings.json` as `notify: { on, asked }`; a settings file from before reads with the defaults. Below it: at most `NOTIFY.maxTotal` while away, and none in the quiet hours. If the phone has them blocked, a line says so and **Open the phone's settings** goes there. Off cancels anything scheduled.

## Native

- **`expo-notifications`** is a native module. Expo Go has it, and local notifications work there. A standalone install has to be rebuilt.
- **`app.json` configures its plugin:** the monochrome icon (`assets/android-icon-monochrome.png`) and the brass colour for Android's tray.
- **The plugin always adds the iOS push entitlement** (`aps-environment`). A free Apple ID's personal team can't sign that, and local notifications don't use it, so `plugins/withoutPushEntitlement.js` removes it. It must be listed before `expo-notifications`: an entitlements step registered earlier runs later. `npx expo config --type introspect` shows `entitlements: {}` when it works.
- **Android** gains `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED` from the library, the latter so schedules survive a restart.

## Not built

- **No push,** and no server.
- **Android may deliver late.** A date trigger isn't an exact alarm, so under battery saving it can come minutes late. There's no `SCHEDULE_EXACT_ALARM`.
- **No per-kind switches,** and no custom quiet hours.
- **Raids and inspections don't notify.** Nothing can be done about them from a notification.

# 0058. Local notifications, planned by playing the save forward

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #10
- **Deviates from:** the plan's non-goals (§1, "push notifications"). These are local, not push.

## Context
An idle game brings players back with notifications, and the game had none. A backend isn't built and isn't needed for this: the moments that matter (the vault full, the crew back, a payday short, Tolya's demand, a decision) all follow from the save.

## Decision
- **The engine plans them.** When the app goes to the background, `planNotifications` reconciles the save 24 hours ahead with nobody acting, and turns the events into notifications. The engine is deterministic and seeded, so these are the moments that will actually happen if the player stays away. A random incident, for example, is predicted exactly. Nothing about notifications enters the engine.
- **Restraint:**
  - one of each kind;
  - a job's crew report rides with its "back";
  - nothing between 22:00 and 08:00 local (it waits for the morning);
  - of any within 20 minutes of each other, only the most urgent;
  - at most four.
- **The phone schedules them** (`expo-notifications`, date triggers). They're cancelled and the tray cleared when the player comes back. While the app is open, they're never shown.
- **Permission is asked once the opening is done,** not at first launch, or when the player turns notifications on. Settings → Notifications is On or Off, a preference beside Sound and Music, with a way to the phone's settings when it's blocked.
- **No push entitlement.** `expo-notifications`' plugin always adds `aps-environment`, which a free Apple ID can't sign. `plugins/withoutPushEntitlement.js` removes it.

## Consequences
- **A new native module.** Expo Go has it, and local notifications work there; a standalone install needs a rebuild. Ship it with `expo-audio`'s, so testers reinstall once.
- **The settings file gains `notify: { on, asked }`.** The save is unchanged.
- **The plan costs one 24-hour reconcile each time the app goes to the background:** under 10 ms on a laptop for a day-45 save.
- **Android's date triggers aren't exact alarms,** so a notification can come a few minutes late under battery saving.
- **Push stays unbuilt.** If the backend (#19) arrives, server-side reminders would be a new decision.

## Related
`app/notify/plan.ts`, `app/notify/notifier.ts`, `app/inboxTitle.ts`, `app/store.ts`, `App.tsx`, `app/screens/SettingsScreen.tsx`, `app.json`, `plugins/withoutPushEntitlement.js`, `tests/notify.test.ts`, [notifications.md](../notifications.md), [native-builds.md](../native-builds.md).

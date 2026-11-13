# 0050. Boss missions: an overreach that opens each act, a rematch that pays it off

- **Status:** Accepted
- **Date:** 2026-09-30

## Context
The owner asked for new bosses to enter the story through missions the player fails, because they reached for someone bigger. The design brief (Part 4) settled the shape: each boss arc goes lose, build, come back.
- **The overreach:** the last step of an act. It fails by design, costs a little, and introduces the next boss and their district.
- **The rematch:** later in that boss's act. A mission you can win, with real odds, and part of what opens the next act.

Three rematches were already in the game as moments: Kiosk Row taken, Zastava taken, the election won. They get their scenes, not missions.

## Decision
- **Seven missions** in `missions.list` (`engine/config/defaults.ts`):

  | Act | Mission | Kind | Opens |
  |---|---|---|---|
  | I | A crate through the Port | overreach | Act II and Zhanna |
  | II | Her terms | rematch | — |
  | II | Across the bridge | overreach | Act III and Ignatov |
  | III | The second lunch | rematch | — |
  | III | The first truck | overreach | Act IV and the Colonel |
  | IV | The first auction round | overreach | Act V and Golovin |
  | V | Over the Governor's head | overreach | Act VI and the prosecutor |

- **Gates:** each act's gate (`progression.acts.*.missions`) asks for the act before's overreach, sent, and its rematch, won (`gateMet`).
- **An overreach** opens once every other condition of that gate holds (`missionBlocked`), so sending it is the door. It doesn't roll:
  - it fails at a fixed cost (`stakeHours` of Dirty yield staked and lost, `injureHours` for the first one sent, `heat`);
  - it never costs Clean, a business or a crew member for good;
  - its failure opens the next act at once.
- **A rematch** is open all through its act. It rolls like a job on its own stream (`rng.derive('mission', opId)`): clean or partial wins it and pays its `reward` (Rep, Influence, a rival's disposition). A loss opens it again after `missions.retryHours`.
- **Missions ride the job machinery:**
  - a job of type `'mission'` carries `missionId` and the mission's terms, so crew, timing, catch-up, Finish now and split-invariance all come free;
  - `START_MISSION { missionId, crewIds }` sends one;
  - `MISSION_STARTED` and `MISSION_RESOLVED` record it;
  - `state.missions` keeps each outcome (and a failed overreach's stake), and `stats.missions` counts them.
- **Saves:** schema 15. The v14→15 migration marks every mission of an act already past as done, so an old save never meets a gate it had already passed.
- **Presentation:**
  - **Ops** opens with *Unfinished business*: a rematch's card shows its stake and the odds for the team that would go; an overreach's shows only its cost and a line from the crew; one not open yet says what comes first;
  - **Home's Next** lists each mission among the gate's conditions;
  - **A dossier** shows the boss's arc with stamps, and replays their scenes;
  - **Scenes 4–13** from the brief play when their moment comes: the mission's scene before the chapter it opens. Each ends on a FAILED stamp with its cost, or WON with the reward.
- **The bot** sends an overreach as soon as it opens, with its least valuable idle crew, and a rematch with the team of best odds, ahead of other jobs.
- **`missions.enabled`** (default on) leaves missions out of every gate when off. Older tests run with it off, and reach acts the way they always have; `tests/missions.test.ts` and the pacing test play with it on. `DEBUG_COMPLETE_MISSIONS` is Debug's fast path through a gate.

## Consequences
- **Pacing:** each act waits for its overreach and a session to send it. That's one per act, and late acts have one session a day. The first 60-day run on five seeds put Act IV at 9.90 d, against a ceiling of 10; shorter late overreaches (see TUNING.md) brought it back to 9.76 with every act in its band.
- **A rematch can be lost several times:** each loss costs 12 h. The bot's odds for *Her terms* and *The second lunch* sit well above even, so it rarely waits; a player with weak crew waits longer.
- **Endgame scenes:** the prosecutor's rematch (*The last hearing*) and the endings stay as the reckoning and the Holding and Empire; their scenes come with the ending screens.

## Related
`engine/systems/missions.ts`, `engine/config/schema.ts`, `engine/config/defaults.ts`, `engine/systems/acts.ts`, `engine/systems/ops.ts`, `engine/model/state.ts`, `engine/model/migrate.ts`, `sim/persona.ts`, `app/components/MissionCard.tsx`, `app/scenes.ts`, `app/components/Scene.tsx`, `app/story.ts`, [ops.md](../systems/ops.md), [progression.md](../systems/progression.md), [story.md](../story.md), [app.md](../app.md).

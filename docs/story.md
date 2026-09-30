# The story

Canon for Sevgorod's world, cast and six-act story, as the game uses it. It comes from the story bible (draft one, 24 September 2026), which the owner approved alongside the economy note. The in-game text lives in `app/story.ts`; this page is what that text has to agree with. Nothing here changes a rule or a number ([ADR 0046](decisions/0046-map-and-story.md)).

## In one breath

Sevgorod, 1993. Your uncle Lyosha ran cigarettes out of the state tobacco Combine for twenty years and never got rich, because he never spent a rouble he couldn't explain. Now he's dead. You have his notebook, his driver, ●440, and a city where everything is suddenly for sale.

It's a story about a rule: *never spend money that has no story.* The game's one mechanical law, that Dirty money can't buy anything, is Lyosha's law. The six acts follow it further than he ever did: out of the streets, across the river, past the border, into the factory that made him, and up into the hills, where the money finally stops needing a story (Legalize).

## The world

A river city of four hundred thousand, the Seva running west to east. The high north bank is the old merchant town (the Centre, City Hall). The low south bank is everything built after 1950: panel blocks, tram lines, the railway, the port, and the districts the story starts in. The city exists because of the Combine upriver, which has made *Sever*, a plain filterless cigarette, since 1934. The Union ended two years ago; the Combine is on a three-day week, wages four months late. Nobody has money and everybody smokes.

**Why money has two colours:** every purchase that matters goes through a registry the tax police read. Spend cash you can't account for on something that leaves a record, and the record is what they come for. That's why the currency kiosk exists, and why a bank is what the whole story is trying to become.

## The cast

| Who | Role |
|---|---|
| You | Lyosha's nephew or niece, never named, never gendered, never shown |
| Uncle Lyosha (Alexei Voronin, 1938–1993) | A *tsekhovik*: ran the Combine's night line from 1974; four years inside from 1984; died on the number 4 tram, of his heart |
| Vitya | Lyosha's driver since 1979. Two-word sentences. Yours because Lyosha told him to be |
| Dima | Your nephew, nineteen, the highest Brains ceiling in the game; can't be fired and never walks out |
| Sasha "Cold" | A card player from behind the station; loyalty 50, because to Sasha you're a job |
| Tolya | The old boss of Kiosk Row, a Combine foreman who carried Lyosha's packs and kept walking in 1984 |
| Zhanna Arkadyevna | Ran the Combine's sales office; now the Port's freight co-operative. A trader with a payroll |
| Sergeant Pasha, Major Kravets | The Ward Cop and the Precinct Captain |
| Ignatov | The deputy mayor for trade (City Hall), across the bridge |
| The Colonel | Demobilised with his men and a lorry park; runs the highway to the border |
| Golovin, the Red Director | Director of the Combine since 1979; signed Lyosha's dismissal; your opponent at the auction and the election |
| Moscow | Never a person: the Ministry's attention, which only the Governor can speak to |

## The acts and their turns

Each act is a district, a person who runs it, what they want, and a turn that shows you the next page. The turn line opens the next act (`ACT_TURN`); the titles are `ACT_TITLE`.

| Act | Title | District revealed | Shown by | The turn that opens it |
|---|---|---|---|---|
| I | The streets | Zarechye (start), Kiosk Row (Tolya's first visit), Station Square (the opening ends) | Lyosha, Tolya's boys, Vitya | — |
| II | The tram east | Sovietsky Blocks and the Port Quarter, as one page | Zhanna | "Zhanna Arkadyevna sends her condolences, four months late, and asks whether you're buying or selling." |
| III | Across the bridge | The Centre | Ignatov | "Lunch, Thursday, the Hotel Sevgorod. Wear something that wasn't bought on Kiosk Row." |
| IV | The road out | Zastava | the Colonel | "Everything that comes up the river came down the highway first. You're paying Zhanna's margin on the Colonel's cigarettes." |
| V | The factory | Kombinat | Golovin | "The Combine's council asks whether Voronin's family would consider the plant. The director was not consulted." |
| VI | The hills | Nagornaya | nobody: you drive up | "He looked up there every night for ten years. Never went. Said the road was for other people." |

The endings are the Holding and the Empire. The last line, either way, is Vitya's: "Where to?"

## The map

The map is Lyosha's notebook. A district is revealed when someone shows it to you, not when a number is reached. Before that it's a pencil outline with a fragment in his hand; the reveal inks it in, writes its name, and puts one line on the page. The map's title, *Sevgorod*, is only written in once every page is. Act II reveals two districts because the built game opens them together; every other act reveals one. `DISTRICT_STORY` in `app/story.ts` holds each district's fragment, reveal line and who shows it. The drawing is the design's ([ADR 0048](decisions/0048-notebook-map-and-people.md)): pencil for what you don't know, ink for what you do, red pencil for what's yours, and the newest page's line written beside it.

## Scenes

The story plays as grown-up crime manga ([ADR 0049](decisions/0049-scenes.md)): full-screen scenes, one panel at a time, from the design brief's scripts (Part 5). `app/scenes.ts` holds them as data; each is due from the save, so one missed while the app was shut plays on return.

| Scene | When | What |
|---|---|---|
| 1 · The envelope (`prologue`) | A new game, before the opening's first step | Zarechye in February; Lyosha's photograph; the envelope, the notebook and the rule; Vitya at the door: "Car's downstairs." Then VOLUME I · THE STREETS |
| 2 · Two people you trust (`crew`) | The opening's hire step | Vitya, Dima and Sasha "Cold" as cards, each with Hire; then "Two is enough to start. Lyosha started with one." |
| 3 · Your uncle paid on the day (`tolya`) | Tolya's demand at the opening's Tolya step | His splash and card; the stare, with his demand to pay, haggle or refuse; "Lyosha owed me. Now you do." |
| 4 · The Row (`row`) | Kiosk Row becomes yours | Tolya alone on a bench: "Count them yourself now." |
| 5 · A crate through the Port (`crate`) | The Act I overreach, failed ([ADR 0050](decisions/0050-boss-missions.md)) | The east gate at night; Vitya's split lip: "Gate wasn't empty."; FAILED; Zhanna's card; VOLUME II |
| 6 · Her terms (`terms`) | The Act II rematch, won | The co-operative's office; Dima: "We pay on the day."; "Forty a lot, not forty-five."; WON |
| 7 · Across the bridge (`bridge`) | The Act II overreach, failed | The militia's cordon on the bridge; FAILED; Ignatov's invitation; VOLUME III |
| 8 · The second lunch (`lunch`) | The Act III rematch, won | The Hotel Sevgorod; an envelope under a napkin; "It will be noted that you were helpful."; WON |
| 9 · The first truck (`truck`) | The Act III overreach, failed | The barrier on the highway; the empty truck; "The Colonel sends his regards. And his rates."; FAILED |
| 10 · The road (`road`) | Zastava becomes yours | "You bought the road. You didn't buy the men." |
| 11 · The first auction round (`auction`) | The Act IV overreach, failed | Round one at the Palace of Culture; Golovin's vouchers; FAILED; VOLUME V |
| 12 · The count (`count`) | The election won | The gymnasium at midnight; "That's… all of the Blocks."; "Lights up there. The dachas." |
| 13 · Over the Governor's head (`governor`) | The Act V overreach, failed | The capital's corridor; the prosecutor: "That was the interesting part."; FAILED; Vitya: "Home?"; VOLUME VI |
| 15 · The second envelope (`envelope`) | Opening the envelope at rock bottom, once per act ([ADR 0051](decisions/0051-rock-bottom.md)) | Two slugs; Dima: "It was in the notebook. Behind the map."; the envelope, with Lyosha's note for the act (`ENVELOPE_NOTES` in `app/story.ts`) and what it held |
| Volumes II–VI (`chapter-2` … `chapter-6`) | Each act opening | The chapter page: the volume's title over its panel, the turn line, the boss, each district new on the map with its line, what the act opens |

The cover (the tram window over Lyosha's table) opens the app. A mission's scene plays before the chapter it opens. Rock bottom's second scene, the keys, is a notice rather than a scene: when the lender repossesses, the notice shows the design's panel and "Two payments missed. We'll take the keys. The debt is closed." The prosecutor's last hearing and the endings in the brief aren't built yet.

## How the game talks

- Short, dry, specific. Numbers are numbers with their glyph.
- Nobody is glamorous: no "mafia", no guns on screen. Violence happens off the page and shows up as a repair bill.
- People talk in their own register: Vitya in two words, Dima in too many, Tolya in grievances, Zhanna in prices, officials in the passive voice. The narration sounds like the notebook: flat, exact, occasionally wry.
- Tolya's demand is in his words, by mood (`tolyaMood` and `TOLYA_ASKS` in `app/story.ts`): watchful ("and we'll say no more about the window"), cold, friendly (from disposition 20, a word on the card, not a rule), hostile.
- The opening's three have epithets on their Crew cards: Vitya the driver, Dima the nephew, Sasha the card player (`OPENING_CREW`). The officials are people on Heat: Sergeant Pasha (Ward Cop), Major Kravets (Precinct Captain), Ignatov (City Hall), "the stamp" (the Customs Chief) and "the telephone to the capital" (the Governor) (`OFFICIAL_PERSON`).
- The People pages (`app/people.ts`) carry each person's epithet and line from the design brief's cast, and a fragment of Lyosha's for everyone not met yet ("…the army left. The men didn't."). You meet the crew at the opening's hire step, Tolya with his boys, each act's boss when the act opens, officials when they go on the payroll, and the lender's men at a first missed payment.
- After the story the council's contracts say what they're for in the same voice (`CONTRACT_TEXT`): "Thirty-one buildings on one boiler, built in 1961. The council promised heat before the first frost."
- Loanwords only where English is worse (kiosk, tram, banya, dacha, kombinat).
- Business, front, district and official descriptions stay mechanical: they're for the unlock notices. The voice is for events and the map.

## Fixed and open

Fixed by the build: everything above that the game shows, and every number. Open, and easy to change: the year (1993), how Lyosha died, the names (placeholders for a pass by someone who speaks the language), Tolya's history with Lyosha. You stay unnamed and ungendered, and the country and its capital are never named ("Moscow" is only the street's word for the Ministry).

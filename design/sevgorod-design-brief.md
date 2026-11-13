# Sevgorod: Design Brief

*For Claude Design. This file holds everything needed to design the game: the world, the look, the characters, the story scenes, and every screen with its content, states and actions. You don't need anything else.*

---

## How to use this brief

- **What you're designing:** a mobile idle game for phones (iOS and Android), in portrait. It's playable today but has **no art at all**: every screen is plain dark cards, rows of numbers and buttons. Your job is to give it:
  - a visual identity;
  - wireframes for every screen;
  - designs for its story scenes, in the style of grown-up crime manga.
- **Built vs New:**
  - Screens marked **Built** exist today. Design them as they are. You may improve layout, hierarchy and navigation, but keep every piece of information and every action they carry.
  - Screens marked **New** are designed but not built yet. Design them from the description.
- **Self-contained sections:** each screen section in Part 6 opens with a one-line context, so it can be handed over on its own.
- **Deliverables:** listed in Part 7.

---

## Part 1 · The game in one page

**Premise.** Sevgorod, 1993. A river city of four hundred thousand in a country the game never names. Your uncle Lyosha ran cigarettes out of the state tobacco Combine for twenty years and never got rich, because he never spent a rouble he couldn't explain. Now he's dead. You have:
- his notebook;
- his driver, Vitya;
- ●440 in an envelope;
- a city where everything is suddenly for sale.

**The one rule.**
- Businesses earn **◆ Dirty** money.
- Dirty pays running costs (wages, upkeep, repairs, bribes) but can't buy anything.
- Launder it through a **front** into **● Clean**, and Clean buys growth: businesses, upgrades, crew, districts.
- Spending Clean earns **★ Reputation**, and Reputation opens the story.

**A visit** takes 1–5 minutes, a few times a day. Collect the vault, answer what's waiting, keep some Dirty back for wages, launder the rest, spend the Clean, send the crew out on jobs, leave. The city keeps running while you're away.

**Four limits shape every decision:**
1. **The vault.** Businesses earn into a vault that holds a few hours of income. When it's full, earning stops until you collect.
2. **Laundering.** A front only washes so much Dirty an hour.
3. **Cigarettes.** Joints need packs from factories. Run out and part of their income stops.
4. **Heat.** Police attention, 0–100:
   - from 40, inspections cut income;
   - from 65, raids take part of the vault;
   - from 85, crew get arrested.

**Six acts.** Each opens a new district on the map, a new boss and new businesses.

| Act | Title | District revealed | Boss | What's new |
|---|---|---|---|---|
| I | The streets | Zarechye (home), Kiosk Row, Station Square | Tolya | Kiosks and stalls, a tobacco factory, the first front, the first crew |
| II | The tram east | Sovietsky Blocks, the Port Quarter | Zhanna Arkadyevna | The Restaurant front, hotter businesses, Zhanna's cigarette trade |
| III | Across the bridge | The Centre | Ignatov | Prosperity, tier 6, the Bank, loans, injuries and a Clinic |
| IV | The road out | Zastava, the highway | The Colonel | Premium imported cigarettes, convoys, customs |
| V | The factory | Kombinat | Golovin, the Red Director | The Combine at auction, public opinion, the Ministry, elections |
| VI | The hills | Nagornaya | The prosecutor from the capital | Legalize, the Holding, hearings, the two endings |

**Time.** Everything runs in real time. When you come back, a "While you were away" summary shows what happened. **▰ Gold bars** skip time or finish a job early. They buy time only, never money.

**No game over.** Setbacks hurt, but nothing wipes a save. Someone who goes broke hits "rock bottom", and the family helps once per act (Part 4).

---

## Part 2 · Look and feel

### Two registers

1. **The ledger: operations screens** (Home, Business, Fronts, Ops, Crew, Heat, Stats).
   - Dark, calm, numbers first.
   - It should feel like the careful books of a man who never spent a rouble he couldn't explain.
   - Dense but legible.
   - The coloured resource glyphs are the main visual language.
   - No decoration that doesn't carry information.
2. **The manga: story moments** (scenes, character introductions, chapter pages, the map).
   - Grown-up crime manga (seinen): inked black-and-white panels, screentone, restrained expressions, heavy shadows, winter light.
   - One accent colour per scene, at most.
   - Violence happens off-panel and shows up as a repair bill.
   - The player is **never shown**: first-person view, hands, the back of a coat, a silhouette in a tram window.

The **map** sits between the two. It's Lyosha's notebook: a hand-drawn city in pencil and ink on squared paper.

### The world, in things

- Snow, trams and panel blocks.
- Kiosks lit at night, cigarettes by the carton.
- The plain *Sever* pack and the red-and-white imports.
- Currency-exchange windows, rubber stamps, carbon paper, abacus beside calculator.
- Thermos flasks, tracksuits, army-surplus coats.
- The river Seva, the bridge, the cranes, the Combine's three chimneys.
- The dachas on the hills.

Everything is worn; nothing is glamorous. There are no guns on screen and no "mafia" clichés: this is "the street", "a roof", "his boys", "the precinct".

### Colours and glyphs (today's tokens: keep the resource colours)

**Base colours:**

| Token | Hex | Use |
|---|---|---|
| Background | `#14161a` | The screen |
| Card | `#1d2026` | Cards |
| Card, alternate | `#252932` | Nested cards and inputs |
| Border | `#2f343e` | Hairlines |
| Text | `#e8e6e1` | Main text |
| Muted | `#8f96a3` | Secondary text |
| Faint | `#5d6470` | Hints, locked items |
| Accent | `#c9a86a` | Brass: titles, active tab, the wordmark |
| Warning | `#e8a33d` | Warnings |
| Good | `#5fbf7f` | Good news |

**Resources.** Each has one colour and one glyph, everywhere in the game:

| Glyph | Resource | Hex |
|---|---|---|
| ◆ | Dirty | `#d9a441`, amber |
| ● | Clean | `#5fbf7f`, green |
| ✦ | Influence | `#6fa8dc`, blue |
| ★ | Reputation | `#b48ee6`, purple |
| ▲ | Heat | `#e0604f`, red |
| ▮ | Packs (cigarettes) | `#c79a6b`, tobacco brown |
| ▣ | Premium packs | `#e07a7a`, rose |
| ▰ | Gold bars | `#e8c547`, yellow |

The resource colours are fixed game language. You may propose a new neutral palette and accent around them, and a light theme is optional.

### Type

- **Today:** system fonts only.
- **Wanted:** a pairing with character:
  - a condensed, slightly industrial display face for titles, chapter pages and names on intro cards;
  - a clean text face with tabular numbers for data.
- **Manga lettering:** needs a comic-hand face for speech bubbles and a typewriter or notebook-hand face for captions.

### Numbers

Numbers are the content. They start small (◆6 an hour) and reach seven digits late in the game (◆2,926,846 Dirty on hand). Today they're comma-grouped with no abbreviation, which is tight in the header. Propose a compact format (for example 2.93M) and where the full figure shows.

Rates read `+◆150/h`. Durations read `2h 30m`, `1d 4h` or `now`.

### Building blocks (today)

| Block | What it is |
|---|---|
| Section | Uppercase brass title, optional right-side note or button |
| Card | Rounded panel on the dark background |
| Row | Label, small hint under it, value on the right, often coloured |
| Bar | Progress bar with optional threshold marks (heat lines, buffer size) |
| Tag | Small pill: "joint", "greed (T3)", "shut", "legal", "on the payroll" |
| Button | Primary (filled), normal, ghost (text), danger; small variants in rows |
| Modal panel | Centred card over a dim background, for every pop-up |

### Navigation (today)

- A header on top of every screen.
- Under it, a horizontally scrolling tab strip with 10 tabs: Home, Business, Fronts, Ops, Crew, Heat, Map, Stats, How it works, Log, plus a developer-only Debug tab.
- A dot on a tab means it wants attention.
- **You may propose better navigation**, for example a bottom bar with the four or five most-used tabs and the rest under "More", as long as every destination stays reachable.

### Motion, sound, accessibility

- **Motion and sound:** none today. Suggest restraint:
  - a page-turn for chapter pages;
  - ink spreading when a district is revealed;
  - a stamp for mission results;
  - counters that tick up.
- **Accessibility:**
  - text contrast AA on the dark background;
  - tap targets at least 44 pt;
  - never rely on colour alone (glyphs and words carry the meaning too);
  - support larger text.

---

## Part 3 · The cast

### The intro card (the manga splash)

When a character first appears, the scene stops on a splash card. The same card lives in their dossier (People, Part 6). It shows:

- a large portrait in manga ink (half-body, dramatic angle, one prop);
- the **name** in heavy display type;
- an **epithet** in small caps;
- a **signature line** in a speech bubble or caption;
- for rivals and officials, a **holds** line (district and tribute, or what they control);
- a **mood** strip (hostile, cold, watchful, businesslike, friendly) for characters with a disposition.

### The people

For each: the intro card's epithet and line, how they look, how they speak, and their role.

**You**
- *Never shown, never named, never gendered.*
- Lyosha's nephew or niece, late twenties, back for the funeral and still here in spring.
- Drawn only as first-person view, hands (Lyosha's old wristwatch), the back of a winter coat, a reflection in a tram window.
- Speaks rarely; captions carry your thoughts, in the second person ("You don't answer.").

**Uncle Lyosha** · Alexei Voronin, 1938–1993
- **Epithet:** *The night line.* **Line:** "Never spend money that has no story."
- Seen only in a black-bordered funeral photograph, in 1970s flashback panels, and in his handwriting in the notebook.
- Ran the Combine's unrecorded third shift from 1974. Four years inside from 1984. Died of his heart on the number 4 tram.

**Vitya** · crew
- **Epithet:** *The driver.* **Line:** "Car's downstairs."
- Mid-fifties, heavy, grey army crop, flat cap, driving gloves.
- Speaks in two-word sentences and is always right about the station.
- Lyosha's driver since 1979; yours because Lyosha told him to be.
- **Never leaves.** Stats: Muscle 48, Brains 30, Nerve 42.

**Dima** · crew
- **Epithet:** *The nephew.* **Line:** "I read that the co-operative law actually allows… sorry. Yes. I'll come."
- Nineteen, thin, polytechnic scarf, glasses, always a folder.
- Speaks in too many words.
- Family: he can't be fired and never leaves. The highest Brains ceiling in the game. Stats: Muscle 30, Brains 50, Nerve 38.

**Sasha "Cold"** · crew
- **Epithet:** *The card player.* **Line:** "I work for money. You have some?"
- Thirties, still hands, an unlit cigarette, a deck always in motion.
- Loyalty starts at 50: to Sasha you're a job. Stats: Muscle 34, Brains 36, Nerve 50.

**Tolya** · Act I boss
- **Epithet:** *The old boss of Kiosk Row.* **Line:** "Your uncle paid on the day."
- Sixty, a Combine foreman's jacket, a thermos, three lads in tracksuits behind him.
- Speaks in grievances.
- **Holds:** Kiosk Row · 15% tribute.
- Carried Lyosha's packs for ten years and kept walking the day the police came. Thinks Lyosha owed him, and that you do too.

**Zhanna Arkadyevna** · Act II boss
- **Epithet:** *The trader.* **Line:** "Her people watch every crate that moves."
- Forties, a tailored coat, reading glasses on a chain, an abacus beside a calculator.
- Speaks in prices.
- **Holds:** the Port Quarter · 15% tribute.
- Ran the Combine's sales office; now the port's freight co-operative. Not a gangster: a trader with a payroll.

**Sergeant Pasha** · official
- **Epithet:** *The ward cop.* **Line:** "I didn't see anything. Happy New Year."
- A round face, cognac at New Year.
- The first official you put on the payroll.

**Major Kravets** · official
- **Epithet:** *The precinct captain.* **Line:** "It has been decided that nothing happened."
- Never seen to smile. A portrait behind his desk he hasn't taken down.
- Speaks in the passive voice.

**Ignatov** · Act III boss
- **Epithet:** *The deputy mayor for trade.* **Line:** "Respectable districts are expensive."
- A grey suit, precise with a fish knife, a City Hall crest on his letters.
- Speaks in the passive voice.
- **Holds:** the Centre's licences.

**The Colonel** · Act IV boss
- **Epithet:** *The man who owns the road.* **Line:** "The Colonel sends his regards. And his rates."
- Demobilised with his men and a lorry park. An army-surplus coat with the insignia cut off, a field cap, a barrier across the highway.
- Can be paid, or bought out of the crossing; can't be reasoned with.
- **Holds:** Zastava · 20% tribute.

**The Customs Chief** · official
- **Epithet:** *The stamp.* **Line:** "Everything is in order. Now."
- A pension two years away and a rubber stamp.

**Golovin** · Act V boss
- **Epithet:** *The Red Director.* **Line:** "Voronin's family. I signed your uncle's dismissal."
- Sixties, heavy glasses, a small hole in his lapel where the Party pin was, a stack of privatisation vouchers as thick as a brick.
- The only person in the game who calls you by Lyosha's surname.
- **Holds:** the Combine (until the auction), and the opposing candidate's seat at every election.

**The Governor** · official
- **Epithet:** *The telephone to the capital.* **Line:** "I only take calls from the mayor."
- Mostly off-panel: a voice on a heavy phone, a window with snow.

**The prosecutor** · Act VI boss (new character, name to be decided)
- **Epithet:** *From the capital.* **Line:** "Your file is thicker than you are."
- Forties, a plain dark suit, no jewellery, a thin folder that becomes a box.
- Quiet; never raises their voice.

**The lender's men** · minor
- **Epithet:** *The collectors.* **Line:** "We'll take the keys. The debt is closed."
- Two polite men, a clipboard, clean shoes.

**Moscow** · never a person
- The Ministry's attention, drawn as endless corridors, pale rectangles on wallpaper where portraits used to hang, ringing phones.

---

## Part 4 · The story

### The map is Lyosha's notebook

The map is a page from Lyosha's notebook: the whole city drawn in pencil over twenty years.

- **A district you don't know yet** is a faint pencil outline with a fragment of his handwriting (for example "…the one with the cranes"). Tapping it says you don't know it yet.
- **A district is revealed when someone shows it to you**, not when a number is reached. It inks in, gets its name, and a line from whoever showed it is written beside it.
- **Your businesses** appear as small marks inside their district, so the map doubles as the overview of your empire.
- **The title** at the top reads "Lyosha's notebook" until every district is revealed. Then it's finally written in: **"Sevgorod"**.

**How each district is revealed:**

| District | Revealed when | Shown by | The line |
|---|---|---|---|
| Zarechye (home) | New game | Lyosha, by leaving you his flat | "Third floor, the window over the tram. He left the key with Vitya." |
| Kiosk Row | Tolya's first visit | Tolya's boys | "Tolya's boys came from the Row. Now you know where it is." |
| Station Square | The opening ends | Vitya | "Vitya: 'Station's nobody's since spring. Won't stay that way.'" |
| Sovietsky Blocks | Act II opens | The tram east | "Nine floors, no lifts, no wages since October. Anyone here will work for you." |
| The Port Quarter | Act II opens | Zhanna | "Zhanna runs the Port Quarter. Her people watch every crate that moves." |
| The Centre | Act III opens | Ignatov | "The bridge has been there all along. It's the invitation that was missing." |
| Zastava | Act IV opens | The Colonel | "The truck came back empty. The driver says the Colonel sends his regards and his rates." |
| Kombinat | Act V opens | Golovin | "The council writes: the director has the vouchers, the workers have the plant, and neither has been paid." |
| Nagornaya | Act VI opens | Nobody: you drive up yourself | "From here you can see all of it. He never came up. You did." |

### Bosses and missions (New)

Each act has a boss. Every boss arc follows the classic manga shape: **lose, build, come back.**

- **The overreach.**
  - When you're nearly ready to leave an act, a mission against someone bigger appears.
  - You choose when to send it. It **fails**, by design: this is story, not bad luck.
  - The one who beat you enters the story, their district inks in, and the next act opens.
  - It stings but costs little: a crew member comes back hurt, heat rises, a small stake of Dirty is lost. It never costs Clean, a business or a crew member.
- **The rematch.**
  - Later in that boss's act, a mission you can actually win.
  - It shows real odds. If you lose, you can try again after a wait.
  - Winning pays the arc off, and it's part of what opens the next act.

**The ladder:**

| Act | Boss | Overreach that introduces them (at the end of the act before) | Rematch that pays it off |
|---|---|---|---|
| I | Tolya | None: he walks in during the opening | **The Row:** Kiosk Row becomes yours |
| II | Zhanna Arkadyevna | **A crate through the Port:** her people take it at the gate | **Her terms:** you win the Minsk trucks and her respect |
| III | Ignatov | **Across the bridge:** the militia turn your stall back on his order | **The second lunch:** he becomes a partner |
| IV | The Colonel | **The first truck:** it comes back empty | **The road:** Zastava becomes yours |
| V | Golovin | **The first auction round:** his workers' vouchers beat you | **The count:** you win the election and become mayor |
| VI | The prosecutor | **Over the Governor's head:** you go to the capital, and come back with a case file | **The last hearing:** then the endings |

### The acts, in short

- **I · The streets.**
  - February. The funeral, the envelope, the notebook, Vitya in the doorway.
  - You do what Lyosha did in 1974, from scratch: a kiosk, a stall, the factory line, a way to make the money clean, two people you trust.
  - Tolya's boys come within the hour. The station has been nobody's since spring.
  - Act I ends when you've built out two districts, put the sergeant on the payroll, run three trucks from Minsk and made one of your people into something.
- **II · The tram east.**
  - The number 4 tram runs east through sixty thousand unpaid Combine workers to the port, where the cranes are and Zhanna is.
  - Her lots are dearer than a truck from Minsk and safer than one. The Precinct Captain makes the bigger rackets survivable.
- **III · Across the bridge.**
  - The north bank is a different country.
  - The **prosperity** of a street matters now: hotels and card clubs raise it, raids and shortages ruin it.
  - Money gets a future tense: you can borrow it, and lend it out.
  - The past bites back: Tolya's boys attack your businesses, crew get hurt, and an investigator comes for the print shop.
- **IV · The road out.**
  - Sixty kilometres west is the border crossing.
  - Premium Western brands sell for three times what *Sever* does, and they come by **convoy**.
  - Convoys can be taken on the highway by the Colonel's men unless you pay for passage, or seized by customs, who take more the hotter you run.
- **V · The factory.**
  - The Combine goes to auction.
  - **Public opinion**, 0 to 100, becomes something you buy: through the Newspaper, the TV Station and the Development Fund.
  - It lowers heat and wins votes.
  - **The Ministry** in the capital watches how big you've grown. Bribes don't touch it, and at its peak it freezes your busiest front for a day.
  - Every seven days there's an **election** against Golovin. Winning makes you mayor for good: no tribute anywhere, bigger district perks, and the Governor takes your calls.
- **VI · The hills.**
  - The dachas above the city. Nobody shows it to you: you drive up.
  - **Legalize** a business and it earns Clean directly, draws no heat and pays tax instead.
  - The prosecutor's **case file** (built from every raid, arrest and frozen front since February) brings **hearings**. You can settle one in Clean, fight it in court, or let it run and lose a front for a day.

### The two endings

The endings are recorded, not final. Either one completes the story, and the game carries on.

- **The Holding:** every business legal. Every rouble with a story: Lyosha's rule, followed to its end.
- **The Empire:** every district yours and six hearings beaten in court. Nothing legal, nothing needed.

The last line, either way, belongs to Vitya, waiting by the car: **"Where to?"**

### Rock bottom: no game over (New)

- **When it happens:** payday comes, the Dirty isn't there, and there's no Clean to fall back on.
- **The envelope:** the family steps in, once per act. Dima arrives with **"Lyosha's second envelope"**, found behind the map in the notebook. It holds a small stake, enough to pay the crew and start again.
- **The note changes each act:**
  - Act I: "For when you've done something stupid."
  - Act II: "Again?"
  - Act III: "Third time. Your father was the same."
  - Act IV: "Borrow less."
  - Act V: "The city's watching now."
  - Act VI: "Last one. Make it count."
- **Debt:** if you miss a second loan payment, the lender's men take one business and close the loan. The debt never grows forever.
- **Crew:** Vitya and Dima never walk out. The save is never wiped.

### After the story (New)

The game continues in Sevgorod after an ending:

- tiers past the old limit, tagged *"past the book"*, at rising costs;
- an **empire value** (everything you own, plus a day of income) with a personal best to chase;
- a board of big weekly **contracts** paying Clean and gold.

---

## Part 5 · Scenes (manga scripts)

### How a scene reads

Scenes play full screen, one panel at a time (tap to advance), and can be skipped and replayed. Panel types:

| Panel | Use |
|---|---|
| **SLUG** | Establishing shot with a place-and-time caption box |
| **CAPTION** | Your inner voice, in the second person, in a rectangular box |
| **SPEECH** | A character speaks: round bubble, their register |
| **STARE** | Split panel, two faces, silence: the stare-down |
| **INSERT** | Close-up of an object (an envelope, a stamp, a folder) |
| **SILENCE** | A wordless beat |
| **AFTERMATH** | What's left: a split lip, an empty truck, a repair bill. The violence itself is never drawn |
| **SPLASH** | The character intro card (Part 3) |
| **TITLE** | Chapter or volume title |

The words stay dry, short and specific. Nobody makes speeches.

### Scene 1 · Prologue: "The envelope"
*Plays at a new game, before the first step of the opening.*
1. **SLUG:** a five-storey brick block at night, a tram passing below a lit window. Caption: "Sevgorod, February 1993. Zarechye. Third floor, the window over the tram."
2. **INSERT:** a black-bordered photograph on a sideboard: a man in a 1970s hat, half-smiling. Caption: "Uncle Lyosha died on the number 4 tram. Of his heart. Undramatically."
3. **INSERT:** an envelope on an oilcloth table, "440" in pencil. Caption: "He left an envelope, a notebook, and a rule."
4. **INSERT:** the notebook open on a hand-drawn map, most of it faint pencil. Caption: "Never spend money that has no story."
5. **SPEECH:** Vitya in the doorway, snow on his shoulders, cap in his hands. "Car's downstairs."
6. **SPEECH:** close on Vitya. "He said you'd know what to do." Caption: "You don't. Yet."
7. **TITLE:** VOLUME I · THE STREETS.

### Scene 2 · "Two people you trust"
*Plays during the opening, when you choose two of three crew.*
Three splash cards side by side, each with a Hire button: Vitya ("Car's downstairs."), Dima ("I read that the co-operative law… sorry. Yes. I'll come."), Sasha "Cold" ("I work for money. You have some?"). After hiring, a single panel of the two you chose in the car, the tram lines shining. Caption: "Two is enough to start. Lyosha started with one."

### Scene 3 · "Your uncle paid on the day"
*Tolya's first visit, during the opening.*
1. **SLUG:** Kiosk Row at the tram terminus, forty kiosks in a row. Three lads in tracksuits by your new kiosk.
2. **SPLASH:** Tolya steps forward, thermos in hand.
3. **SPEECH:** Tolya: "Your uncle paid on the day. ◆25, and we'll say no more about the window."
4. **STARE:** Tolya / Vitya.
5. **CAPTION:** "He knows to the rouble what a kiosk earns." *(The game's choice appears: Pay, Haggle or Refuse.)*
6. **SPEECH**, after you've answered: Tolya: "Lyosha owed me. Now you do." *(Kiosk Row inks in on the map.)*

### Scene 4 · Rematch I · "The Row"
*When Kiosk Row becomes yours.*
1. **SLUG:** Kiosk Row at dawn, shutters coming up.
2. **SILENCE:** Tolya alone on a bench with his thermos. The lads are gone.
3. **SPEECH:** Tolya: "Forty kiosks. I counted them every morning for five years."
4. **SPEECH:** Tolya: "Count them yourself now." He leaves the thermos cup on the bench.
5. **CAPTION:** "He didn't say goodbye. That was the part to worry about." *(A hint: his boys come back in Act III.)*

### Scene 5 · Overreach · "A crate through the Port"
*The last step of Act I. Mission card line, from Vitya: "Minsk truck at the Port tonight. East gate's never watched."*
1. **SLUG:** the Port Quarter at night: two cranes, a lorry at the east gate, snow in the headlights.
2. **SILENCE:** your crew unloading. A flashlight beam hits them.
3. **SILENCE:** men in freight-company jackets step out of the dark. Nobody shouts.
4. **AFTERMATH:** morning. Vitya with a split lip, the crate gone. Vitya: "Gate wasn't empty."
5. **INSERT:** a white card on the table, fountain-pen handwriting.
6. **SPLASH:** Zhanna Arkadyevna.
7. **SPEECH** (the card, in her voice): "Zhanna Arkadyevna sends her condolences, four months late, and asks whether you're buying or selling."
8. **TITLE:** VOLUME II · THE TRAM EAST.

### Scene 6 · Rematch II · "Her terms"
*A job to win the Minsk drivers away from her.*
1. **SLUG:** the freight co-operative's office, ledgers to the ceiling.
2. **SPEECH:** Zhanna, not looking up: "You're early. That usually costs extra."
3. **SPEECH:** your crew member (Dima if you sent him, whoever you sent otherwise): "The Minsk drivers want paying on the day. We pay on the day."
4. **STARE:** Zhanna looks up for the first time.
5. **SPEECH:** Zhanna: "Fine. Forty a lot, not forty-five. Don't make me regret the five."
- *If lost:* Zhanna: "Come back when you can afford to be polite."

### Scene 7 · Overreach · "Across the bridge"
*The last step of Act II. Mission card line: "Sell on the embankment. The Centre smokes too." Vitya: "Bridge has had militia on it since spring."*
1. **SLUG:** the bridge over the Seva in morning fog.
2. **SILENCE:** your handcart stall halfway across.
3. **SPEECH:** a militia sergeant at a cordon, one gloved hand raised: "Trade on the north bank is licensed by City Hall."
4. **AFTERMATH:** the handcart back on the south bank, one wheel broken. Caption: "They didn't hit anyone. They didn't need to."
5. **INSERT:** days later, a thick cream envelope with the City Hall crest.
6. **SPLASH:** Ignatov.
7. **SPEECH** (the letter): "Lunch, Thursday, the Hotel Sevgorod. Wear something that wasn't bought on Kiosk Row."
8. **TITLE:** VOLUME III · ACROSS THE BRIDGE.

### Scene 8 · Rematch III · "The second lunch"
1. **SLUG:** the Hotel Sevgorod restaurant: white tablecloths, a string trio.
2. **SPEECH:** Ignatov, filleting fish precisely: "The Centre is a respectable district. Respectable districts are expensive."
3. **INSERT:** an envelope slid under a folded napkin.
4. **SPEECH:** Ignatov: "It will be noted that you were helpful."
5. **SPEECH:** Ignatov: "The bridge is open. Mind the tolls."
- *If lost:* Ignatov: "It has been decided that lunch is over."

### Scene 9 · Overreach · "The first truck"
*The last step of Act III. Mission card line: "Why pay Zhanna's margin? Send our own truck to the border."*
1. **SLUG:** the highway west, birches, sixty kilometres. A striped barrier across the road.
2. **SILENCE:** men in army surplus, a lorry park behind them.
3. **SILENCE:** the driver's hands tight on the wheel.
4. **AFTERMATH:** dawn in your yard. The truck, doors open, empty. The driver: "The Colonel sends his regards. And his rates."
5. **SPLASH:** the Colonel.
6. **CAPTION:** "Everything that comes up the river came down the highway first."
7. **TITLE:** VOLUME IV · THE ROAD OUT.

### Scene 10 · Rematch IV · "The road"
*When Zastava becomes yours.*
1. **SLUG:** the lorry park at Zastava, winter.
2. **SILENCE:** the Colonel's men loading their own lorries. The barrier raised.
3. **SPEECH:** the Colonel: "You bought the road. You didn't buy the men."
4. **SPEECH:** the Colonel: "They'll work for whoever pays on time. I taught them that."
5. **SILENCE:** he salutes the road, not you. Caption: "The barrier stays up now."

### Scene 11 · Overreach · "The first auction round"
*The last step of Act IV. Mission card line: "The Combine is being sold. Bid."*
1. **SLUG:** a hall in the Combine's Palace of Culture, folding chairs, a banner: PRIVATISATION · ROUND ONE.
2. **SILENCE:** Golovin at the front table with a stack of vouchers as thick as a brick.
3. **SPEECH:** Golovin: "Voronin's family. I signed your uncle's dismissal in 1984."
4. **INSERT:** the auctioneer's gavel coming down.
5. **CAPTION:** "The vouchers were the workers'. The workers hadn't been paid in six months."
6. **AFTERMATH:** your bid slip, stamped REJECTED.
7. **SPLASH:** Golovin.
8. **TITLE:** VOLUME V · THE FACTORY.

### Scene 12 · Rematch V · "The count"
*Election night.*
1. **SLUG:** a school gymnasium at midnight: ballot boxes, a tally board.
2. **SILENCE:** Golovin in his coat, arms folded.
3. **SPEECH:** Dima reading numbers off a sheet, too fast: "That's the Blocks. That's the Blocks as well. That's… all of the Blocks."
4. **STARE:** Golovin / you, seen from behind.
5. **SPEECH:** Golovin: "Voronin. The plant will outlive both of us."
6. **SPEECH:** Vitya at the window: "Lights up there. The dachas."
- *If lost:* Golovin: "Next week, then. I'm not going anywhere."

### Scene 13 · Overreach · "Over the Governor's head"
*The last step of Act V. Mission card line: "The Ministry won't stop looking. Go to the capital and ask it to."*
1. **SLUG:** the capital. A corridor with no end, pale rectangles on the wallpaper where portraits used to hang.
2. **SILENCE:** you on a bench. A clock: nine hours later.
3. **SPLASH:** the prosecutor in a doorway, a thin folder.
4. **SPEECH:** the prosecutor: "You came to ask us to stop looking. That was the interesting part."
5. **INSERT:** the folder open: raids, arrests, frozen accounts, with your own numbers.
6. **AFTERMATH:** the night train home. Vitya: "Home?" You don't answer.
7. **CAPTION:** "He looked up there every night for ten years. Never went. Said the road was for other people."
8. **TITLE:** VOLUME VI · THE HILLS.

### Scene 14 · Rematch VI · "The last hearing"
1. **SLUG:** the old merchant court, high windows, dust in the light.
2. **SILENCE:** the prosecutor with the file, which is a box now.
3. **SPEECH:** Dima, in a suit that fits for once:
   - if your businesses are legal: "Every rouble on this list has a receipt."
   - if you've taken the Empire road: "The witnesses are no longer available."
4. **STARE:** the prosecutor / Dima.
5. **SPEECH:** the prosecutor: "Then there's nothing left to hear." The box closes.

### Scene 15 · Rock bottom · "The second envelope"
1. **SLUG:** the flat in Zarechye at night. A tram passing, empty.
2. **CAPTION:** "Payday came and there was nothing there. Vitya said nothing, which is how you know."
3. **SILENCE:** a knock. Dima at the door, snow in his hair, an envelope.
4. **SPEECH:** Dima: "It was in the notebook. Behind the map."
5. **INSERT:** Lyosha's handwriting on the envelope. The note changes each act (Part 4).
6. **CAPTION:** "It isn't much. It's enough." *(The stake is shown.)*

### Scene 16 · "The keys"
*After a second missed loan payment.*
1. **SLUG:** one of your businesses at closing time.
2. **SILENCE:** two polite men with a clipboard.
3. **SPEECH:** "Two payments missed. We'll take the keys. The debt is closed."
4. **AFTERMATH:** the sign coming down. Caption: "It wasn't the worst thing you owned. They're not stupid."

### Scene 17 · Ending · "The Holding"
1. **SLUG:** Nagornaya at dawn, a villa, the whole city below.
2. **SILENCE:** a panorama: the river, the bridge, the cranes, the Row, the chimneys, the tram loop.
3. **INSERT:** a stack of tax receipts, squared off neatly.
4. **CAPTION:** "Every rouble with a story. The rule, followed to its end."
5. **SPEECH:** Vitya by the car: "Where to?"
6. **TITLE:** THE HOLDING. *"The city runs on. So can you."*

### Scene 18 · Ending · "The Empire"
1. **SLUG:** Nagornaya at night, the whole city lit.
2. **INSERT:** the notebook map, every district inked and marked yours.
3. **CAPTION:** "Every district held. Nothing legal. Nothing needed."
4. **SPEECH:** Vitya by the car: "Where to?"
5. **TITLE:** THE EMPIRE. *"The city runs on. So can you."*

---

## Part 6 · Screens

**Context line for every section:** *Sevgorod, a phone idle game, portrait, dark theme. Resources: ◆ Dirty (amber), ● Clean (green), ✦ Influence (blue), ★ Reputation (purple), ▲ Heat (red), ▮ Packs (brown), ▣ Premium (rose), ▰ Gold (yellow). Operations screens are clean and numbers-first; story moments are grown-up crime manga.*

### Sample numbers by act

A real game, one moment in each act. Use these to fill mockups.

| Moment | Dirty on hand | Clean | Vault / cap | Income | Rep | Heat | Influence | Gold |
|---|---|---|---|---|---|---|---|---|
| New game | ◆120 | ●440 | ◆0 / 40 | — | ★0 | ▲20 | ✦1 | ▰10 |
| Act I, day 2 | ◆72 | ●3 | ◆0 / 64 | +◆25.6/h | ★89 | ▲35 | ✦1 | ▰13 |
| Act II, day 6 | ◆190 | ●375 | ◆602 / 826 | +◆150/h | ★386 | ▲16 | ✦17 | ▰22 |
| Act III, day 11 | ◆22,687 | ●826 | ◆2,166 / 8,723 | +◆721/h | ★2,580 | ▲18 | ✦56 | ▰32 |
| Act IV, day 20 | ◆247,458 | ●1,378 | ◆3,395 / 62,891 | +◆3,823/h | ★21,191 | ▲20 | ✦167 | ▰42 |
| Act V, day 31 | ◆1,001,754 | ●41,755 | ◆72,193 / 164,428 | +◆7,643/h | ★59,010 | ▲32 | ✦332 | ▰52 |
| Act VI, day 42 | ◆2,926,846 | ●78,596 | ◆121,944 / 245,251 | +◆8,649/h | ★148,156 | ▲14 | ✦238 | ▰62 |
| After the story, day 55 | ◆3,785,046 | ●1,432,954 | all legal: nothing into the vault | Clean direct | ★299,225 | ▲2 | ✦459 | ▰62 |

---

### 6.1 The shell (on every screen)

#### Header · Built
- **Purpose:** the state of the empire at a glance, and the way to gold.
- **Row 1:**
  - the wordmark **SEVGOROD** (brass, letter-spaced);
  - on the right, the clock and act: `Day 6 · 14:05 · Act II`, plus `cleared`, plus `+3h skipped` when gold was used;
  - a gold chip `▰ 22`: tap it to open *Skip ahead*.
- **Row 2:** six resource cells, each a small label over a big coloured value:

| Cell | Example | Notes |
|---|---|---|
| Vault | 602/826 | Turns red as *Vault FULL* when full |
| ◆ Dirty | 190 | |
| ● Clean | 375 | |
| ✦ Infl. | 17 | |
| ▮ Packs | 30 | From Act IV, premium sits beside it: `▮ ▣ Packs 30 12`. Red when out |
| ▲ Heat | 16 | Amber from 40, red from 65 |

- **Row 3:** the Rep line and a progress bar toward the next act. It always says what it's for:
  - Act I: `★ Rep 89 · 4/7 goals to Act II`;
  - later: `★ Rep 386/1,200 to Act III`;
  - with extra conditions: `★ Rep 26,000/30,000 to Act V (+2 more)`;
  - Act VI: `★ Rep 148,156 · 12/25 legal · 2/6 hearings won`;
  - after an ending: `★ Rep 299,225 · Act VI cleared`.
- **Design notes:** seven-digit numbers must fit (see *Numbers*, Part 2). **New:** after the story, an *empire value* chip may join the header.

#### Tab strip · Built
- **Purpose:** move between the ten screens.
- **Today:** a horizontally scrolling strip under the header: Home, Business, Fronts, Ops, Crew, Heat, Map, Stats, How it works, Log. The active tab is underlined in brass.
- **Attention dots:**
  - **Home** when a decision is waiting, Tolya has a demand, or an alert is up;
  - **Fronts** when there's Dirty and room to launder it;
  - **Ops** when crew are idle;
  - **Heat** at 40 and above.
- **Design notes:** you may redesign it as a bottom bar plus More. Keep the dots.

#### The opening (tutorial banner) · Built
- **Purpose:** a guided first half hour. The player buys the starting setup themselves, one step at a time.
- **Where:** a banner under the tab strip with the step number and title, one or two sentences with live numbers, a button to the right tab, and "Skip: set me up".
- **The 13 steps:**
  1. Open a Kiosk.
  2. Open a Market Stall.
  3. Build the Tobacco Factory.
  4. Open the Currency Kiosk.
  5. Hire two crew.
  6. Collect the vault.
  7. Launder, but keep running costs.
  8. Send a job.
  9. Upgrade a joint.
  10. Heat.
  11. Tolya comes by.
  12. The job comes back.
  13. The city runs without you.
- **Story hooks (New):** step 5 is Scene 2 (the crew splash cards); step 11 is Scene 3 (Tolya's first visit).

#### Notice bar · Built
- **Purpose:** a one-line flash for 4 seconds. Red for a refusal ("Not enough Clean"), neutral for information. Tap to dismiss.

---

### 6.2 The tabs

#### Home · Built
- **Purpose:** the landing screen. What needs you, what's coming in, and what's next.
- **Layout, top to bottom:**
  1. **Tolya's demand**, when he's asked: "◆25, and we'll say no more about the window". Pay; Haggle (names who talks and shows the odds, for example "Sasha · 64%"); Refuse.
  2. **Waiting for you · 3**: decision cards, soonest expiry first. Each has a title, what happened, time left, and a button per option with its effects, for example "Pay him off (−◆20 · −▲3)". The default option is marked.
  3. **Alerts**, each with a button to the right tab:
     - the vault is full;
     - Dirty won't cover payday;
     - cigarettes or premium are running out;
     - the Ministry is close to freezing a front;
     - you'd lose the coming election;
     - an offer is about to expire.
  4. **Act I goals** (Act I only, after the opening): seven rows with ticks, each paying ▰1:
     - Fully build out two districts.
     - Upgrade the Tobacco Factory to tier 2.
     - Hire a third crew member.
     - Put the Ward Cop on the payroll.
     - Get two fronts to rate level 2.
     - Run three smuggling jobs.
     - Get someone promoted to Soldier.
  5. **Vault:** income per hour, a bar, "full in 2h 30m", and a big **Collect ◆602** button.
  6. **Money flow:**

| Row | Example |
|---|---|
| Businesses into the vault | +◆150/h |
| Running costs | −◆12/h |
| Fronts washing | +●104/h |
| Legal businesses (Act VI) | +● directly |
| Dirty on hand | ◆190 |
| Clean on hand | ●375 |

     Plus a warning when Dirty won't cover what's owed.
  7. **Cigarettes:** stock against its cap (▮30 / 130), made against sold per hour, and "runs out in 5h" or "full: anything more made is wasted".
  8. **Premium** (Act IV+): the same card for ▣ premium packs.
  9. **Operation:** crew idle ("1 of 3"), jobs running, wages owed ("◆4 · paid in 9h"), heat and inspections.
  10. **This week:** seven days of Dirty in, costs, Clean in, Clean spent.
  11. **Next:**
      - what the next act opens;
      - each condition of its gate with a tick;
      - a progress bar;
      - milestones ("Act II reached · Day 5").
  12. **Lately:** the last six events, one line each.
- **States:**
  - During the opening, most sections are nearly empty.
  - After an ending, *Next* becomes *After the story* (New): empire value, best so far, the contracts board.
  - **New:** the *arc strip* inside *Next* (this act's boss, rematch done or not, overreach ready) and the *rock bottom* banner.

#### Business · Built
- **Purpose:** everything you own, district by district.
- **Top of the screen:**
  - a totals card: income per hour, upkeep per hour, exposure (▲);
  - a short rules paragraph;
  - the Cigarettes card, and Premium from Act IV.
- **One section per district**, titled with its name and holder ("Kiosk Row · Tolya's").
  - A district line: spots used ("2/3 running"), premises lots ("1/1"), prosperity ("62, heading for 70", from Act III), and active pairings ("A factory beside joints: they earn ×1.15").
  - A locked district just says "Opens in Act III".
- **Business card** (joints sell cigarettes, rackets don't):
  - Title and tags: "Kiosk · tier 3", with kind, greed or stealth, shut, enforcer, legal.
  - Yield: ◆7.2/h, with hints such as "−◆1.1 tribute · ×1.12 prosperity".
  - Cigarettes sold (▮0.6/h, "70% of its trade"). Red when short: "only 40% supplied".
  - Premium sold, for premium joints.
  - Exposure (▲1.1), and a condition bar with "Worn down" below 60%.
  - Buttons: "Tier 4: ●62 (+◆1.4/h, +▲0.4)". At tiers 3 and 6 there's a pair instead: **Greed** (more money, much more heat) or **Stealth** (the same money, less heat). Also "Repair ◆12".
  - Act VI: "Legalize: ●N (then ●x/h Clean, ▲0)", or once legal, "Legal: earns ●x/h after tax".
- **Premises card** (factories, warehouses, stash houses, hotels, the Clinic, the Loan Desk, bonded warehouses, the Combine, the media, the Holding):
  - "Does: makes ▮3/h" or "holds +▮100";
  - upkeep ◆/h, exposure, condition, Upgrade, Repair.
- **Open spots and free lots:** buy buttons ("Open a Beer Tent (joint): ●80 · ◆8/h, ▲1.0"), or the reason it's blocked:
  - "Unlocks at ★53";
  - "Opens in Act II";
  - "The street needs a prosperity of 55";
  - "Buy it at auction first".
- **Businesses by act:**
  - **I:** Kiosk, Market Stall, Beer Tent, Slot Hall, Video Salon, Taxi Rank.
  - **II:** Auto Shop, Café, Bathhouse, Petrol Station, Cargo Bay.
  - **III:** Nightclub, Card Club, Print Shop.
  - **IV:** Truck Stop, Motel, Foreign Goods Shop, Freight Yard, Fuel Depot.
  - **V:** Palace of Culture, Construction Trust.
- **New, after the story:** tiers 7 and up tagged *"past the book"*.

#### Fronts · Built
- **Purpose:** turn Dirty into Clean. This is the game's main throttle.
- **Top of the screen:**
  - "Your fronts can launder ◆180/h" against income;
  - a warning when you make more than you can launder;
  - one big button: **"Launder ◆1,240, keep ◆160 for costs"**.
- **Front card** (Currency Kiosk, Restaurant, Cooperative Bank, Import–Export Company, Development Fund):
  - Title: "Restaurant · rate level 1 · capacity 0", plus a *suspicious* tag when it runs hot.
  - A three-way dial: **Push** (faster, draws suspicion sooner), **Normal**, **Lay low** (slower, no suspicion).
  - Rate: 58% ("◆100 → ●58"). Throughput: ◆120/h.
  - A buffer bar: "340 / 720 · empty in 2h 50m". Running: 64%.
  - Buttons: +◆half, Deposit ◆max, Rate +3% (●cost), Capacity +25% (●cost).
- **Variants:**
  - The Import–Export Company notes that it only washes what premium sales explain.
  - A front **frozen by the Ministry** (Act V+) shows a red notice, "launders nothing for 18h", and takes no deposits.
- **Locked fronts:** "Cooperative Bank · rate 75% · launders ◆500/h · needs a city prosperity of 55 (now 48)", then "Open for ●1,500".
- **Credit card** (Act III+):
  - **Borrowing:** "They'll lend up to ●8,000"; borrow a quarter, a half or all of it. While owed: owed, the next payment, missed payments, "Pay it all".
  - **Lending** through the Loan Desk: "Lend ◆N". While out: "◆N back in 1d 4h as ◆M · 12% chance the borrower skips town".

#### Ops · Built
- **Purpose:** send crew on timed jobs for Dirty, Influence, Reputation, cigarettes and XP.
- **Layout:**
  1. **Out on jobs:** job name, time left, crew names, **Finish now ▰2**.
  2. **Pick your crew:** chips for idle crew ("Vitya · M52 B31 N44"), with the rule "a job uses the best stat on the team; each extra body adds +5". The header note: "✦ today 1/3".
  3. **On the board:** three generated offers, better paid and harder, with countdowns ("A vendor who won't pay · gone in 2h 10m").
  4. **Training:** boxing gym, night school, card table. 4h, costs Dirty, adds XP. No roll, no heat.
  5. **Jobs:** one card per job:
     - name, a duration and crew tag ("15m · 1 crew");
     - "Needs Muscle 60% · Nerve 40% · difficulty 35 · +▲3 heat";
     - pays "◆24 ★2 on a clean job, 60% if partial";
     - costs (smuggling and convoys cost Clean up front);
     - Act IV convoys: "taken on the road 40% · seized at customs 16%";
     - XP per crew member;
     - odds: "clean 32% · partial 51% · fail 17%";
     - the Send button.
     - Locked jobs say "Act III". Pressure jobs have district chips.
- **New:**
  - an **Unfinished business** section at the top with the boss mission cards (6.4);
  - after the story, a **Contracts** section.

#### Crew · Built
- **Purpose:** the people, and how they grow.
- **Summary:** slots ("3/3"), wages per hour, "Buy a slot ●N".
- **Crew card:**
  - Name and a status tag: idle, on a job, "enforcer at the Kiosk", "jailed 8h", "hurt 5h".
  - Rank: Associate, Soldier, Made, Capo.
  - Tags for nephew, traits (ex-army, gambler, alcoholic) and perks (Earner, Ghost, Fixer, Mentor, Bargainer, Steady).
  - **Muscle, Brains and Nerve**, each against its ceiling ("48 / 60") with an XP bar.
  - A loyalty bar (70) with the walkout line at 25, and the wage ◆/h.
  - Buttons: Raise ◆N, make enforcer at a business, Fire (two taps; family can't be fired).
- **Looking for work:** the recruit pool, each candidate with stats and ceilings, "Hire ●50", "new faces in 18h".
- **New:** each crew member's portrait (manga style), and a *never leaves* badge for Vitya and Dima.

#### Heat · Built
- **Purpose:** police attention and what keeps it down.
- **Layout:**
  1. **Heat:** a 0–100 bar with marks at 40, 65 and 85, current against target ("35, heading for 25"), and what each line means:
     - inspections cut income 15%;
     - raids, 10% an hour, take 30% of the vault;
     - arrests, 15% an hour, 12h in a cell.
  2. **Exposure:** businesses ▲, busy fronts ▲, total.
  3. **Control:**
     - base;
     - officials;
     - bribe;
     - the mayor's office (Act V);
     - "districts taken ×1.10";
     - "public opinion ×1.35" (Act V);
     - total.
  4. **Bribe:** "Bribe ◆180: +50% control for 6h", or "Working: 4h left".
  5. **Officials:** "✦ 17 · +✦0.8/h". One card each for the Ward Cop, Precinct Captain, City Hall, Customs Chief and Governor:
     - status: on the payroll, "Put on the payroll ✦12", "Act III", or "mayor only";
     - effects: for the Precinct Captain, "+240 control · +✦3 a day". The Customs Chief adds "customs ×0.5", and the Governor "the Ministry −40";
     - "Next official in 1d 4h".

#### Map · Built (the notebook map)
- **Purpose:** the city, the story's progress and the rivals.
- **The drawing:** Lyosha's notebook.
  - **Layout of the city:**
    - the river runs across the middle, west to east, with the bridge in the centre;
    - the south bank holds Zarechye (home), Kiosk Row, Station Square, Sovietsky Blocks and the Port Quarter;
    - the north bank holds the Kombinat (upriver), the Centre and Nagornaya (the hills);
    - Zastava sits at the top-left edge, where the highway leaves the page;
    - a railway runs along the bottom.
  - Unrevealed districts are pencil outlines with Lyosha's fragment. Revealed ones are inked, with the name, who holds them and small marks for each of your businesses (joint, racket, premises, legal).
  - The title reads "Lyosha's notebook" until everything is revealed, then "Sevgorod".
- **Below the drawing:** the tapped district's card:
  - its holder;
  - prosperity;
  - what it hosts ("Kiosk, Market Stall, Video Salon · 2/3 running · lots 1/1");
  - tribute;
  - perks ("Take it for: Kiosk yield ×1.1 · control +5% · ★20");
  - **Buy out ●150** and **Pressure 1/3 → Ops**, or **Buy at auction ●80,000** for the Kombinat;
  - the line that revealed it, with "Shown to you by…".
- **Rival sections:**
  - **Tolya:** his demand, mood, next visit.
  - **Zhanna** (Act II+): mood, her next lot ("▮25 for ◆40"), Buy, sell her the surplus.
  - **The Colonel** (Act IV+): mood, passage ("◆7,600 for 24h of the road"), the chances a convoy is taken or seized.
  - **Politics** (Act V+):
    - opinion 0–100 and where it's heading;
    - the Ministry's attention against its freeze line at 80;
    - the next election, your share of the vote, your chance of winning, and "+5 points" campaign buttons for ◆ or ✦;
    - or, once mayor, what the office gives.
  - **The reckoning** (Act VI):
    - the share of your business still illegal;
    - the chance of a hearing tomorrow;
    - the case file;
    - progress toward each ending.
- **New:** a toggle at the top, **The city / People**. People is the dossier gallery (6.4).

#### Stats · Built
- **Purpose:** the lifetime record.
- **Five sections of label and value rows:**
  - Playtime & progress: day, act, Rep, sessions, act milestones.
  - Money: earned, lost to a full vault, laundered, spent, wages, upkeep, repairs, bribes, tribute, seized, gold.
  - Crew & jobs: outcomes, stat points, specialisations, haggles, walkouts.
  - Heat & the law: raids, arrests, decisions, convoys, elections, fronts frozen, businesses made legal, hearings, endings.
  - Territory & supply: districts held, packs made, sold and wasted, shortages, Zhanna trade.
- **Design notes:** later rows appear only once they have data.

#### How it works · Built
- **Purpose:** the player-facing rules, with every number live.
- **Content:** 14 short sections:
  - the loop;
  - Vault, Dirty and Clean;
  - businesses;
  - fronts;
  - crew;
  - ops;
  - heat;
  - turf and rivals;
  - acts;
  - prosperity;
  - premium and the road;
  - politics;
  - the endgame;
  - officials.
- Each has a paragraph and a list of every business, front, district and official with its one-line description.
- **Design notes:** a readable long-form page. It may borrow the notebook texture.

#### Log · Built
- **Purpose:** everything that happened, newest first.
- **Content:**
  - filter chips: All, Decisions, Crew & jobs, Heat, Turf, Money;
  - a "Show bookkeeping" toggle;
  - one line per event with the time, coloured by kind.
- **Empty state:** "Nothing here."

---

### 6.3 Pop-ups · Built

#### While you were away
- **Purpose:** what happened in your absence. It appears when you come back after 15 or more game minutes.
- **Title:** "While you were away · 8h 20m", or "Skipped 4 hours" after gold.
- **Content:**
  - "3 decisions waiting on Home";
  - **Jobs** (name, crew, outcome, what each earned);
  - **Money:**
    - businesses earned ◆;
    - lost to a full vault ◆;
    - laundered by each front ●;
    - wages;
    - upkeep;
    - tribute;
    - seized;
    - Influence;
    - packs made, sold and wasted;
    - heat from → to;
    - gold;
  - **Elsewhere:** notable events, one line each.
- **Button:** "Got it".

#### Live notice
A centred card while you're playing. One at a time, queued. Variants:
- **A decision:** title, "8h to decide", what happened, option buttons with effects, the default marked, "Decide later".
- **Just unlocked:** a business, front, district or official, or several at once: name, one-line description, key numbers.
- **A one-line event:** raid, walkout, missed payday, a frozen front, an election result, an ending, with "Got it".

#### Act page → becomes the Chapter page (New design)
- **Today:** act number and title, the line that brought you here, "New on the map: …" with its reveal line, what the act opens, and "Turn the page".
- **Redesign it as a manga volume title page:**
  - volume number and title in display type;
  - the new boss's portrait;
  - the turn line;
  - a mini notebook map with the new district inking in;
  - what opens.

#### Skip ahead (gold sheet)
- **Purpose:** spend ▰ gold to jump forward.
- **Choices:** 1h ▰1, 2h ▰2, 4h ▰4, 8h ▰8.
- **Estimates:** the vault after, Clean laundered, jobs finishing, stock after.
- **Warnings:**
  - "your vault is full: collect first";
  - "heat is over 65: raids can happen while you skip";
  - "cigarettes run out during the skip".
- **Buttons:** Skip, Cancel.

---

### 6.4 New surfaces (designed, not built)

#### Cover
- **Purpose:** the title screen on launch.
- **Content:**
  - A manga cover: the notebook on an oilcloth table, a tram passing the window, **SEVGOROD · 1993**.
  - **Continue** ("Day 12 · Act III · Across the bridge").
  - **New game**, with a confirmation.
  - After an ending, the cover changes: the city from the hills at dawn (the Holding) or at night (the Empire), and the empire value.

#### Scene viewer
- **Purpose:** plays the manga scenes (Part 5).
- **Content:**
  - Full screen, panels one at a time, tap to advance.
  - Progress pips and a Skip button.
  - Panel types as in Part 5, with portrait slots and lettered bubbles and captions.
  - Mission scenes end on a **result stamp**:
    - an overreach: "FAILED", in red ink, with its cost ("Vitya hurt 12h · +▲10 · −◆2,400") and what it opened ("Act II · the Port Quarter").
    - a rematch: "WON", in brass, with its reward.
- **Replay:** scenes replay from the People dossiers.

#### Character intro card
- **Purpose:** the splash from Part 3, used inside scenes and in dossiers.
- **States:** first meeting (full splash); dossier (compact); unmet (a silhouette with Lyosha's fragment).

#### Mission card
- **Purpose:** the boss missions.
- **Where:** at the top of Ops ("Unfinished business"), mirrored on the boss's section of the Map and on Home's *Next* card.
- **Content:**
  - the boss's portrait chip;
  - the mission name;
  - a stamp: **OVERREACH** (red ink) or **REMATCH** (brass);
  - the crew it needs;
  - the stake.
  - An overreach shows no odds, just a crew line instead ("Vitya: 'Bad idea.'").
  - A rematch shows real odds.
- **States:**

| State | Shows |
|---|---|
| Locked | What unlocks it |
| Ready | The Send button |
| Out | A timer and "Finish now ▰" |
| Failed | "Replay the scene" |
| Won | "Replay the scene" |
| Cooldown | "Try again in 12h" |

#### Arc strip
- **Purpose:** a thin row in Home's *Next* card: this act's boss, the rematch (done or not) and the overreach (ready or not), beside the other conditions to leave the act.

#### People (dossiers)
- **Purpose:** everyone you've met, in the notebook.
- **Content:**
  - a portrait grid;
  - people you haven't met are silhouettes with Lyosha's fragment;
  - a dossier page per person: intro card, role, what they hold, mood, where their arc stands, and their scenes to re-read.

#### Rock bottom
- **Purpose:** the bailout instead of a game over.
- **Content:**
  - A red banner on Home: "Payday came up short and there's no Clean. The family can help, once this act." Then **Open the envelope**, which plays Scene 15 and shows the stake.
  - A *repossession* page after a second missed loan payment (Scene 16): the business taken, and "the loan is closed".
- **States:** envelope available or used this act.

#### Endings and credits
- **Purpose:** the end of the story.
- **Content:**
  - the ending scene (17 or 18);
  - "Where to?", then **Back to the city**;
  - credits: the cast roll with epithets, and your numbers (days, Rep, empire value, businesses legal, districts held);
  - "Keep going".

#### After the story
- **Purpose:** growth after an ending.
- **Content:**
  - **Empire value:** a big number, trend, best so far, and a breakdown (businesses, fronts, cash).
  - Tiers *past the book* on business cards.
  - A **Contracts** board on Ops: three big jobs a week, paying Clean and gold, with countdowns.
  - Home's *Next* card becomes *After the story*.

---

## Part 7 · What to design

1. **Visual identity:**
   - the palette, keeping the resource colours;
   - a type pairing (display, data, manga lettering);
   - a paper-and-ink texture for story surfaces;
   - a glyph style for the eight resources.
2. **Component sheet:**
   - Section, Card, Row, Bar with marks, Tag, the buttons;
   - the resource chips;
   - the mission stamps;
   - the manga panel frames, speech bubbles and caption boxes;
   - the intro card.
3. **Wireframes for every surface in Part 6:**
   - the shell (4);
   - the tabs (10);
   - the pop-ups (4);
   - the new surfaces (9).
4. **High-fidelity key frames:**
   - Home in Act I (day 2) and in Act V (day 31);
   - Business in Act III (a district with prosperity, a greed/stealth choice, a shut business);
   - Fronts in Act V (one front frozen);
   - Ops with a mission card ready;
   - the Map at the start (mostly pencil), in Act III, and complete ("Sevgorod");
   - a Chapter page (Act IV · The road out);
   - the away summary;
   - Rock bottom (banner and envelope);
   - the Ending (the Holding) and credits;
   - Home after the story.
5. **Manga:**
   - a character sheet: portraits and intro cards for the full cast in Part 3;
   - full storyboards for three scenes: Scene 3 (Tolya's first visit), Scene 9 (The first truck) and Scene 15 (The second envelope);
   - the Chapter page template.
6. **Formats:** phone portrait, 360–430 pt wide; dark theme first.

---

## Glossary

| Term | Meaning |
|---|---|
| ◆ Dirty | Cash from businesses and jobs. Pays running costs; can't buy anything |
| ● Clean | Laundered money. Buys businesses, upgrades, crew and districts; spending it earns Rep |
| ✦ Influence | Political capital. Buys officials |
| ★ Reputation (Rep) | The progress score. Opens acts and businesses; never falls |
| ▲ Heat | Police attention, 0–100 |
| ▮ Packs, ▣ Premium | Cigarettes (made by factories), and premium imports (brought by convoy) |
| ▰ Gold | Buys time only: skip ahead, or finish a job now |
| Joint | A business that sells cigarettes for part of its income |
| Racket | A business that earns without goods, and runs hotter |
| Premises | A building that earns nothing but makes, stores or improves something (a factory, a warehouse, a hotel…) |
| Front | Launders Dirty into Clean at a rate, so much an hour |
| Vault | Where income collects until you tap Collect; when it's full, earning stops |
| Tribute | The share a rival takes from businesses on their turf |
| Tier | A business level; tiers 3 and 6 ask you to choose greed or stealth |
| Prosperity | How well a street is doing (Act III+); joints earn with it |
| Opinion | What the city thinks of you (Act V+) |
| The Ministry | The capital's attention (Act V+); freezes a front at its peak |
| Legalize | Make a business legal (Act VI): Clean directly, no heat |
| Overreach, Rematch | The boss missions: one you lose on purpose, one you can win |
| Rock bottom | Going broke. The family helps once per act; never a game over |

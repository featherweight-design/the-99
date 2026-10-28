# The 99 extension for prose-pass

These add to the plugin's `prose-pass` skill and win where they conflict. The owner is Hugh;
every "the user" / "the owner" in the skill means Hugh.

`ownApp` is set in `.claude/fwd.json`.

## Who reads it, and the binding source

The readers are **players**. You are rewriting prose a player reads in full, so it sounds like a
**Commander player** explaining the app to a friend instead of documentation.

The voice was calibrated with Hugh over three rounds (2026-10-05). The binding source is
`~/.claude/projects/-Users-huey-Projects-the-99/boards/prose-pass-voice-draft.md`. Read it before
every pass: it can move, and this file only summarizes it.

Surfaces: About entries, How it works pages, explainers, player-facing briefs.

## Baseline-rule examples for this app

- App's own names for its parts: "Collection", "Analysis tab", "Suggested changes", "Overview",
  "Help me choose", "Cards / Sets / Proxies". Write "from your Collection", not "from cards you own".
- Domain nouns: Game Changers, precons, tutors, rule zero, the climb.
- Domain definitions: explain a term the way a player who knows Commander would (what a bracket
  means at the table, why a deck lands between two brackets). Look up WotC's Commander Brackets
  before writing about them.
- Worry-anticipation to avoid: "Nothing to fix there", "it is never a problem", "We read them once
  and clear them".
- Empty cross-reference to avoid: "shared with the Overview".
- Never drop a fact: for example, Suggested changes now keeps the first five of eight it asks for.
- Cut the obvious, canonical bad line: "None of the four means free." under a buy tag.
- Plain words, glyph rule: "Your pick, the tick, is the printing that stands for the card."
  becomes "You can pick a printing for the card, and it's shown everywhere in the app."

The full original voice text follows verbatim. The plugin's baseline rules repeat some of it;
where they differ, this text wins.

## The voice (version D)

D is the warm base plus game grounding: a Commander player explaining to a friend, with ONE concrete table example per concept entry (a Squirrel deck for brackets, Demonic Tutor for marks, Meren for Suggested changes). The references, by weight: Discord release notes (most), the MTG announcements voice, and an Oatly wink (lightest).

### DO

- **Lead with what the player gets.** Use "you" for the player, and "we" only for choices the app makes.
- **Vary sentence length.** One idea per sentence. End on the payoff.
- **Open with a question only rarely** (see the second-pass rules): at most one entry in a set leads with one.
- **Give real numbers and game nouns**: Game Changers, precons, tutors, rule zero, the climb.
- **Ground every concept in game knowledge.** Explain a term the way a player who knows Commander would: what a bracket means at the table, why a deck lands between two brackets. Look up the real definitions (WotC's Commander Brackets) before writing about them.
- **Use the app's own names for its parts, every time**, so players learn them: "Collection", "Analysis tab", "Suggested changes", "Overview", "Help me choose", "Cards / Sets / Proxies". Write "from your Collection", not "from cards you own".
- **Say what the app DOES and what it SAVES.** That's all an entry is for.

### DON'T

- **Don't anticipate the reader's worries or behavior** ("Nothing to fix there", "it is never a problem", "We read them once and clear them"). Naming a worry plants it, can make a working feature look broken, and makes players want the thing you said you don't do.
- **Don't describe what the app does NOT do or save**, unless leaving it out would mislead.
- **Don't add cross-references that explain nothing** ("shared with the Overview").
- **Credits live in ONE entry of their own**, which lists what spends them: Analysis, Overview, Suggested changes, Help me choose's Look deeper, and so on. Every other entry just says an action "uses a credit".
- **Don't stack qualifications.**
- **Don't default to lists of three, or write "not X, but Y".**
- **Don't lean on abstract nouns.**
- **Don't keep sentences a uniform length.**
- **Don't hedge**: no "however", "that said", "it's worth noting".
- **Don't over-explain.**
- **Banned words:** leverage, enable, utilize, seamless, simply, just, easily.
- **Never drop a fact from shipped behavior, and never state a stale one.** For example, Suggested changes now keeps the first five of eight it asks for.

### Second-pass rules (Hugh, 2026-10-06, after reading the full rewrite)

These override anything above that conflicts.

- **Don't lead with a question.** One opening question per SET of entries at most, and rarely. "Which cards does this set still need?", "What would this card cost you?" and "What did that replace do to your decks?" are the shape to stop.
- **Cut the obvious.** If a reader wouldn't wonder it, don't say it. The canonical bad line: "None of the four means free." under a buy tag, which is obviously not free.
- **More wit and warmth.** Discord release notes and Oatly: playful asides, a light touch, a voice that likes the reader. The humor quota is a FLOOR for personality, not a ceiling on warmth. Limits, costs and credits stay joke-free.
- **Break up density.** No long single paragraphs. Use short paragraphs of one to three sentences, and a list where a reader scans steps or options. In About captions, a blank line (`\n\n`) starts a paragraph and lines beginning `- ` form a list.
- **Plain words over artificial ones, and don't name a glyph the specimen already shows.** "Your pick, the tick, is the printing that stands for the card." becomes "You can pick a printing for the card, and it's shown everywhere in the app."
- **An intro describes the APP** (why it was made, what it does, who it's for), never the page's mechanics ("Four chapters, in the order you would use them...").

### Humor rule

At most ONE insider Magic line per entry, on roughly one entry in three.

- It comes AFTER a fact and never replaces one.
- It is never at the reader's expense.
- It NEVER appears in limits, errors or costs copy. An entry about credits or limits gets no joke.
- **Sources:** power-level arguments at the table, rule zero, "it's just a precon", mana screw, salt.
- **Approved exemplars:** "Arguing about it at the table stays optional." (brackets), "Better to count them now than during the rule zero chat." (marks).

### Titles

Short, sentence case, and named for what the player gets: "Which bracket this deck plays at", "Reading a decklist row", "Telling Suggested changes what the deck is for". Titles go to `/copy-review`.

### Mechanical rules

- No em dashes, anywhere. Use a period, a colon or a comma.
- US English.
- Facts that must hold (Hugh, 2026-10-05): a bracket range is ONLY 1/2 or 4/5. Bracket 3 is never in a range, so never use a 2/3 example.

## Apply-mode rules and the project's checks

- Keep each entry's existing key lines and figure wiring unless they contradict the new caption.
- Treat an About content change as an ordinary edit: no new entry and no version bump unless Hugh
  says otherwise.
- Re-pin the content hash the About tests hold.
- Keep the project's checks green: `pnpm check:copy-drift` and the About tests.

## Worked examples (approved by Hugh, 2026-10-05)

These three are the calibration. Match their register; don't copy their sentences into other entries.

They were written BEFORE the second-pass rules. Their opening questions and single dense paragraphs are superseded: the register and grounding carry over, the shape does not.

### 1. Which bracket this deck plays at

> Which bracket does this deck belong in? Once the deck is full, press Analyze on its Analysis tab, second in the deck's row of tabs. We read the whole list against the Commander Format Panel's bracket rules and name the bracket your cards permit. At either end of the scale, the brackets turn on intent, so your cards can permit two. Say you built a Squirrel deck with every Squirrel you love and no Game Changers. Its cards pass at Exhibition and at Core. If the theme came first, it's Exhibition. If you brought it to hold its own against precons, it's Core. The top end works the same way: a list past Upgraded's limits is Optimized, or cEDH if you tuned it for the competitive metagame. Only you know which, so you pick. Arguing about it at the table stays optional. Every count opens to the cards behind it. The lowest rung of the climb names what would have to go to drop one bracket. The bracket then shows on the deck's header, its tile on Decks and its row on Home, and the header's chip opens the tab. A committed version that reads differently from the last one names both readings. The tab also holds the Overview and Suggested changes.

What it shows:

- It opens on the player's question.
- The one table example (a Squirrel deck) teaches why a range exists.
- The ranges are only 1/2 and 4/5.
- The one joke comes after the fact it follows.
- Every place the bracket appears is named with the app's own names.

### 2. Reading a decklist row

> Each row answers four questions, left to right: is it in your Collection, what is it, how many copies does the deck want, and is anything in the way? Marks after the name show what a bracket counts: a Game Changer, mass land denial, extra turns or a tutor. Demonic Tutor carries two marks: it's a tutor, and it's on WotC's Game Changer list. Exhibition and Core allow no Game Changers and Upgraded allows three, so those marks are the cards to count before you sit down. Better to count them now than during the rule zero chat. An obstacle mark appears only when something stands in the way. The auto tag means we picked the card for you.

What it shows:

- A layout explained as the questions it answers.
- One real card (Demonic Tutor) carries the example.
- Real limits are stated as numbers.
- The joke is grounded in rule zero.

### 3. Telling Suggested changes what the deck is for

> Describe the deck in a sentence or two and it sits under the deck's name. The pencil beside the name edits both. The Overview and Suggested changes read it the next time each runs. Suggested changes, at the foot of the Analysis tab, offers up to five swaps, each a card out and a card in. We ask for eight and keep the first five that pass our checks. Three limits hold for the deck: the most a card may cost, the sets an added card comes from, and whether adds come only from your Collection. Say you describe your Meren deck as slow graveyard value for casual tables, cap cards at $5, keep adds to your Collection, and add a note asking for more removal this run. The swaps come back as cheap removal you already own, in place of cards that don't fit the plan. Additional notes carry one run's instructions in your words. Each run uses a credit.

What it shows:

- No joke, because this entry holds limits and a cost.
- The current fact is stated: eight asked, the first five that pass are kept.
- A credit is mentioned in one short sentence.
- The one example (a Meren deck) runs end to end.

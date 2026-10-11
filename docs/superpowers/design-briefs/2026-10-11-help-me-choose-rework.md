# Help me choose: the rework

Design brief, 2026-10-11. Asks for a Design round on Help me choose (`/decks/new/choose`). The feature
is built and ships behind `HELP_ME_CHOOSE_ENABLED`; this round changes what its free-text box does. Today
the box is matched to chips; after this round it can be read by a model that sees the whole commander
pool and the player's own decks. The engineering is not built yet. This brief says what exists, what is
ruled, what is locked, and what Design owns.

## Rulings 2026-10-11 (Hugh), closed

These are decided. Do not reopen them in the drawings; open questions are at the end.

1. **Filters stay free and instant.** Colors, sets, budget, bracket, themes, the card and the pool all
   keep running the free search with no model call.
2. **One optional free-form box, "Anything else?".** Writing in it runs the deeper read (one credit) when
   the player submits. There is no separate *Look deeper* step for it. The text is never squeezed into
   chips.
3. **The read searches the whole pool, in two steps, and is not a re-rank of the filtered list.**
   Step 1: the model scans every commander inside the set filters (a compact cached list: name, colors,
   creature types, top themes; about 3,400 at most) and picks 30 to 40 that fit what was written.
   Step 2: it judges those in full (rules text, themes, how well the player's collection supports each,
   and how each differs from the player's decks: their commanders and their themes) and writes the
   reasons. No notes, descriptions or play history are read.
4. **The result is the same list, re-ordered.** The top 10 carry one line each tying the commander to
   what the player wrote. When nothing in the shortlist fits, it says so plainly. The set filters always
   hold.
5. **Cost.** Hugh's estimate is $0.05 to $0.08 per press with caching; the eval measures it. The eval
   cap is $5.

Hugh's two test asks, used as fixtures below: *"a horrors deck that's scary and a little nasty"* and
*"a Landfall deck unlike other decks I own"*.

## What exists today

Help me choose asks for answers (colors, themes, a build-around card, budget, bracket, sets, pool),
searches the commander index, and lists commanders that fit. The free text is an optional way to fill
those answers in.

**The form.** `src/components/intake/intake-form.tsx:133` is the words box: a `<textarea>` capped at
`READ_WORDS_MAX_CHARS` (800, `src/lib/intake/limits.ts:20`).

**The free match, no model.** Submitting calls `submitTarget` (`src/lib/intake/submit.ts:20`), which runs
`matchWords` (`src/lib/intake/match.ts:179`) once. It recognises exactly four things: a theme label (or a
singular of one), a commander-legal card name, a dollar figure, and `bracket N` (`match.ts:5-12`). Every
other word is dropped as a stop word or kept as leftover. Leftover phrases go into the results address
as *Not used* (`submit.ts:54`), and `src/components/intake/read-as-bar.tsx:106` draws them quoted under the
chips.

**The search, no model.** `searchCommanders` (`src/lib/intake/search.ts:116`) loads candidates through
`isCandidate` (`search.ts:217`: commander-legal, index state `ok`, and not a commander the player has
already built) and ranks them with `rankCandidates` (`src/lib/intake/rank.ts:225`). With a theme or a card
the order is the weakest of the fit figures; with neither it is how many of the commander's support cards
the player owns (`rank.ts:20-26`). Fewer than `TOO_NARROW_BELOW` results gets a "too narrow" note naming
which answers to loosen (`rank.ts`, `SearchResult.tooNarrow`).

**The deeper read, one model call.** The results page offers *Look deeper*
(`src/components/intake/deeper-look.tsx`, mounted in `src/app/decks/new/choose/page.tsx:125-132`). A press
calls the Server Action `lookDeeper` (`src/app/decks/new/choose/actions.ts:56`), which calls
`runDeeperRead` (`src/lib/intake/deeper-read.ts:95`): reserve a credit, one call to `claude-sonnet-5` at
low effort with 3,000 output tokens (`limits.ts:9-11`), validate, settle.

- **What the model is asked to do** (`src/lib/intake/read.ts:55-65`): map the player's words onto the
  theme list it is given, card names, a budget and a bracket, and list the phrases it could not map.
  The reply schema (`read.ts:45-53`) has exactly those five fields. **The prompt forbids a commander**:
  "Never suggest a commander" (`read.ts:58`; the file header at `read.ts:15` says the same). The model is
  shown the theme labels and the player's words, and nothing else: no commanders, no decks.
- **What survives** (`validateRead`, `read.ts:106`): a theme only if it is an offered label, a card only
  if it resolves in the catalog, a budget or bracket only if the player has not set that control. What
  does not fit goes under *Not used*.
- **The words box text is a model input**, so it goes through `playerText` (`read.ts:67-78`).
- **Charging.** A read is spent only when a chip added an answer the player did not already have
  (`read.ts:175`, `settleRead` in `src/lib/intake/run-store.ts:248`, the spend-or-refund line at
  `run-store.ts:271`). A read that adds nothing is stored as `nothing_valid` and refunded. A failed call
  refunds. A Stop refunds (`cancelRead`, `run-store.ts:295`). A repeat of the same words under the same
  controls and prompt version is answered from the store and charges nothing (`wordsHash`,
  `run-store.ts:65`). Only one read per player can be in flight.
- **The allowance.** A reservation is priced from `FEATURE_CALLS.intake` (`src/lib/model/prices.ts:92`):
  a 6,000-token input ceiling, measured at 3,434 to 3,946 tokens with the vocabulary and 800 characters of
  words (`prices.ts:75-77`). Credits are 10 per rolling 24 hours for the owner and 5 for everyone else
  (`src/lib/model/allowance-rule.ts:24-27`), shared with Overview and Suggested changes.
- **What the player sees after a press.** `deeperTarget` (`submit.ts:68`) sends them to the results
  address with the read's chips folded into the answers, `d` marking which answers the read added, and the
  leftovers replacing *Not used*.

**Why today's read cannot do what Hugh asks.** It never sees a commander and never sees the player's decks.
"Scary and a little nasty" is a tone, and the reply has nowhere to put one. "Unlike other decks I own" needs
the decks, and the model is not given them. Both land in *Not used*, and a read whose only result is
*Not used* adds no chip, so the credit is refunded and the list is unchanged. The fixtures below show
why chips alone also fail on a theme that does exist.

## What the tag baseline returns (staging, read-only, 2026-10-11)

Hugh's account on staging owns 21 decks. The commander index holds 3,467 legal, indexed commanders;
excluding the ones he has built leaves 3,445 (`isCandidate`). Reproduce with read-only SELECTs against
`commander_support` and `decks`.

- **Horrors.** `horrors` is a theme (112 commanders carry it). The eight most-played by EDHREC deck count
  that Hugh has not built: Atraxa, Praetors' Voice; Sauron, the Dark Lord; Fire Lord Azula; Giada, Font of
  Hope; Nekusar, the Mindrazer; Kefka, Court Mage; Valgavoth, Harrower of Souls; Esika, God of the Tree.
  The tag is a deck theme, not a tone, and it carries Giada, Font of Hope (a white commander) beside
  Valgavoth, Harrower of Souls. "Scary and a little nasty" has no tag at all.
- **Landfall.** `landfall` is a theme (683 commanders carry it). The eight leading by deck count that he has
  not built: Y'shtola, Night's Blessed; The Ur-Dragon; Atraxa; Kaalia of the Vast; Fire Lord Azula;
  Ms. Bumbleflower; Pantlaza, Sun-Favored; Lathril, Blade of the Elves. A tag filter can return these;
  it cannot know which of them is unlike what Hugh already plays.
- **The decks that matter for "unlike my decks".** The Landfall ask is only answerable against these
  (commander, colors, the leading tags EDHREC lists for it):

| Deck | Commander | Colors | Leading tags | Why it matters |
|---|---|---|---|---|
| HD - Omnath | Omnath, Locus of Creation | GRUW | lands-matter, landfall, ramp | He already owns a Landfall deck. "Unlike" must route around it. |
| HD Tune - Sultai Arisen | Teval, the Balanced Scale | BGU | reanimator, lands-matter, mill | A second lands-matter deck, in another shell. |
| HD - Gishath | Gishath, Sun's Avatar | GRW | dinosaurs, ramp, aggro | Green ramp; Landfall candidates overlap its colors. |
| HD - Zombies | Ghoulcaller Gisa | B | zombies, tokens, reanimator | The closest he owns to the horrors ask: black, graveyard, grim. |
| HD Tune - Blood Rites | Clavileño, First of the Blessed | BW | vampires, lifegain, aristocrats | A dark deck that is not nasty; tests that "nasty" is not just "black". |
| HD - Yuriko | Yuriko, the Tiger's Shadow | BU | ninjutsu, ninjas, tempo | Black and cold rather than scary. |
| HD Tune - Mutant Menace | The Wise Mothman | BGU | mill, +1/+1 counters, mutants | Another dark-leaning deck, a different plan. |

  The table shows the 7 of his 21 that bear on the two asks. The other 14 (Aang, Brago, Eldrazi, Elves,
  Goblins, Gods, Kratos, Soldiers, Tovolar, Wizards, Thorin, Counter Intelligence, Prismari Artistry and
  Scrappy Survivors) matter only as the rest of the decks the model compares against.
- **Account.** Clerk user `user_3GkZrrTwOJBdqUpq6GambP0BC8w` on the `staging` branch. Read-only: nothing
  here may be written to that account.

## Prior art

Nothing found does what Hugh ruled. What is out there, and what it suggests:

- **EDHREC.** The route to a commander is a curated Tags dropdown, then a ranked list of top commanders for
  that theme, narrowed by color pair; each theme is added by hand ([EDHREC themes announcement](https://edhrec.com/articles/news-new-edhrec-feature-themes),
  [Themes and Tags](https://edhrec.com/articles/digital-deckbuilding-edhrec-themes-and-tags)). Its own
  advice on choosing a commander names the same things a player says in words: the gameplay a commander
  offers, a creature type, favorite cards, what is already in the collection, and avoiding a deck whose play
  pattern repeats one the player owns ([How to Choose Your Commander](https://edhrec.com/articles/how-to-choose-your-commander)).
  So "unlike my decks" is something players already weigh by hand, with no tool behind it. This app's
  chips are the same model as EDHREC's tags, which is why tone has nowhere to go.
- **Grimoria** offers a commander search with color identity, type and theme facets over EDHREC data
  ([commander search](https://grimoria.app/help/discovery/commander-search)): facets again, ranked by
  popularity.
- **Farseek** is the nearest natural-language product: describe the game plan once and keep it as session
  context, and every recommendation is "grounded in live Scryfall data" so the assistant works "from real,
  current card text instead of training memory" ([Farseek](https://alternativeto.net/software/farseek/about/)).
  It starts from a chosen commander or an imported list rather than choosing one, so it does not cover this
  ask. What it supports is the lock below: ground the model in real records so it cannot invent a card.
- **DeckCheck** ([How to Use DeckCheck](https://deckcheck.co/articles/howto)) scans a list for overview,
  weaknesses and bracket; no commander picker. **Moxfield and Archidekt**: no commander-recommendation
  feature turned up, and this brief does not claim there is none, only that a search found none.

What this means for the round: the facet-and-popularity pattern is everywhere and is what the app already
has. What nobody shows is a reason that ties a commander to what the player wrote and to what they already
own. That line is the new thing, and it is Design's to draw.

## What engineering has locked

1. **The picks come from real commanders only.** The model returns commander ids from the pool it was
   shown; any id outside the filtered pool is dropped, and a name is never trusted. The reasons are text
   the model writes, but the commander each one hangs on is a pool row, so a sentence cannot sit on a
   commander the app does not hold. (The existing read is the opposite: it never names one,
   `read.ts:15`.)
2. **Set filters always hold.** The read scans only the commanders the free filters already admit
   (`isCandidate` plus colors, sets, budget, bracket, themes, pool). A commander outside a filter is never
   shown, whatever the text says. If the text asks for something a filter excludes, the result says
   nothing fits rather than loosening the filter.
3. **Two steps, one credit.** The shortlist step and the judging step are one press and one reservation;
   the player never sees two charges or two waits as separate acts. Whether the wait is drawn as one or two
   stages is Design's.
4. **The commander list is cached.** The compact list (name, colors, creature types, top themes) is built
   from the same index the search reads and cached, so a press does not rebuild it, and the model call
   reads it as a cached prefix. At about 3,400 rows it is the dominant input; its token count is not
   measured yet. **The eval measures it** and the cost per press; Hugh's $0.05 to $0.08 is an estimate
   until then. **Caching is a build task, not a given.** The shared client sends no `cache_control`
   (`src/lib/model/client.ts:183-189`), `FEATURE_CALLS.intake` reserves one call (`src/lib/model/prices.ts:92`),
   and worst-case pricing assumes no cache write (`prices.ts:56-64`). The build adds the cache marker and
   reprices the reservation for two calls and a cold cache write, or the estimate and the reservation
   disagree. The input ceiling (6,000 tokens, measured for a vocabulary of about 400 labels) will not hold
   and is re-measured.
5. **The player's words go through `playerText`**, as today (`read.ts:67-78`): line breaks collapsed,
   delimiter tags neutralised, the cap re-checked. The 800-character cap is the starting point; raising it
   means re-measuring. The Server Action refuses a longer press rather than trimming it.
6. **The player's decks are inputs, and only their commanders and themes.** No notes, descriptions or play
   history are read. Decks reach the model as a short list of commander names and leading themes.
7. **The existing credit rules carry over unless Design and Hugh change them.** Spend on a useful read;
   refund on a failed call, a Stop, or a read that finds nothing; a repeat of the same ask is answered from
   the store at no charge, **but the ask's identity widens**: `wordsHash` today covers only the words, budget,
   bracket and prompt version (`run-store.ts:65-68`), and the new result also depends on every filter, the
   commander index, the collection's support counts and the player's deck commanders and themes. A stored
   result is reused only under a fingerprint of all of them, or it can return stale commanders or a reason
   that contradicts the current filters; one read in flight per player; the allowance of 5 (10 for the owner) per rolling
   24 hours is shared with Overview and Suggested changes. A press with an empty box runs the free search
   and charges nothing.
8. **Off in production.** `HELP_ME_CHOOSE_ENABLED` (`src/lib/intake/flag.ts:10`) stays off in production
   until Hugh walks it. The rework ships behind the same switch.

## What Design owns

- **The box.** Its label, its placeholder, its place in the form, and how it reads as optional, so a
  player who wants only filters never feels asked to write. Today's words field is the first thing in the
  form (`intake-form.tsx:132-133`); whether the new box is that field renamed or a second field is
  Design's call (open question 1).
- **The press.** What the submit button says when the box has text and the player is about to spend a
  credit, how the credit standing reads beside it, and the state when no credit is left. The shipped
  *Look deeper* panel (`deeper-look.tsx`, STATES 3a to 3g in the existing handoff) already draws standing,
  waiting, Stop and the closed states; reuse what still applies.
- **The wait.** A read that scans the pool takes longer than today's mapping call. How the waiting state
  reads at 390 and 900, and how Stop looks.
- **The reasons line.** One line under each of the top 10 commanders that ties the commander to what the
  player wrote and, when the ask compared against their decks, to what they already own. Its length, its
  place in the row (`src/components/intake/choose-row.tsx`), and how it reads on a phone row.
- **The nothing-fits state.** The model found no commander in the shortlist that fits. It says so plainly,
  keeps the filter results visible, and does not read as an error or as a refund notice. Whether the
  credit comes back (it does today, on a read that adds nothing) is a question below.
- **What the chips and *Not used* become.** Today the read's output is chips plus a *Not used* line
  (`read-as-bar.tsx`). After this round the text is no longer turned into chips. What happens to the
  *Read as* bar, to the `d` marks that say which answers a read added, and to *Not used* is Design's to
  draw. Free-match chips (a typed theme or card name) still exist for filters.
- **Copy.** Every string goes through `/copy-review`.

## Open questions

1. **Where the box sits.** Ruling 2 fixes what it does; its place in the form, and how it reads as the one
   paid field among free ones, is yours. Typing a theme or card name stays a filter through the existing
   pickers; the box text is never turned into chips.
2. **Does a nothing-fits result refund?** Today a read that adds nothing refunds
   (`run-store.ts:258`, `271`). A scan that honestly finds nothing fits is a correct answer. Is it free?
3. **How is "unlike my decks" shown?** The reason line can name the deck it differs from ("your Omnath deck
   is the other Landfall deck you own"). Is that wanted on every row, only when the text asked for
   difference, or never?
4. **When the player has no decks.** The comparison has nothing to compare. The box still works on tone
   alone; does the reason line say so?
5. **A second press.** Editing the text and pressing again is a new ask and a new credit (the hash changes).
   Does the form warn when the player is about to spend a second credit on a near-identical ask?
6. **The credit standing.** It already shows on the results page; the new press is on the form. Where does
   the standing live now?

## Fixtures

All on staging, read-only, figures as of 2026-10-11.

- **Account:** `user_3GkZrrTwOJBdqUpq6GambP0BC8w` (21 decks).
- **Ask A:** "a horrors deck that's scary and a little nasty". No filters. Expect: the whole pool is eligible
  (3,445 commanders), the shortlist is tonal, and the top 10 reasons say why each reads as scary or nasty.
  Compare against the tag baseline (112 `horrors` commanders, led by Atraxa and Sauron).
- **Ask B:** "a Landfall deck unlike other decks I own". No filters. Expect: Landfall commanders (683 carry
  the tag), none of which is Omnath (he has built it, so `isCandidate` has removed it), with reasons that say how each
  differs from his two lands-matter decks (Omnath and Teval).
- **Ask A with a color filter** (black on, others off): proves the filter holds when the text asks for
  more than the filter admits.
- **Ask with no fit**, for instance Landfall inside a colorless identity filter: the nothing-fits state.
- **An account with no decks:** the empty comparison (open question 4).

Names and counts are real and drift with the index; Design may treat them as illustrative if the
arithmetic stays consistent across frames.

## The About entry owed

Help me choose already has an entry. Its line "Look deeper reads everything you wrote, and uses a credit
to give you a more informed result" is in `src/lib/copy/about.ts:532`, and the credits entry
(`about.ts:1168`) lists "Each Look deeper in Help me choose" as a use. This round changes what the box does
and what spends a credit, so both entries need to say it. Design draws the revised entry on the per-entry
artboard in `design/design_handoff_the99_about/`. Whether the change is an ordinary edit to the existing
entry or owes a new entry and an `ABOUT_VERSION` bump is Hugh's call (`AGENTS.md`, About entries): this
changes what a player can do rather than how a surface looks, which argues for the bump. The entry ships
with the build, behind the same switch.

## Paths

- Intake engine: `src/lib/intake/` (`read.ts`, `deeper-read.ts`, `run-store.ts`, `submit.ts`, `match.ts`,
  `rank.ts`, `search.ts`, `limits.ts`, `flag.ts`, `params.ts`).
- Components: `src/components/intake/` (`intake-form.tsx`, `deeper-look.tsx`, `read-as-bar.tsx`,
  `choose-results.tsx`, `choose-row.tsx`) and `src/app/decks/new/choose/`.
- Credits and pricing: `src/lib/model/prices.ts`, `allowance-rule.ts`, `allowance.ts`;
  `src/lib/copy/credits.ts`.
- The existing handoff this extends: `design/design_handoff_the99_help_me_choose/` (`HANDOFF.md`,
  `READINESS.md`, `help-me-choose · copy strings.ts`, `addendum-three-answers/`).
- Switch: `helpMeChooseEnabled` in `src/lib/intake/flag.ts` (`HELP_ME_CHOOSE_ENABLED`).

## Deliverable

A handoff in `design/design_handoff_the99_help_me_choose/` (a new round) with frames at 900 and 390 for:
the form with the box empty and filled; the press with a credit available and with none; the waiting state
and Stop; the results with reasons on Ask A and Ask B; the nothing-fits state; the failed and refunded
states; the revised *Read as* bar; the `STATES` rows and design-table sections they change; and the revised
About entry on the per-entry artboard.

# The 99 · Public landing page (account 2, 2026-11-08)

Canvas: https://claude.ai/artifact/Eb1daYtVt3wLjAbSTLPvfN
Status: **R4 drawn 2026-11-08 from Hugh's R3 notes, awaiting review.** R2 and R1 are kept below for history; the latest round wins where they differ.
Brief: `docs/superpowers/design-briefs/2026-11-07-public-landing.md` (PR #2661). Its seven Settled decisions hold; this
round makes the eight open calls and answers the appendix's two toast questions.

The signed-out `/` becomes a showcase: hero with the main button, real catalog numbers, the core loop, Bring your
collection, Try it (the demo), Written for real, free versus credits, the close, and the shipped Fan Content notice.
Invite-only today (**Tell me at launch**), open sign-up (**Sign up free**) drawn too. Drawn at 390 and 1300 in Low Sun,
with Neon Rain for the theme switch. Dashed copper marks a change to a shipped screen. Strings marked DRAFT go to
`/copy-review`.

**About the captures.** Every product screen on the boards is today's About capture standing in (stamped blue). Those
captures sit on a real account, so the build uses only the si10 re-shoot on the fictional fixture ("Sam's binder").
Where the demo shows a stored AI result that no capture holds yet, a blue dashed slot names the capture owed. Proxies,
Home feed and Versions captures are not used anywhere.

To view a board, open its `.dc.html` with `support.js` beside it. `scratch-gen/` is the generator (`lp.py` the landing
kit, `fr.py` the first run, `boards.py` the boards, over the announcements `kit.py`): `BMOD=boards python3 build.py local`,
then `node render.js $PWD/out <names>`.

| Board | What |
|---|---|
| `Main.dc.html` | The eight calls, the state rules, the capture note, the toast answers |
| `Page-390.dc.html` | The whole page at 390, invite-only, in three frames |
| `Page-Desktop.dc.html` | The whole page at 1300, in two frames |
| `Hero-States.dc.html` | Hero in Neon Rain (390, 1300); open sign-up (hero, close); numbers unavailable |
| `Launch-List.dc.html` | Tell me at launch: entry, sending, sent, not an email, throttled (390, 1300) |
| `Collection.dc.html` | Bring your collection, each export guide open (390), ManaBox open at 1300 |
| `Demo-390.dc.html` | Try it: start, steps 1 to 8, the end, skipped from step 4 |
| `Demo-Desktop.dc.html` | The same at 1300 |
| `First-Run.dc.html` | Signed-in first run: empty, How to export, upload failed, no Name or Quantity column, partial, success; scan and import fragments |
| `Written-Free.dc.html` | Written for real (public pages on); free and credits; What credits cost (sheet, modal) |




## R4 (2026-11-08): Hugh's R3 notes

- **Commanders:** Hugh's own images of **Y'shtola, Night's Blessed** (FIC 0007) and **Tam, the Possibility** (FRA 0317, borderless) are in. Commanders reads Jace 84 · Y'shtola 79 · Tam 72 (Ashling is Sam's built deck, so it is not on the haven't-built list). The phone hero's side cards are Jace and Y'shtola; desktop fans Y'shtola and Tam around the phone; Written for real reads Y'shtola and Tam. Vivi dropped (Hugh: a second Final Fantasy card).
- **Free line, gift and sun:** approved by Hugh as drawn in R3.
- **Motion:** the daily glow is smaller with a soft, blurred edge (10px blur, 3px spread) instead of a ring; bars fill at `--motion-duration` (320ms) on `--motion-ease-out`. Every move reads the shipped motion tokens; rise-in is `.anim-gentle-in` with `.anim-reveal`'s 40ms stagger; the count is the shipped `CountUp`. How the app does it: Motion board, right-hand note.

## R3 (2026-11-08): Hugh's R2 notes

| Hugh's note | R3 |
|---|---|
| Newer or more popular commanders | From EDHREC (Nov 2026): **Jace, Multiverse Architect** (#1 past month, 11.7K decks) leads the hero and Commanders; **Ashling, the Limitless** (2026) is the demo deck (mono-red elementals); **Giada, Font of Hope** (#4 past month) stays. Asked Hugh for **Y'shtola, Night's Blessed** (#1 past two years, 57.7K), **Vivi Ornitier** and **Tam, the Possibility** images; they swap in when they arrive. |
| Headline A, but empty space at right on the phone | A is chosen. On the phone the headline keeps a 262px measure and two cards (Jace in front, Ashling behind) sit in the space beside it and drift. The phone screen below drops its fanned cards so they don't repeat. Desktop unchanged. |
| Free chips at the end of titles look awkward | **Recommend one line under the loop's heading**: Free chip + "All four are free, always. No credits, no limits." No chip on any title. Alternative drawn: a chip in each card's top-right corner, on the icon's line. |
| Iconography on the welcome credits | A gift tile beside 15, a sun tile beside +1, and a row of fifteen diamonds, three over each writing tool's icon (Overview, Changes, Cuts, Choose, Which deck): "15 credits = each writing tool, three times". |
| Subtle, fun animations | Motion board, six moves drawn live: hero cards drift (the only looping one); sections rise in once; 15 counts up; the diamonds light three at a time; the +1 sun glows once; bars fill. None run for reduced-motion readers; text is never animated in. |
| Card markers in the walkthrough | Step 4 now shows the shipped marks with the shipped key line: `$` to buy, dashed `P` proxy, the game changer bolt, the tutor arrow, `◆ short` (another deck holds it) and the doubled red `◆◆ short` (two decks want one copy), plus a one-line note on Sol Ring's over-commitment. Caption names them. |
| UI examples in the tooltips | Each ⓘ tooltip now has the sentence plus a **What you get** preview drawn from the dummy app (Overview stages, swap rows, named cuts, a ranked list, a card → deck). Tooltips board shows all five, and in place at 390 and 1300. |

## R2 (2026-11-08): Hugh's R1 audit, item by item

| Hugh's note | R2 |
|---|---|
| A more popular commander; don't show my collection | Every product screen is a **drawn dummy app** on Sam's made-up binder (`scratch-gen/app.py`): Lathliss, Dragon Queen (dragons, fit 81), Ghalta, Primal Hunger (74), Giada, Font of Hope (69), plus twelve card tiles. No capture of any account is used anywhere. Words an AI tool would write carry a **STAND-IN WORDS** tag; the build replays stored output for the fixture. |
| Tell me at launch blends in | Its own raised panel with an accent border, a heading (**Get in when it opens**) and a line, in the hero; the close is a set-apart sunken band holding the same panel. |
| Workshop the headline | Board 1b, four options. **Recommend A**: italic kicker *99 problems, but your commander ain't one.* over H1 **Your next commander is already in your binder.** B: the joke as H1. C: *Build the deck your binder is hiding.* D: *Every commander you can build, from cards you already own.* DRAFT. |
| Free chips float at the bottom | The loop is four icon cards; the Free chip sits beside each heading. |
| No time estimates | Removed everywhere ("about a minute", "8 steps · about a minute"). |
| Clipped section screenshots; more icons and words | The loop drops screenshots: four cards with the nav icons (Collection, Commanders, Decks, plus a cart), one line and two points each. |
| Credits chip and Suggested changes | Chip **1–2 per run**; Suggested changes **1–2 credits** (the 10-swaps rule stays in the app). |
| Lead on 15 welcome + 1 a day; tooltips | A value block leads Free and credits: **15 welcome credits** (30 days) and **+1 free credit every day**, "enough to run every writing tool three times before you spend a thing", then What credits cost. Every paid tool has an ⓘ: a popover under the row on the phone (press), a tooltip on desktop (hover, focus or press). One open at a time. Words in the copy table below. |
| Export chevrons misaligned, wrong icon | The shipped down chevron (16px SVG), vertically centered in a 44px row, turned 180° when open; same in the first run's guide sheet. |
| New to all this? first; drop No app yet; scan/search copy | New to all this? leads the section; the No app yet group is gone. Step 2 reads **Add the rest as you go.** Scan cards with your phone's camera, or search for them by name. The first run's ways line says the same. |
| Walkthrough highlighting; screenshots or dummy app? | **Demo call 3 changes to B, a live dummy app** (below). Highlights sit on the real control (step 1 the first card, step 2 the fit, step 4 the Shopping segment). |
| Moxfield deck links | A note inside Moxfield's export guide and under the first run's Import a deck: "**Moxfield deck links don't import yet.** Moxfield doesn't let deck-building apps read them today. They're working on a way, and The 99 will connect as soon as it's ready. Until then, export or paste the list." DRAFT. |
| What credits cost wraps | Each row is name and price on one line (price `nowrap`), its words on the line below across the row. |

**Call 3, revised: B, a live dummy app.** Each demo step renders the shipped signed-in drawing half (the Commanders row,
the collection grid, the deck's one-line rows, Analysis cells, Suggested changes, Proposed cuts, Shopping) fed by Sam's
fixture, at native size. On a phone the step's words sit above the app and Back and Next below; on desktop the words sit
left and the app right. Presses on the app do what they do signed in where that is read-only (open card details, switch
tabs); anything that would write is inert. **Cost:** about nine signed-in components need their drawing split from their
data first. **Sequencing:** the landing ships without Try it; the section arrives once the refactors land. Nothing in the
page around it changes.

### Tooltip words (DRAFT)
- **Overview of a deck**: A written read of your deck: its game plan from the first turns to the win, what to keep in an opening hand, and where it's weak.
- **Suggested changes**: Say what you want from the deck in your own words. It picks cards to add and cut, from your collection first, and says why for each.
- **Look deeper in Proposed cuts**: When a deck runs over 99, it names the exact cards to cut and why each one goes.
- **Help me choose with "Anything else?"**: Describe the deck you're after in your own words, and it ranks the commanders that fit, owned or not.
- **Which deck needs it most?**: Got a new card? It reads it against every deck you have and tells you where it does the most.

### Boards (R3)
1 The calls · 1b Headline and Free chips · 2 Page 390 · 3 Page desktop · 4 Theme, open sign-up, no numbers · 5 Tell me at launch ·
6 Bring your collection · 7 Try it 390 · 8 Try it desktop · 9 The first run · 10 Written for real, free and credits · 11 Tooltips · 12 Motion.
Generator: `scratch-gen/` (`lp.py` + `lp_r2.py` + `lp_r3.py` landing, `app.py` dummy app, `fr.py` first run, `boards.py`).

## R1 below

## The calls (recommended)

1. **The hero's screen:** a framed composite of two real captures, Commanders over a deck, fanned with a slight tilt;
   desktop puts the desktop Commanders page with the phone over its corner. No loop (motion to pause for reduced motion,
   six themes of frames to keep, and the demo already walks the product).
2. **Theme switch:** yes. *See it in* plus six round swatches (ground and accent), the chosen one ringed and named. It sets
   the same `the99_theme` cookie and re-themes the page and its captures. Phone: under the screen; desktop: under the words.
3. **Demo liveness: A, the capture walk.** It ships with the landing; B waits on about nine refactors of signed-in tools.
   The target is a minute of pressing, one press per step, which a press-through fully gives, and every result stays
   exactly what the tool wrote. **Frame: inline**, a stage inside Try it, the same at both widths: *Step N of 8* with an
   8-segment bar and *Skip to the end* on top; the capture with a numbered accent ring on what the step is about; then the
   Free or credit tags, the title, two lines, Back and Next; the foot reads *Like it with your own cards? Tell me at launch*
   (scrolls to the close's form). Start replaces itself with step 1 in place; no sheet, no full-screen walk.
4. **Demo order: eight steps.** 1 Sam's collection · 2 The commanders Sam can build · 3 Help me choose ("Anything else?"
   filled, read-only) · 4 A deck from what Sam owns · 5 Analysis and Overview · 6 Suggested changes · 7 Get it to 99
   (Proposed cuts with Look deeper, Top off, Mana Balance) · 8 Buy only what's missing, with Which deck needs it most?.
   Every tool appears once.
5. **Export guides:** an expandable row per app (ManaBox, Moxfield, Archidekt, Deckbox), three steps in words, one open at
   a time. No other apps' screenshots, no logos. The same rows open from the first run in a sheet (phone) or modal
   (desktop). **The steps must be checked against each app before the build**; they are drafted from memory.
6. **The first-timer path: precons first, then scan the legends.** Precons I own lands a whole deck and its commander, so
   the list lights at once; then scan legendary creatures first. The scan's count card gains a line, *{n} of them are
   commanders you can build*: that is how the screen says "enough to start", with no target count. Scan your cards moves
   out of Add cards by hand into its own row in the ways group.
7. **Free versus credits: both.** Tags where each loop step and demo step is shown, plus one two-column block. Prices are
   one press away: *What credits cost* opens a sheet (phone) or modal (desktop) with the pack and the plan, read from
   `PLANS`/packs, never typed.
8. **Written for real:** two commanders' stored reads with their art, each opening `/commander/<slug>`, and one precon
   Overview's lead (needs `precon_synopses` on the public-read allowlist, with a test). Picks vary their openings and are
   read from stored rows at build time. Its own section after the demo.

Also ruled: **Import a deck from the first run starts with "I own these cards" ticked** (an empty collection means the deck
is most likely cards they have; untick for a wishlist deck).

## States

- **Signed in at `/`:** Home exactly as today. The landing renders only with no session.
- **Numbers unavailable:** any of the five unreadable and the whole strip drops. Never a zero, never a dash.
- **Launch list:** entry; sending (*Sending…*, field keeps its text); sent (replaces the form in place, hero and close
  alike); not an email (checked before sending, error edge, shipped words); throttled (the anonymous rate bucket; shipped
  words). **Already on the list draws exactly as sent.**
- **Open sign-up:** the field goes; *Sign up free* opens Clerk's sign-up; *Free to join. No card details. Already a member?
  Sign in*. Sign in stays in the bar. A copy and route change only.
- **Demo:** start, each step, the end (with the form and Start over), and Skip from any step lands on the end with *You
  skipped steps {n} to 8. Go back to step {n}*. Nothing typed reaches anything: wishes are read-only.
- **First run:** empty; How to export open; upload failed (shipped words); no Name or Quantity column (new error, below);
  partial match (shipped review, one new line on why names were skipped); success (step 2 opens on *{n} commanders you can
  build from your cards*).
- **Reduced motion:** nothing on the page moves by itself.

## Copy (DRAFT unless marked shipped)

| Where | Text |
|---|---|
| Hero kicker | *Magic: The Gathering · Commander* (shipped, flyer) |
| Hero title | *Search your library for a commander.* (shipped, flyer pitch) |
| Hero line | *The 99 reads the cards you own and shows you every commander they can build. Then it builds the deck and lists only what's missing.* |
| Free lines | *Free to use: your collection, every commander, deck building and the shopping list.* / *Credits only for the tools that write something just for you.* |
| Field | *Your email* · placeholder *name@example.com* (shipped) |
| Press | *Tell me at launch* (shipped) · later *Sign up free* |
| Fine, invite-only | *The 99 is invite-only until launch. Have an invitation? Open its link.* |
| Fine, open | *Free to join. No card details. Already a member? Sign in* |
| Sent | *You're on the list* / *We'll email {email} the day The 99 opens to everyone.* (shipped) |
| Errors | *Enter an email address, like name@example.com.* · *Too many tries. Wait a little, then try again.* (shipped) |
| Theme | *See it in* + theme name |
| Numbers | *commanders · with a written read · precons · combos tracked · cards* |
| Loop | *How it works* / *From your binder to a finished deck*; 1 *Upload your collection* (*A CSV from the app you use now, a pasted list, or your phone's camera.*) 2 *See what you can build* (*Every commander you own, ranked by how much of its deck is already in your binder.*) 3 *Build from what you own* (*The 99 fills the deck from your cards first, and marks what you're missing.*) 4 *Buy only what's missing* (*One shopping list across your decks, with cheaper stand-ins and friends' spares first.*) |
| Bring | *Bring your collection* / *Start with the cards you already own* / *Everything in The 99 reads your collection, so it comes in first. Bring it from the app you use now, or start with no app at all.* Rows as drawn; *No app yet* group. |
| First-timer card | *New to all this?* / *You don't need the whole box in. Two steps light up your first commanders:* 1 *Pick the precons you own. One press adds a whole deck, and its commander.* 2 *Scan your legendary creatures next. Each one is a commander you can build, so the list grows with every scan. The rest of the box can wait.* |
| Try it | *See it work before you join* / *A made-up player's cards, eight of the tools, the real results they gave. About a minute.* Start card: *8 steps · about a minute* / *Try it on Sam's cards* / *Sam is a made-up player with a real-looking binder. Press through eight of the tools and see what each one gave Sam. Nothing you press is saved, and nothing costs a credit.* / *Start* |
| Demo steps | Titles and lines as on `Demo-390`; foot *Like it with your own cards? Tell me at launch*; end *That was Sam's binder. Yours works the same.* / *Bring your cards in, and every commander and deck here is built from what you own. The core is free; credits are only for the tools that write for you.* / *Start over* |
| Written | *Written for real* / *A written read for {n} commanders* / *Every commander page opens with why it's worth building. Every precon has an Overview. Both are free to read.* · *Why this commander* · *Open its page ›* · *Open the precon's list ›* |
| Free and credits | *The core is free. Credits are for writing.* / *Browsing is always free. Anything we write just for you uses a credit.* (shipped) · *Free, always* / *No credits, no limits.* · *With credits* / *Each run of a writing tool on your deck.* · *You start with 15 welcome credits, and get one free credit a day.* · *What credits cost* |
| Prices sheet | *What credits cost* · *Credit pack* *40 credits that never expire* · *Monthly plan* *50 credits a month, unused ones roll over* · *Credits are bought once you're in. Browsing stays free either way.* |
| Close | *Your cards already know what to build.* + tagline *99 problems, but your commander ain't one.* (shipped) |
| Footer credits | *Commander data from EDHREC. Combos from Commander Spellbook. Card data and images from Scryfall; prices from Mana Pool.* Then the Fan Content notice, unchanged. |
| First run | *Coming from ManaBox, Moxfield, Archidekt or Deckbox? How to export ›* · ways lead *No collection app? Pick the precons you own, then scan your legendary creatures. Each legend is a commander you can build.* · row *Scan your cards* / *With your phone's camera* |
| No column | *This file has no Quantity column* (or *Name*) / *The 99 needs a Name and a Quantity column in the first row. Most apps' CSV exports have both. How to export, or paste the list instead.* |
| Partial | *Tokens, art cards and playtest cards aren't in the catalog, so they stay out. Everything else came in.* |
| Success | *Your collection is in* / *{n} cards · from {file}* · *{n} commanders you can build from your cards* · *See your commanders* |
| Scan line | *{n} of them are commanders you can build* |
| Guide | *How to export your collection* / *Pick the app your cards are in now.* · per-app steps · *Any CSV with a Name and a Quantity column imports. If yours fails, open it in a spreadsheet and check the first row names both.* |

## The appendix: two toast questions

1. **The got-it receipt: an exception, unchanged.** It is a receipt, not a toast: it records a write and carries three
   different jobs (Undo reverses it, History is where the record lives, Change fixes the printing picked). Folding them to
   one press would hide the record or the fix. The rule gains one line: *the receipt kind (`kind="receipt"`) may carry
   History beside its Undo, with Change in its body; no other toast takes a second press.* As shipped, Undo is the 600
   press and History the quieter 400 one, which is the right weight. No build.
2. **Yes: every toast with no action carries the ✕.** README:43 becomes a requirement: *exactly one press per toast, its
   action or the bare ✕ (44px, `--fg-faint`), never both and never neither.* A toast with no press leaves a phone reader
   no way to clear something sitting over the tab bar for 8s. Build: `token-refusal-toast.tsx` and `credits-toast.tsx`
   (no action, no ✕ today) gain the ✕; check any no-action branch of `social-toast.tsx`. `deleted-group-toast.tsx` already
   follows it.

## Owed before the build

- The si10 fixture and re-shoot, plus the demo's result captures: Help me choose results, the Overview opened, Suggested
  changes results with Why these cards, Look deeper's named cuts, Which deck needs it most? on one card.
- A check of each export guide against the live app.
- `/copy-review` on every DRAFT string above.

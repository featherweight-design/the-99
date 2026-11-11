# The 99 — Public landing page (design handoff, R4)

`design/design_handoff_the99_public_landing/` · 2026-11-08 · account 2 · **R4, approved by Hugh 2026-11-08** · addendum A1 (findings 2, 3, 8, 9 of `READINESS-audit.md`), approved by Hugh 2026-11-08 · addendum A2 (Hugh's walk of the preview), 2026-11-11

Source of truth: `docs/superpowers/design-briefs/2026-11-07-public-landing.md` (PR #2661). Its Settled decisions are not
reopened here. Engineering's plan: `docs/superpowers/plans/2026-11-08-public-landing-demo.md`. Structural sibling:
`design_handoff_the99_public_pages/` (top bar, signed-out block, Fan Content footer).
Canvas: https://claude.ai/artifact/Eb1daYtVt3wLjAbSTLPvfN (23 boards; `canvas.json` is the index, `Main.dc.html` is board 1).
Rounds R1 to R4 live on `design-assets` under `account-2/design_handoff_the99_public_landing/` (R4 6902d4d).

**The one-line summary:** *the signed-out `/` becomes a showcase of a made-up player's binder: a headline with the launch
panel, real catalog numbers, the four-step loop, Bring your collection, Try it (a live dummy app), Written for real, free
versus credits led by the welcome credits, the close and the shipped Fan Content footer.*

To view a board, open its `.dc.html` with `support.js` beside it (images are in `art/`). `scratch-gen/` is the generator
(`lp.py` the landing, `app.py` the dummy app, `fr.py` the first run, `boards.py` the boards, over `kit.py`):
`BMOD=boards python3 build.py local`, then `node render.js $PWD/out <names>`. It is reference, never shipped code.

## Addendum A2 (2026-11-11): refinements from Hugh's walk of the preview

Hugh walked the shipped preview and asked for seven layout and UX changes. Engineering is fixing the mock deviations,
crops, hover, overflow, 404s and copy separately; A2 covers only the calls below. The player is the shipped fixture's,
**Wren** (`lib/demo/player.ts`). Words an AI tool writes stay stand-ins. Where A2 and earlier boards differ, **A2 wins**
(it supersedes the demo frame of call 4, `Demo-390`, `Demo-Desktop` and A1's step 7 layout; A1's decks and fixture stand,
trimmed as below).

| Board | What |
|---|---|
| `A2-Calls.dc.html` | The seven calls, the strings, what goes, the states |
| `A2-Demo-Phone.dc.html` | The section's start card, the dialog at 390 for every step, step 4 unrolled, card details, the end, the section after a close |
| `A2-Demo-Tablet.dc.html` | 768 × 1024 (one column) and 1024 × 768 (two columns) |
| `A2-Demo-Desktop.dc.html` | 1440 × 900: step 4 hovering a mark, step 5 with room, step 7, card details, the end |
| `A2-Card-Details.dc.html` | The demo's card details at 390 and desktop: Mana Pool live, Find a deck disabled |
| `A2-Written.dc.html` | Written for real with Mutant Menace's commander, and its full Overview (sheet, modal) |
| `A2-Layout.dc.html` | The feature squares (1300 today and A2, 768 two by two); Bring your collection today, fill, centre |
| `A2-Themes.dc.html` | The dialog in all six themes |

### 1. See it work is a full-screen dialog

- **The section keeps only the start card.** *Start* loads the data as today (Loading with the sweep; a failed load stays
  on the card with the shipped line), then opens the demo as a **full-screen dialog** at every width. The stage is never
  drawn inline again.
- **Pinned top bar** (`--surface-raised`, `--border-strong` under it): *Step N of 8*, the 8-segment bar, *Skip to the
  end*, and a bare ✕ (44px). The end reads *The end* with the whole bar lit and no Skip.
- **Below 1024px:** the step's words (tags, title, line) and the app scroll as one column between the top bar and a
  **pinned Back/Next bar** at the foot. Phone: Back, then Next filling the row. 768 to 1023: the column is centred at
  680px, Back and Next right-aligned (Next 180px).
- **From 1024px:** two columns. The words take 320px (1024 to 1199) or 360px (1200 and up) at the left with Back and
  Next directly under them, and never scroll; only the app side scrolls, its content capped at 1080px and centred.
- **Next and Back** swap the step, put its scroll at the top and focus its heading (as the shipped frame does today).
- **Closing:** ✕, Escape, or the browser's Back (the shipped `useDialogA11y` back entry). The page under it is
  scroll-locked and inert while it is up; focus returns to the section's main press. Closed mid-way, the section reads
  ***Carry on from step N*** (main) and *Start over* (quiet) until the page reloads; closed from the end, *Start* again.
- **The end** draws inside the dialog: the fan, the title, the launch panel, *Start over* and a quiet *Close*.
- **Card details** open over the dialog (sheet on a phone) and close back to the step.
- **Gone:** the *Like it with your own cards? Tell me at launch* foot on every step (*Skip to the end* is pinned now and
  the end carries the launch panel).

### 2. Trimmed by about half

Every step keeps its tool and shows less:

| Step | A2 |
|---|---|
| 1 Collection | **12 cards** (phone 4 rows of 3, desktop 2 rows of 6), count *12 of Wren's 2,140 cards*, no Show more |
| 2 Commanders | **3 rows** (Jace, Y'shtola, Tam) |
| 3 Help me choose | 3 ranked (as A1) |
| 4 The deck | The key, then **only the 7 rows that carry a mark** (*7 of 99 · the cards with a mark*), then *Show all 99*, which expands the shipped list in place; the Sol Ring note |
| 5 Analysis | The verdict and the Overview's lead and game plan (Early, Mid, Close); nothing after |
| 6 Suggested changes | **3 swaps**, each a card in and a card out (*3 in · 3 out*) |
| 7 Get it to 99 | Look deeper on Giada **101 / 99 · 2 over, 2 named cuts** (Healer's Hawk, Thran Dynamo); Top off on Zimone **96 / 99 · 3 open, 5 rows**; Mana Balance as A1 |
| 8 Buy | As is: 2 to buy, then the Which deck tab |

### 3. Analysis with room

On a desktop the app side is up to 1080px: the four verdict cells in one row, the Overview's lead at reading width and
Early, Mid and Close side by side. Below 1024 it stays the shipped stacked layout.

### 4. Marks are hover, coaches stay off the key

- Step 4 asks for no press on a mark. **Desktop (pointer-fine):** the coach rings one mark (Jeska's Will's game-changer
  bolt) with *Hover a mark* to its right; hovering any mark shows the shipped `FactTooltip`. **Phone:** no hover exists,
  so the key does the job and the coach rings a card row (*Press a card*), its label below the row.
- **Rule: a coach label never sits over the key, or over another control.** It goes beside or below its target.
- Steps 7 and 8 lose *Press a tab*; their lines name the tabs (strings below).

### 5. Card details in the demo

- **Mana Pool's link is live:** the shipped `ExternalLink`, *Buy any printing at Mana Pool*, opening in a new tab like
  everywhere in the app, so the demo never leaves the page. Phone: in flow under the hairline; desktop: stacked at the
  left of the foot with the counter at the right, as shipped.
- **Find a deck is drawn disabled:** the shipped door (`fits-door.tsx`) with its glyph outline and words in
  `--fg-locked`, no underline, no arrow, and the shipped `Lock` after the words; one line under it, mono 10.5px
  `--fg-muted`: *For members: it reads your own decks for where this card fits.* `aria-disabled`, described by the
  line; no hover change, no press. The phone keeps its 44px row.

### 6. Written for real: Mutant Menace, whole

- The precon card gets **The Wise Mothman's art** in the same 150px band as the commander cards, with the precon's
  name and its colour pips (BGU) over it, kicker *Precon Overview · The Wise Mothman*, the Overview's lead, and
  *Read the whole Overview ›*. The whole card is one press.
- It opens the **full Overview** read-only: a modal (desktop, 760px) or sheet (phone), headed by the art band with the
  name and a ✕, then the shipped precon Overview (lead, game plan with Backup, keep in hand, where it's weak, the land
  line, the box's other commander), then a foot: *That's the whole Overview, free to read. Members see one for almost
  every precon, and can have one written for their own decks.* and the launch panel. Still no link to the precon's
  list (A1's call A stands).

### 7. Two layout fixes

- **(a) Feature squares:** on a desktop each square's bullet list sits at its foot, so the four lists line up whatever
  the paragraph's length. From 768 to 1023 the squares go **two by two** instead of four squeezed across.
- **(b) Bring your collection — fill (recommended):** at the signed-out width, *New to all this?* on the left (440px)
  and the four apps on the right, across the section's full 1120px like every section around it; the phone is
  unchanged. Centring the 780px column is drawn for comparison.

### Strings (all DRAFT, for `/copy-review`; explicit, not cute)

| Where | Text |
|---|---|
| Start card | adds *It opens full screen.* |
| Section after a close | *Carry on from step {n}* · *Start over* |
| Step 1 | *Wren is made up, and so is the binder: 2,140 cards. Here are 12 of them. Press any card to open it.* · count *12 of Wren's 2,140 cards* |
| Step 4 | *Built from Wren's cards first. Here are the 7 cards that carry a mark; the key above them says what each mark means.* · *7 of 99 · the cards with a mark* · *Show all 99* · coach *Hover a mark* (desktop) / *Press a card* (phone) |
| Step 5 | *The verdict is free. The Overview is a written read of how the deck plays, from the first turns to the win.* |
| Step 6 | *Wren asked for more interaction. The 99 picked 3 swaps, a card in and a card out each, and says why.* · *3 in · 3 out* |
| Step 7 | *Three tools, one tab each. Look deeper names the cuts for a deck over 99. Top off fills a deck under 99 from Wren's cards. Mana Balance checks the lands.* |
| Step 8 | *Two tabs. The shopping list, cheaper stand-ins first. And Which deck needs it most?, which reads one new card against every deck Wren has.* |
| The end | adds a quiet *Close* |
| Card details | *For members: it reads your own decks for where this card fits.* |
| Written for real | *Precon Overview · The Wise Mothman* · *Read the whole Overview ›* · foot *That's the whole Overview, free to read. Members see one for almost every precon, and can have one written for their own decks.* |

Removed: *Press a mark*, *Press a tab* (×2), the per-step foot, and the old lines of steps 1, 4, 5, 6, 7 and 8.

## Addendum A1 (2026-11-08): four gaps from the readiness audit

Hugh's addendum brief asks for findings 2, 3, 8 and 9 of `READINESS-audit.md` only. Nothing else on the R4 boards
changes: not the hero, the copy or the page structure. Two boards:

| Board | What |
|---|---|
| `A1-Step-7.dc.html` | Demo step 7 at 390 and desktop: Giada over 99 (Look deeper, the default view) and Zimone under 99 (Top off, then Mana Balance with a real fix) |
| `A1-Decks-Precon-Tokens.dc.html` | Sam's three decks and the cards the fixture must hold; step 3's corrected line; the precon link call (A and B); the token ruling |

Where A1 and the R4 boards differ, **A1 wins**: step 7 and step 3's Ashling line on `Demo-390` and `Demo-Desktop` are
superseded.

### Finding 2: Top off (step 7)

- Step 7's app gets a **deck switch** at its top: two read-only tabs, *Giada · Over 99 · 103* and *Zimone · Under 99 ·
  93*. Giada is the default view; the accent ring points at Zimone.
- **Giada view:** deck head *103 / 99 · 4 over*, *This deck is 4 over · Proposed cuts*, Look deeper's four named cuts
  (Healer's Hawk, Serra Angel, Thran Dynamo, Dawn of Hope). The cut reasons are stand-in words; the build replays
  stored output.
- **Zimone view:** deck head *93 / 99 · 6 open*, then the shipped Top off list open (`top-off-list.tsx`, strings from
  `top-off.ts`): *Choose the last 6* · *Close*; *6 of 6 selected* (desktop: *6 of 6 slots selected · 24 candidates,
  18 untouched*); *Select 4 from my collection* and *Select the 6 this deck needs*; the gap line; eight ranked rows
  (tick, ownership dot, name, cost, synergy, decks %, and ×1 owned, the held ◆ mark, or the buy price); the ordering
  line; the commit row *99 of 99 when added · 2 to buy $4.50*, *Cancel*, *Add 6 cards*. Desktop adds the column header
  and the type column, as shipped. Ticking works in the demo; Add is inert.
- **Mana Balance with a real fix** (optional item, drawn): Green 41 pips · 23 sources · needs 19; Blue 28 · **15** ·
  needs 17. *Help adding blue*: *Up to 2 Forests → Islands* (*blue 15 → 17*, press *Swap basics*), and the staple
  *Yavimaya Coast*, owned · 1 free, *Trade 1 Forest for it*. Presses inert.
- The step's caption and tags are unchanged; they already name all three tools.

### Finding 3: the second deck (Sam has three)

One deck can hold one size, and the tools need three: full, over and under. Giada was already Sam's deck in step 8, so
the true addition is one deck, Zimone. The fixture already carries five decks.

| Deck | Size | Steps |
|---|---|---|
| **Ashling, the Limitless** (mono-red elementals) | 99 / 99 · 97 owned, 2 to buy | 3 (ranks first), 4, 5, 6, 8 Shopping |
| **Giada, Font of Hope** (mono-white Angels) | 103 / 99 · 4 over | 7 Look deeper (default view), 8 Which deck (Swords to Plowshares goes here) |
| **Zimone, Mystery Unraveler** (Simic lands) | 93 / 99 · 6 open | 7 Top off and Mana Balance |

**Step 3** changes one line: Help me choose's Ashling row reads *97 of the 99 are in Sam's binder* (was 38), matching
step 4.

**What the fixture must hold:**

- **Ashling:** as R4. Fury as a proxy; Flamekin Harbinger and Gamble (tutors); Jeska's Will (Game Changer, to buy);
  Soulbright Flamekin (to buy); Arcane Signet (another deck holds it); Sol Ring, one copy wanted by Ashling and Giada.
- **Giada:** 103 cards, including Healer's Hawk, Serra Angel, Thran Dynamo and Dawn of Hope; only three answers, so
  Which deck sends Swords to Plowshares here; holds Sol Ring.
- **Zimone:** 93 cards, 23 Green and 15 Blue sources, Forest-heavy. In the binder with a free copy: Tatyova, Benthic
  Druid; Retreat to Coralhelm; Exploration; Growth Spiral; Yavimaya Coast. Owned but sleeved in another deck: Lotus
  Cobra. Not owned: Aesi, Tyrant of Gyre Strait; Scute Swarm; Avenger of Zendikar.
- Figures (fits, synergy, inclusion, prices, pips) are whatever the fixture produces; the layout holds any. The
  fixture's deck names can stay; the demo shows the commander.

### Finding 9: the precon link (call: A, no link)

**A, no link (recommended).** The Mutant Menace card in Written for real ends after its Overview. Signed-out visitors
can't open `/decks/precons/[fileName]`, and while The 99 is invite-only almost none of them can sign in, so a sign-in
link is a dead end for nearly everyone who presses it. The two commander cards keep *Open its page ›*: those pages are
public. This removes the string *Open the precon's list ›* and adds none.

B, link to sign-in (*Sign in to open its list ›* → `/sign-in?redirect_url=/decks/precons/[fileName]`), is drawn for
comparison only. Revisit it when sign-up opens.

### Finding 8: token ruling

Nothing new joins `globals.css`.

| Colour | Where | Ruling |
|---|---|---|
| `#C9B98A` | A segment of the fit bar on the dummy Commanders row (hero, step 2) | The shipped `FitBar` (`fit-bar.tsx`): pool `--accent-dim`, roles `--accent-mid`, synergy `--accent`. The other segment colours drawn on those bars go the same way. |
| `#9C9384` | Generic mana pip on the deck's one-line rows (step 4) | No token: the build draws `CostPips`, which is mana symbol art. A flat board stand-in would be `--fg-faint`. |
| `#F5EEDF` | Commander name over art (dummy Commanders row, Written for real cards) | `--fg` with the row's shipped `INK_SHADOW`, as `commander-row.tsx` draws it. |
| `#B9C7D6` | R1's blue "capture owed" slot text (`.slot`) | Dead rule: a board annotation no R4 board draws. Nothing ships it; no token. |
| `#E07A66` | The launch error, the first run's errors, the minus on cuts | `--danger`, as `join-flow.tsx` uses (audit finding 8). The A1 boards already draw it so. |

## Boards

| Board | What |
|---|---|
| `Main.dc.html` | The eight calls, the state rules, round notes, the toast answers |
| `Headline.dc.html` | The four headline options (A chosen) and the two Free-chip placements (the line chosen) |
| `Page-390.dc.html` | The whole page at 390, invite-only |
| `Page-Desktop.dc.html` | The whole page at 1300 |
| `Hero-States.dc.html` | Hero in Neon Rain (390, 1300); open sign-up (hero, close); numbers unavailable |
| `Launch-List.dc.html` | Tell me at launch: entry, sending, sent, not an email, throttled (390, 1300) |
| `Collection.dc.html` | Bring your collection: each export guide open at 390, ManaBox open at 1300, the Moxfield note |
| `Demo-390.dc.html` | Try it: start, steps 1 to 8, the end, skipped from step 4 |
| `Demo-Desktop.dc.html` | The same at 1300 |
| `First-Run.dc.html` | Signed-in first run: empty, How to export, upload failed, no Name or Quantity column, partial, success; scan and import fragments |
| `Written-Free.dc.html` | Written for real; free and credits with the value block; What credits cost (sheet, modal) |
| `Tooltips.dc.html` | The five ⓘ tooltips with their What you get previews, alone and in place at 390 and 1300 |
| `Motion.dc.html` | The six moves, live, and how each maps to the shipped motion tokens |

## The fixture: Sam's made-up binder

No capture of any real account appears anywhere (Hugh: "Let's not show my collection here"). Every product screen is a
**drawn dummy app** on Sam's fictional binder (`scratch-gen/app.py`). The cast, picked from EDHREC (Nov 2026) for reach:

- **Commanders Sam can build:** Jace, Multiverse Architect (fit 84, #1 last month), Y'shtola, Night's Blessed (79, #1
  over two years), Tam, the Possibility (72).
- **The built deck:** Ashling, the Limitless (mono-red elementals). It is the demo's deck, so it is not on the
  can-build list.
- **Also:** Giada, Font of Hope (Help me choose's third pick, and Which deck's answer for Swords to Plowshares).
- **Help me choose:** "Something red and fast…" ranks Ashling 92, Jace 71, Giada 64.
- **The deck's marks (step 4):** a proxy (Fury), a tutor (Flamekin Harbinger, Gamble), a game changer (Jeska's Will),
  to buy (Soulbright Flamekin, Jeska's Will), short (Arcane Signet) and over-committed (Sol Ring).
- **Shopping:** $9.40 (Soulbright Flamekin $2.60 with a cheaper stand-in, Jeska's Will $6.80).

Words an AI tool writes are stand-ins on the boards. The build replays stored output for the fixture (`demo:generate`,
PR 3); see READINESS for what the fixture must hold.

## The eight calls

| # | Question | Call |
|---|---|---|
| 1 | The hero's screen | **The dummy app's Commanders page** (Jace 84 · Y'shtola 79 · Tam 72) in a phone frame. Desktop fans Y'shtola and Tam around the phone, Jace in front. On the phone, Jace and Y'shtola sit as two small cards beside the headline (filling the space at its right) and drift; the phone screen below drops its fanned cards so they don't repeat. |
| 2 | Theme switch | **Yes.** *See it in* plus six round swatches (ground and accent), the chosen one ringed and named. It sets the shipped `the99_theme` cookie and re-themes the page and the dummy app. Phone: under the screen; desktop: under the words. |
| 3 | Demo liveness | **B, a live dummy app.** Each step renders the shipped signed-in drawing half (Commanders row, collection grid, the deck's one-line rows, Analysis, Suggested changes, Proposed cuts, Shopping) fed by Sam's fixture at native size. Read-only presses work as signed in (card details, tabs); anything that writes is inert. Highlights sit on the real control. **Sequencing:** the landing ships without Try it; the section arrives once the drawing/data splits land (about nine components). Nothing around it changes. |
| 4 | Demo order | **Eight steps**, every tool once: 1 Sam's collection · 2 The commanders Sam can build · 3 Help me choose · 4 A deck from what Sam owns (with the card marks and key line) · 5 Analysis and Overview · 6 Suggested changes · 7 Get it to 99 (Look deeper, Top off, Mana Balance) · 8 Buy only what's missing, with Which deck needs it most?. Frame inline in the section: *Step N of 8*, an 8-segment bar, *Skip to the end*; on the phone words above the app and Back/Next below, on desktop words left and app right. No time estimates anywhere. |
| 5 | Export guides | An expandable row per app (ManaBox, Moxfield, Archidekt, Deckbox), three steps in words, one open at a time, the shipped 16px down chevron centered in a 44px row (turned 180° open). No logos, no other apps' screenshots. Moxfield carries the deck-link note. The same rows open from the first run in a sheet (phone) or modal (desktop). |
| 6 | The first-timer path | **New to all this?** leads Bring your collection: pick the precons you own (one press lands a whole deck and its commander), then add the rest by scanning with the phone's camera or searching by name. Scan your cards moves out of Add cards by hand into its own row. The scan's count card gains *{n} of them are commanders you can build*. |
| 7 | Free versus credits | One section led by a **value block**: a gift tile beside **15 welcome credits** (30 days) and a sun tile beside **+1 free credit every day**, with fifteen diamonds lighting three over each writing tool's icon (*enough to run every writing tool three times*). Then two columns: *Free, always* and *With credits* (chip **1–2 per run**), each paid tool with an ⓘ tooltip (press on the phone, hover/focus/press on desktop, one open at a time) holding a sentence and a **What you get** preview. *What credits cost* opens a sheet (phone) or modal (desktop) read from `PLANS`/packs, never typed. Demo steps carry their Free or credit tags. |
| 8 | Written for real | Y'shtola's and Tam's stored commander reads with their art, each opening `/commander/<slug>`, and one precon Overview's lead (Mutant Menace), its own section after the demo. Picks are read from stored rows at build time. |

**The loop's Free mark:** one line under the loop heading, Free chip + *All four are free, always. No credits, no
limits.* No chip on any card title.

**Import a deck from the first run starts with "I own these cards" ticked** (an empty collection means the deck is most
likely cards they have; untick for a wishlist deck).

## Motion (Motion board)

Every move reads the shipped tokens in `src/app/globals.css` and runs only under `prefers-reduced-motion: no-preference`;
text is never animated in.

1. **Hero cards drift** (the only loop): a few px of translate and ≤1° of rotate, slow.
2. **Sections rise in once** on entering view: `.anim-gentle-in`, with `.anim-reveal`'s `--motion-stagger` (40ms) on
   children.
3. **15 counts up** once: the shipped `CountUp`.
4. **The diamonds light three at a time**, `--motion-stagger` apart.
5. **The +1 sun glows once**: a small, soft-edged glow (`0 0 10px 3px`, accent at low alpha), no ring.
6. **Bars fill** at `--motion-duration` (320ms) on `--motion-ease-out`.

## Card marks in the demo (step 4)

The deck's one-line rows use the shipped marks and the shipped `MarkKey` line: `$` to buy, the dashed `P` proxy tag, the
game changer bolt and tutor arrow (`card-fact-mark.tsx`), `◆` short and the doubled red `◆◆` over-committed
(`availability-marker.tsx`). One quiet note under the rows explains Sol Ring's over-commitment. The step's caption names
the marks.

## States

- **Signed in at `/`:** Home exactly as today. The landing renders only with no session.
- **Numbers unavailable:** any count unreadable and the whole strip drops. Never a zero, never a dash.
- **Launch list:** entry; sending (*Sending…*, field keeps its text); sent (replaces the form in place, hero and close
  alike); not an email (checked before sending, error edge, shipped words); throttled (shipped words). **Already on the
  list draws exactly as sent**, so the page never reveals whether an address is listed.
- **Open sign-up:** the field goes; *Make your free account* panel, *Sign up free* opens Clerk's sign-up; fine print
  *Free to join. No card details. Already a member? Sign in*. A copy and route change only, built with the PR that opens
  sign-up.
- **Demo:** start, each step, the end (with the launch panel and Start over), and Skip from any step lands on the end
  with *You skipped steps {n} to 8. Go back to step {n}*. Nothing typed reaches anything.
- **Tooltips:** one open at a time; Escape and an outside press close; the ⓘ is a 44px target on the phone.
- **First run:** empty; How to export open; upload failed (shipped words); no Name or Quantity column (new error);
  partial match (one new line on why names were skipped); success (*{n} commanders you can build from your cards*).
- **Reduced motion:** nothing on the page moves by itself.

## Copy (DRAFT unless marked shipped; all DRAFT strings go to `/copy-review`)

| Where | Text |
|---|---|
| Hero kicker | *99 problems, but your commander ain't one.* (shipped tagline) |
| Hero title | *Your next commander is already in your binder.* |
| Hero line | *The 99 reads the cards you own, shows you every commander they can build, and builds the deck from them. You buy only what's missing.* |
| Launch panel | *Get in when it opens* / *The 99 is invite-only until launch. Leave your email and we'll tell you the day it opens to everyone.* · fine *Have an invitation? Open its link.* |
| Launch panel, open | *Make your free account* / *Bring your collection and start building. 15 welcome credits are waiting.* · *Sign up free* · *Free to join. No card details. Already a member? Sign in* |
| Field and press | *Your email* · *name@example.com* · *Tell me at launch* (all shipped) |
| Sent | *You're on the list* / *We'll email {email} the day The 99 opens to everyone.* (shipped) |
| Errors | *Enter an email address, like name@example.com.* · *Too many tries. Wait a little, then try again.* (shipped) |
| Theme | *See it in* + theme name |
| Numbers | *commanders · with a written read · precons · combos tracked · cards* |
| Loop | *How it works* / *From your binder to a finished deck* / Free line *All four are free, always. No credits, no limits.* |
| Loop 1 | *Bring your collection* / *Upload a CSV from the app you use now, paste a list, or scan cards with your phone's camera.* · *Reads counts, sets and foils* · *Sync a newer export any time* |
| Loop 2 | *See what you can build* / *Every commander you own, ranked by how much of its deck is already in your binder.* · *Why each one fits, in a sentence* · *Discover the ones you don't own yet* |
| Loop 3 | *Build from what you own* / *The 99 fills the deck from your cards first and marks what's missing.* · *Analysis, stats and brackets* · *Combos you're one card from* |
| Loop 4 | *Buy only what's missing* / *One shopping list across your decks, with cheaper stand-ins and friends' spares first.* · *Prices from Mana Pool* · *Borrow before you buy* |
| Bring | *Bring your collection* / *Start with the cards you already own*; *New to all this?* first; step 2 *Add the rest as you go. Scan cards with your phone's camera, or search for them by name.* |
| Moxfield note | ***Moxfield deck links don't import yet.*** *Moxfield doesn't let deck-building apps read them today. They're working on a way, and The 99 will connect as soon as it's ready. Until then, export or paste the list.* |
| Guide foot | *The file needs a Name and a Quantity column.* + *ManaBox's file also carries foils and the exact printing.* / *{App}'s export has both columns.* |
| Try it | *See it work before you join*; start card *Try it on Sam's cards* / *Sam is a made-up player with a real-looking binder. Press through eight of the tools and see what each one gave Sam. Nothing you press is saved, and nothing costs a credit.* / *Start* |
| Demo steps | 1 *Sam's collection* · 2 *The commanders Sam can build* · 3 *Help me choose* (1 credit) · 4 *A deck from what Sam owns* · 5 *Analysis and Overview* (Overview: 1 credit) · 6 *Suggested changes* (1–2 credits) · 7 *Get it to 99* (Look deeper: 1 credit) · 8 *Buy only what's missing* (Which deck: 1 credit); lines as on `Demo-390`. Foot *Like it with your own cards? Tell me at launch*; end *That was Sam's binder. Yours works the same.* / *Start over* |
| Written | *Written for real* / *A written read for {n} commanders* / *Every commander page opens with why it's worth building. Every precon has an Overview. Both are free to read.* |
| Free and credits | *The core is free. Credits are for writing.* / *Browsing is always free. Anything we write just for you uses a credit.* (shipped) · *Free, always* / *No credits, no limits.* · *With credits* / *Each run of a writing tool on your deck. Press ⓘ for what each one does.* |
| Value block | **15** *welcome credits* / *when you join, for 30 days* · **+1** *free credit every day* / *for as long as you're a member* · *That's enough to run every writing tool three times before you spend a thing. Try them on your own decks, then decide. Keep going with a pack or the monthly plan.* · *What credits cost* |
| Paid rows | *Overview of a deck* 1 credit · *Suggested changes* 1–2 credits · *Look deeper in Proposed cuts* 1 credit · *Help me choose with "Anything else?"* 1 credit · *Which deck needs it most?* 1 credit |
| Tooltips | **Overview of a deck:** *A written read of your deck: its game plan from the first turns to the win, what to keep in an opening hand, and where it's weak.* **Suggested changes:** *Say what you want from the deck in your own words. It picks cards to add and cut, from your collection first, and says why for each.* **Look deeper in Proposed cuts:** *When a deck runs over 99, it names the exact cards to cut and why each one goes.* **Help me choose with "Anything else?":** *Describe the deck you're after in your own words, and it ranks the commanders that fit, owned or not.* **Which deck needs it most?:** *Got a new card? It reads it against every deck you have and tells you where it does the most.* Each with *What you get* and its preview. |
| Prices | *What credits cost* · prices read from `PLANS`/packs · *Credits are bought once you're in. Browsing stays free either way.* |
| Close | *Your cards already know what to build.* + the launch panel |
| Footer | *Commander data from EDHREC. Combos from Commander Spellbook. Card data and images from Scryfall; prices from Mana Pool.* Then the Fan Content notice, unchanged. |
| First run | *Coming from ManaBox, Moxfield, Archidekt or Deckbox? How to export ›* · ways lead *Pick the precons you own, then add the rest: scan them with your phone's camera, or search for them by name.* · row *Scan your cards* / *With your phone's camera* |
| No column | *This file has no Quantity column* (or *Name*) / *The 99 needs a Name and a Quantity column in the first row. Most apps' CSV exports have both. How to export, or paste the list instead.* |
| Partial | *Tokens, art cards and playtest cards aren't in the catalog, so they stay out. Everything else came in.* |
| Success | *Your collection is in* / *{n} cards · from {file}* · *{n} commanders you can build from your cards* · *See your commanders* |
| Scan line | *{n} of them are commanders you can build* |

## The appendix: two toast questions

1. **The got-it receipt stays an exception, unchanged.** It is a receipt, not a toast: it records a write and carries
   three jobs (Undo reverses it, History is where the record lives, Change fixes the printing). The toast rule gains one
   line: *the receipt kind (`kind="receipt"`) may carry History beside its Undo, with Change in its body; no other toast
   takes a second press.* No build.
2. **Yes: every toast with no action carries the ✕.** *Exactly one press per toast, its action or the bare ✕ (44px,
   `--fg-faint`), never both and never neither.* A toast with no press leaves a phone reader no way to clear something
   over the tab bar for 8s. Build: `token-refusal-toast.tsx` and `credits-toast.tsx` gain the ✕; check any no-action
   branch of `social-toast.tsx`. `deleted-group-toast.tsx` already follows it.

## Owed before the build

- A check of each export guide's three steps against the live app (drafted from memory).
- `/copy-review` on every DRAFT string above.
- The fixture holding the cast and marks above (READINESS), and PR 3's stored outputs regenerated to match.

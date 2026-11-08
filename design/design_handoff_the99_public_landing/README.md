# The 99 — Public landing page (design handoff, R4)

`design/design_handoff_the99_public_landing/` · 2026-11-08 · account 2 · **R4, approved by Hugh 2026-11-08**

Source of truth: `docs/superpowers/design-briefs/2026-11-07-public-landing.md` (PR #2661). Its Settled decisions are not
reopened here. Engineering's plan: `docs/superpowers/plans/2026-11-08-public-landing-demo.md`. Structural sibling:
`design_handoff_the99_public_pages/` (top bar, signed-out block, Fan Content footer).
Canvas: https://claude.ai/artifact/Eb1daYtVt3wLjAbSTLPvfN (13 boards; `canvas.json` is the index, `Main.dc.html` is board 1).
Rounds R1 to R4 live on `design-assets` under `account-2/design_handoff_the99_public_landing/` (R4 6902d4d).

**The one-line summary:** *the signed-out `/` becomes a showcase of a made-up player's binder: a headline with the launch
panel, real catalog numbers, the four-step loop, Bring your collection, Try it (a live dummy app), Written for real, free
versus credits led by the welcome credits, the close and the shipped Fan Content footer.*

To view a board, open its `.dc.html` with `support.js` beside it (images are in `art/`). `scratch-gen/` is the generator
(`lp.py` the landing, `app.py` the dummy app, `fr.py` the first run, `boards.py` the boards, over `kit.py`):
`BMOD=boards python3 build.py local`, then `node render.js $PWD/out <names>`. It is reference, never shipped code.

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

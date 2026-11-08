# Brief: The public landing page

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief. Hugh ruled its
decisions on 2026-11-08 (Settled, below).
**Source:** Hugh, 2026-11-06: "design and plan a public landing page". A signed-out visitor at `/` should see a showcase
that makes them want an account. It shows what is free and what credits add. A bare minimum is too minimal. Hugh, 2026-11-08: Try it is an interactive demo, and the collection
comes first (Settled, below).
**Existing handoffs to extend:** `design/design_handoff_the99_appshell/` (today's §Signed-Out Landing),
`design/design_handoff_the99_brand/` (the mark and lockup), `design/design_handoff_the99_public_pages/` (the public card and
commander pages and their signed-out block), `design/design_handoff_the99_fan_content_notice/` (the locked notice),
`design/design_handoff_the99_flyer_trial/` (the `/join` pitch and the launch list), `design/design_handoff_the99_welcome_credits/`
and `design/design_handoff_the99_buying_credits/` (how credits are explained), `design/design_handoff_the99_about_visual/`
(labelled real captures), `design/design_handoff_the99_themes/` (the six themes),
`design/design_handoff_the99_first_run_onboarding/`, `design/design_handoff_the99_no_collection_entry/` and
`design/design_handoff_the99_discovery_onboarding/` (the first run, "start another way", the tour),
`design/design_handoff_the99_collection/` and `design/design_handoff_the99_card_scan/` (upload and scanning).
Where a shipped component and a handoff disagree, the component wins.

## The job, which binds every screen here

1. **One page, one job:** a visitor who has never heard of The 99 leaves it wanting an account, and knows what that
   account costs (nothing) and what is optional (credits).
2. **Show the product working.** Real screens of the real app and real stored output. No illustrations standing in for
   the product, no stock art, no generic feature icons.
3. **No live model call on this page, ever.** AI tools are shown through output already written and stored: the demo's
   scripted results, commander prose, precon Overviews. A signed-out visitor never spends a credit or a model token.
4. **Real numbers only**, read from the catalog at build or cache time, never typed into copy. No user counts.
5. **One main call to action**, repeated at the end. Anything else on the page is a way to look around.
6. **Phone and desktop are one page drawn twice**: same sections, same order, same content.
7. **The Fan Content notice stays**, as the signed-out shell already draws it.
8. **The collection comes first.** Nothing in The 99 works without the player's cards, so the page shows how they come
   in as deliberately as it shows the tools.

## What exists today

**`/` signed out** (`src/app/page.tsx:78-136`): the `Crowned99` mark, "THE NINETY-NINE", the tagline "99 problems, but
your commander ain't one.", one Clerk "Sign in" button, and "Invite-only · access by request" (desktop adds "· a Commander
companion"). The copy is hardcoded in the page, not in `src/lib/copy/`. The background is the accent radial gradient from
the appshell handoff. The signed-out shell adds the Fan Content notice (`src/components/shell/shell.tsx:64-72`).

**Sign-up is invite-only** (launch epic L2 and L12, `docs/superpowers/plans/2026-10-17-launch-epic.md:46,56`). `/sign-up`
says "The 99 is invite-only" (`src/lib/copy/join.ts:51-58`). The flyer trial's `/join` already has a launch list:
"The 99 opens to everyone soon. Leave your email…" / "Tell me at launch" (`flyerJoinCopy`, `launch_list` table).

**Public pages exist but are off in production.** `/card/<slug>` and `/commander/<slug>` are public routes
(`src/proxy.ts:37-40`) that 404 while `PUBLIC_PAGES_ENABLED` is off. Production `flag_overrides` holds an app-wide row
`off` (read 2026-11-06); staging has it on. The commander page leads with the stored prose ("Why this commander"), then its
EDHREC rank, themes, brackets, most played with, similar commanders, and the signed-out block "This is The 99"
(`src/lib/copy/public-pages.ts:16-25`). There is no public commander list or search; search hands off to Scryfall.

**Stored AI output a visitor can see without a call:**
- Commander prose: `commander_support.prose`, one sentence per commander, read by `readCommanderProse`. It is already on
  the public-read allowlist and on the public commander page.
- Precon Overviews: `precon_synopses` (current rows), one per plain precon. **Not** on the public-read allowlist
  (`scripts/lib/public-reads.mjs:28`): showing one signed out needs that guard widened, with a test.

**Real numbers, staging catalog, read-only, 2026-11-06** (production is copied from staging, `docs/agents/catalog-copy.md`):

| Figure | Count | Query |
|---|---|---|
| Commanders indexed | 3,469 | `count(*) from commander_support` |
| Commanders with written prose | 3,379 | `count(*) … where prose <> ''` |
| Precons | 206 (186 plain, 20 twins) | `count(*) from precons` |
| Precons with an Overview | 182 | `count(distinct precon_file) from precon_synopses where current` |
| Combos tracked | 114,223 | `count(*) from spellbook_variants` |
| Cards / printings | 35,986 / 104,685 | `count(*) from cards` / `printings` |

Sample stored prose (rank 2, Edgar Markov): "Edgar Markov decks flood the board fast, usually winning through a vampire
swarm that drains life while growing stronger with every new attacker." Showcase picks should vary the openings: three
of the top five open with "flood the board".

**What is free and what credits add** (sources: `src/lib/payments/welcome.ts:9-10`, `packs.ts`,
`src/lib/model/allowance-rule.ts:30`, `src/lib/copy/discovery.ts` `writtenForYouCopy`, `src/lib/tuning/v2/charge.ts`):

| Free, always | With credits |
|---|---|
| Your collection | Overview of a deck: 1 credit |
| Commanders, Discover, Help me choose | Suggested changes: 1 credit up to 10 swaps, 2 above |
| Deck building | Look deeper in Proposed cuts: 1 credit |
| Shopping list | Help me choose with "Anything else?": 1 credit |
| Friends and pods | Which deck needs it most?: 1 credit |
| Combos, game log | |
| One free credit a day | |

Credits: 15 welcome credits on joining (they expire after 30 days); a pack is $5 for 40 credits that never expire; the plan
is $5 a month for 50 credits that roll over. The shipped rule line is "Browsing is always free. Anything we write just
for you uses a credit." (`src/lib/copy/credits-page.ts:56`). Ruling L6: never "unlock"; lead with the pack.

**Themes.** Six (`src/lib/theme/themes.ts:18-24`): Low Sun (amonkhet, the default), Neon Rain, Canopy, Oil Haze, Witching
Hour, First Frost. A signed-out visitor gets the default unless the `the99_theme` cookie says otherwise; the picker is only
in the signed-in shell.

**Captures.** `public/about/shots/<theme>/` holds 41 captures per theme from `pnpm capture:about`. They are **not fit for
a public page as they stand**: see "The fictional fixture and captures" below.

## Prior art (fetched signed out, 2026-11-06)

- **DeckCheck** (closest peer: free deckbuilder, paid credit tools). Hero "Deck building that feels like magic." ending
  "Free to use.", three calls to action ("Create account", "Browse Commander precons", "Commander Brackets guide"), a real
  stats strip, then "See for yourself." with a real recent deck and its write-up, then standard features, then "the stuff
  that saves you hours" (the paid tools, each shown by a static mock of its real output). Every feature is tagged free or
  paid where it is described ("Open to every account, no subscription needed"). Tiers and "What's a credit?" live on a
  separate page.
- **EDHREC.** An article feed, a stats block ("3,759 All Time Commanders"), no sign-up push. Footer carries the Fan
  Content Policy line.
- **Archidekt.** No hero: a live community feed (recent decks, trending commanders). Footer names its data sources.
- **Linear.** Hero is a full rendering of the real app with realistic sample data; pricing stays on its own page.
- **Raycast.** "Download and use Raycast for free" as the close; a pricing FAQ answers "What is free?" and "What are AI
  credits?" in plain words.
- **ManaBox.** A grid of thirteen one-line features: shows nothing working.

**Adopt:** a real worked result above the fold (DeckCheck, Linear); a stats strip of real catalog counts (DeckCheck,
EDHREC); free/credits tagged where each feature is shown, plus one plain "what's a credit" block (DeckCheck, Raycast);
"the core is free" said early (DeckCheck, Raycast); each AI tool shown by its real stored output, not an icon (DeckCheck);
the footer credits our data sources (Archidekt).
**Avoid:** a community feed as the landing (we have no such volume, and it explains nothing to a newcomer); a feature
grid with no product in it (ManaBox); a multi-tier pricing grid on the landing (Linear keeps it on /pricing); leading with
AI (our hook is "what can I build from what I own").

## The page, top to bottom (contents, not layout)

1. **Hero.** Name, one line on what it does with your collection, the main button (**Tell me at launch**), **Sign in** as
   the quiet secondary, and a real screen of the app. Design calls whether the hero offers a theme switch (all six
   themes will have captures; a switch would set the same `the99_theme` cookie the app reads).
2. **Real numbers strip.** From the table above, read live from the catalog.
3. **The core loop, four steps,** each with its real screen:
   1. Upload your collection.
   2. See the commanders you can build.
   3. Build a deck from what you own.
   4. Buy only what is missing.
4. **Bring your collection.** Step 1 is the whole app's dependency, so it gets its own section, not a line: see
   "Bringing your collection in" below.
5. **Try it.** The interactive demo: see "The demo" below. It is the page's centerpiece, not a footnote.
6. **Free versus credits.** The table above in player words, with "One free credit a day" on the free side and credit
   counts on the credits side ("15 welcome credits", "1 credit per run"). Dollar figures are one link away, never on this
   page (Settled 4).
7. **Close.** The main button again.
8. **Footer.** The Fan Content notice as shipped; data credits (Scryfall, EDHREC, Commander Spellbook, price sources).

## Bringing your collection in

Everything in The 99 reads the cards you own. A visitor must leave the landing knowing their collection can come in, and
how, from whatever they use today. A player whose first collection app this is needs hand-holding, and the path must be as
short as it can be. This section covers **both** the landing (what a visitor is shown) and the signed-in first run (what a
new member does), because the second must keep the first's promise.

**The paths, per source** (all shipped and always on; `docs/agents/collection-features.md`):

| They use today | Path | What exists | Gap to draw |
|---|---|---|---|
| ManaBox | Export CSV, then upload | Named by the parser (`src/lib/manabox/parse.ts:3`); foils and Scryfall ids read | Where ManaBox's export lives, step by step |
| Moxfield, Archidekt, Deckbox | Export CSV, then upload, or paste a list | Named by the parser; Moxfield and Archidekt section headers read on paste | Each app's export steps |
| Another app (TCGplayer, Dragon Shield, Delver and others) | Export CSV, then upload | Not named: imports when the file has a Name and a Quantity column | Say plainly "any CSV with a Name and a Quantity column", and what to do when it fails |
| A list in their head or a notes file | Paste a list | `paste.ts` | none |
| Cards in a box, no app | Scan with the camera | Add cards sheet, Scan | The first-timer path below |
| Precons they bought | Precons I own | "No file? Start another way" group | none |
| A deck list somewhere | Import a deck, "I own these cards" ticked | `/decks/import` | The tick starts off; Design calls whether the first-run path starts it on |
| A few cards | Add cards by hand | Add cards sheet | none |
| An updated export later | Collection Sync merges it against the last upload | `/collection/replace` | none |

**Today's first run** (`src/app/page.tsx:202`, `src/components/home/first-run.tsx`): the nav is locked until cards
arrive. Step 1 reads "Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox. We read owned counts, sets and
finishes." with **Upload a CSV** and **Paste a list**, then "No file? Start another way": Precons I own, Import a deck, Add
cards by hand. The upload page lists "Moxfield · Archidekt · Deckbox · ManaBox · plain CSV" and asks only for a Name and
Quantity column. **There is no export guide for any app, and scanning is not offered on the first run.**

**The first-timer path** (no collection app at all). Design draws the shortest honest route from a box of cards to a
first commander match. Candidates: start with precons they own (one press, a whole deck), then scan the rest; or scan
first. A first timer needs only enough cards for the commander list to light up, not the whole box: Design says how the
screen tells them that.

**On the landing**, the section shows the sources a visitor recognizes (by name, with no logos unless Design rules
them in), says the one requirement (a Name and a Quantity column), and shows the scan and precon routes for someone with no app.
It promises nothing the first run does not deliver.

## The demo (Try it)

**What it is** (Settled 5): an interactive walk through a fictional collection and deck. The visitor presses through the
real tools and sees real results. Every AI result is **scripted**: written once by the real tool on the fictional deck,
stored, and replayed. Nothing computes for a visitor and nothing costs anything.

**Quick, so visitors do not drift.** Target: the whole walk in about a minute of pressing. One screen per step, one
press to move on, a visible "step N of M", skippable, and the main button at every step's foot and at the end.

**The drawn sequence** (Design may reorder or merge; every tool appears once):

| # | Step | Tool shown | Credit or free |
|---|---|---|---|
| 1 | Here is a collection | The fictional binder: count, sets, a few cards | Free |
| 2 | Commanders you can build | The ranked list from that binder | Free |
| 3 | Help me choose, with "Anything else?" | A typed wish and the commanders it ranks | 1 credit |
| 4 | A deck built from what you own | The deck page, its owned and missing cards | Free |
| 5 | Analysis | The verdict and stats | Free |
| 6 | Overview | The written read of the deck | 1 credit |
| 7 | Suggested changes | The swaps and "Why these cards" | 1 credit (2 above 10 swaps) |
| 8 | Proposed cuts, Look deeper | The named cuts | 1 credit |
| 9 | Top off and Mana balance | Filling the deck to 99, fixing the lands | Free |
| 10 | Which deck needs it most? | One card read against the fictional decks | 1 credit |
| 11 | Buy only what is missing | The shopping list | Free |

Each step carries its free or credit tag where the tool is shown (prior art: DeckCheck).

**Rules for the demo:**
- Every result is the real tool's real output on the fictional data, or a capture of it, never hand-written.
- No input the visitor types reaches anything: a typed field in the demo is pre-filled and read-only, or offers fixed
  choices.
- It never asks for an account to continue, and never gates a step.
- It works at 390 and desktop as one sequence drawn twice.

## The fictional fixture and captures

**Approved (Hugh, 2026-11-08): one fictional fixture,** a whole collection and decks with no real account underneath. It
feeds the demo, the landing's captures, and a re-shoot of every About capture. Lane si10 builds the fixture and the
re-shoot.

Why: a read-only audit of `public/about/shots/` (41 shots × 6 themes; no EXIF or XMP, no emails or `user_` ids in any
file) found today's fixture sits on a `pull:staging` snapshot of the owner's real account:
- **proxies** and **home-feed** show two of the owner's real deck names.
- **deck-versions** shows the owner's own version note, in the owner's words.
- **collection, sets, upload, home, card-details, history, tool-collection-sync** show the owner's real collection
  (4,492 cards, 219 sets) and upload history. Nobody is named in them.
- **decks, tour-decks, tool-lineup** show the owner's real deck and cart totals. No names.
- Every person shown (Sam, Alex, Riley, the pod, "3 invites left") is fixture data; no real person's name or email appears.

The fixture should look lived-in: a binder big enough for a long commander list, decks named after their commanders,
and the fictional names already in use.

## Every state to draw

For both widths (390 and desktop):
1. The whole page, signed out, default theme.
2. The hero in a second theme, if Design keeps a theme switch.
3. The call to action in both sign-up states: invite-only today ("Tell me at launch") and open sign-up ("Sign up free").
4. The launch-list press: entry, sent, and already on the list (the `/join` flow's states, reused).
5. Bring your collection: the section, and each per-app export guide Design keeps.
6. The first run, signed in, with the per-source paths and the first-timer path: empty, a file that fails, a file with
   no Name or Quantity column, a partial match, and success.
7. The demo: every step, its start, its end, and a skip from the middle.
8. The AI-output section with public pages on (featured commanders link to `/commander/<slug>`).
9. A signed-in reader at `/`: unchanged, Home as today (state the rule; nothing to draw).
10. The page with the numbers unavailable: the strip drops, never shows zeros.

## Open calls for Design

1. **The hero's screen.** One capture, a short loop of captures, or a framed composite of real captures.
2. **Theme switch in the hero.** Whether to offer it, and where.
3. **The demo's frame.** Inline on the page, a full-screen walk, or a sheet; how "step N of M" and skip read.
4. **Demo order.** The sequence above is a draft; Design merges steps to keep it quick.
5. **Export guides.** Inline steps, an expandable per app, or a short page per app; screenshots of other apps or words
   only.
6. **The first-timer path.** Precons first or scan first; how the screen says "enough to start" before the whole box.
7. **The free-versus-credits block's form**: a two-column table, tags on each step, or both.
8. **Which stored output to feature** outside the demo (commander prose, one precon Overview) and how many commanders.

Draft strings in this brief passed `/copy-review` (propose): "One free credit a day" follows `credits.ts` ("free credit",
never "free run"), "1 credit per run" and "Name and Quantity column" match shipped copy, and the launch-list
action reuses the shipped "Tell me at launch". Design's wording goes to
`/copy-review` again.

## Settled (Hugh, 2026-11-08)

1. **Sign-up stays invite-only now.** Design draws the open-sign-up state in the same round, so the flip is a copy and
   route change.
2. **Public card and commander pages turn on in production when the landing ships** (`PUBLIC_PAGES_ENABLED`).
3. **The main button is "Tell me at launch", later "Sign up free".** Sign in is the secondary.
4. **Credit counts on the page; prices one link away.**
5. **Try it is an interactive demo** on a fictional collection and deck, with scripted results for every AI tool.
   Comprehensive but quick.
6. **The collection comes first.** The landing and the first run show deliberately how to bring a collection in, per
   source, with a hand-held path for a first-timer.
7. **No About entry.**

## Appendix for Design: two toast questions

From Small items 10 (`design/design_handoff_the99_small_items_10/README.md:42-43`): a toast carries one text press
("*Try again* or *Undo*"), and "the bare ✕ … only on a toast with no action … Never both a press and ✕."
1. **The got-it receipt has two presses.** `src/components/decks/got-it-receipt.tsx` draws History (`:462-466`) and Undo
   (`:468`) in its actions, plus a Change press in its body (`:443-456`). It shares the toast frame
   (`edit-toast.tsx:12-13`). Is it an exception to the one-press rule, or does it change?
2. **Must every toast with no action carry the ✕?** README:43 reads as permission ("only on a toast with no action"),
   not a requirement. Design says which.

## Not in scope

- Building any UI before Design's handoff has a READINESS verdict.
- Opening sign-up, shared deck pages, a public commander list or public search (L12 keeps search on Scryfall).
- Any live model call or credit spend from a signed-out page.
- Changes to the signed-in Home beyond the first run.
- A pricing page of its own (the credits page exists for members).
- An About entry.

## Engineering

The plan is `docs/superpowers/plans/2026-11-08-public-landing-demo.md`: the demo's stored data, the public loaders and
allowlist, the anonymous rate bucket, the public-pages flip, and the onboarding backend, with its PR boundaries.

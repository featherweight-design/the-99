# Brief: The public landing page

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief, once Hugh has ruled the open
decisions below.
**Source:** Hugh, 2026-11-06: "design and plan a public landing page". A signed-out visitor at `/` should see a showcase
that makes them want an account. It shows what is free and what credits add. A bare minimum is too minimal.
**Existing handoffs to extend:** `design/design_handoff_the99_appshell/` (today's §Signed-Out Landing),
`design/design_handoff_the99_brand/` (the mark and lockup), `design/design_handoff_the99_public_pages/` (the public card and
commander pages and their signed-out block), `design/design_handoff_the99_fan_content_notice/` (the locked notice),
`design/design_handoff_the99_flyer_trial/` (the `/join` pitch and the launch list), `design/design_handoff_the99_welcome_credits/`
and `design/design_handoff_the99_buying_credits/` (how credits are explained), `design/design_handoff_the99_about_visual/`
(labelled real captures), `design/design_handoff_the99_themes/` (the six themes).
Where a shipped component and a handoff disagree, the component wins.

## The job, which binds every screen here

1. **One page, one job:** a visitor who has never heard of The 99 leaves it wanting an account, and knows what that
   account costs (nothing) and what is optional (credits).
2. **Show the product working.** Real screens of the real app and real stored output. No illustrations standing in for
   the product, no stock art, no generic feature icons.
3. **No live model call on this page, ever.** AI tools are shown through output already written and stored (commander
   prose, precon Overviews) and through captures. A signed-out visitor never spends a credit or a model token.
4. **Real numbers only**, read from the catalog at build or cache time, never typed into copy. No user counts.
5. **One main call to action**, repeated at the end. Anything else on the page is a way to look around.
6. **Phone and desktop are one page drawn twice**: same sections, same order, same content.
7. **The Fan Content notice stays**, as the signed-out shell already draws it.

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
a public page as they stand**: see "Captures on a public page" below.

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

1. **Hero.** Name, one line on what it does with your collection, the main call to action, and a real screen of the app.
   Design calls whether the hero offers a theme switch (all six themes have captures; a switch would set the same
   `the99_theme` cookie the app reads).
2. **Real numbers strip.** From the table above, read live from the catalog.
3. **The core loop, four steps,** each with its real screen:
   1. Upload your collection (CSV, sync or scan).
   2. See the commanders you can build.
   3. Build a deck from what you own.
   4. Buy only what is missing (the shopping list).
4. **Free versus credits.** The table above in player words, with "One free credit a day" on the free side and
   the welcome credits, pack and plan on the credits side (how much of the price shows is an open decision).
5. **The AI tools, shown by their output.** Stored commander prose (a few commanders, each linking to its public page
   when public pages are on); one stored precon Overview; captures of Suggested changes and an Overview on a deck. Each
   tagged "1 credit" or "free credit".
6. **Close.** The main call to action again.
7. **Footer.** The Fan Content notice as shipped; data credits (Scryfall, EDHREC, Commander Spellbook, price sources).

## Captures on a public page

A read-only audit of `public/about/shots/` (41 shots × 6 themes, all viewed in one theme and spot-checked in a second;
no EXIF or XMP, no emails or `user_` ids in any file) found the fixture account sits on top of a `pull:staging` snapshot
of the owner's real account:
- **proxies** and **home-feed** show two of the owner's real deck names.
- **deck-versions** shows the owner's own version note, in the owner's words.
- **collection, sets, upload, home, card-details, history, tool-collection-sync** show the owner's real collection
  (4,492 cards, 219 sets) and upload history. Nobody is named in them.
- **decks, tour-decks, tool-lineup** show the owner's real deck and cart totals. No names.
- Every person shown (Sam, Alex, Riley, the pod, "3 invites left") is fixture data; no real person's name or email appears.

These are acceptable inside the signed-in About but not on a page anyone can open. **The landing needs its own captures
from a fully fictional account** (no snapshot underneath): a fixture collection sized to look lived-in, its decks named
after their commanders, and the fictional names already in the fixture.

## Every state to draw

For both widths (390 and desktop):
1. The whole page, signed out, default theme.
2. The hero in a second theme, if Design keeps a theme switch.
3. The free-versus-credits block in each pricing option Hugh rules for (see Open decisions).
4. The call to action for each sign-up state: invite-only today, open sign-up later (both if Hugh keeps invite-only).
5. The AI-output section with public pages off (no links out) and on (links to `/commander/<slug>`).
6. A signed-in reader at `/`: unchanged, Home as today (state the rule; nothing to draw).
7. The page with JavaScript off or the numbers unavailable (counts missing: the strip drops, never shows zeros).

## Open calls for Design

1. **The hero's screen.** One capture, a short loop of captures, or a framed live-looking composite of real captures.
2. **Theme switch in the hero.** Whether to offer it, and where.
3. **How each step of the loop shows its screen** at 390 without a wall of phone frames.
4. **The free-versus-credits block's form**: a two-column table, tags on each step, or both.
5. **Which stored output to feature** and how many commanders.

Draft strings in this brief passed `/copy-review` (propose, 2026-11-06): "One free credit a day" follows `credits.ts`
("free credit", never "free run"), and the launch-list action reuses the shipped "Tell me at launch". Design's wording goes
to `/copy-review` again.

## OPEN DECISIONS for Hugh

One line each: options, then the recommendation.

1. **Sign-up.** (a) Keep invite-only; the landing's action is the launch list ("Tell me at launch") plus Sign in. (b) Open sign-up now;
   the action is "Sign up free". (c) Open sign-up and the landing launch on the same day.
   **Recommend (a) now, with (b)'s state drawn in the same round,** so the flip at launch is a copy and route change, not
   a design round. L12 already ties opening sign-up to shared deck pages.
2. **Public pages in production** (`PUBLIC_PAGES_ENABLED`, app row `off`). (a) Turn it on with the landing, so its
   featured commanders link to their public pages. (b) Leave it off; the landing shows prose with no links.
   **Recommend (a).** The pages shipped (F3) and run on staging, and they are the only part of the app a visitor can look
   around.
3. **The call to action's wording.** (a) "Tell me at launch" (shipped on `/join`) while invite-only, then "Sign up free".
   (b) Keep "Sign in" as the only action. **Recommend (a)**, with "Sign in" as a quiet secondary for members.
   Copy-reviewed 2026-11-06 (propose): "Get started free" was cut as SaaS onboarding phrasing; Design's final wording goes
   through `/copy-review` again.
4. **Prices on the page.** (a) The full free-versus-credits table with dollar figures. (b) The table with credit counts
   ("1 credit a run", "15 welcome credits") and a link to the credits page for dollar figures. (c) Free features only; no
   credits on the landing. **Recommend (b):** credit counts on the page, prices one link away. Hugh decides.
5. **Try before signing up.** (a) None. (b) A scripted sample: a fictional binder walked through the four steps, all
   pre-captured, with no compute. (c) Paste a short card list and see matching commanders, computed in the browser
   against a public commander list. (d) Open any commander's public page from the landing.
   **Recommend (b) plus (d).** (c) needs a new public read path and abuse limits; it can follow once sign-up opens.
6. **About entry.** None; the landing is not a feature inside the app (Hugh decides at launch).

## Not in scope

- Building the page, or any code before the handoff has a READINESS verdict.
- Opening sign-up, shared deck pages, a public commander list or public search (L12 keeps search on Scryfall).
- Any model call or credit spend from the landing.
- Changes to the signed-in Home.
- A pricing page of its own (the credits page exists for members).

## What eng builds before the handoff lands, and the plan after

Before the handoff (backend only; no UI):
1. **A public stats loader**: the six catalog counts, catalog tables only, cached on `catalog_refreshes`, registered with
   `check:public-reads`.
2. **A fictional capture account**: a `fixtures:landing` stage that builds a whole fictional collection and decks (no
   `pull:staging` snapshot underneath), on a scratch branch from local-dev, deleted after.
3. **Widening the public-read allowlist** to one precon Overview, if Hugh keeps the Overview in the showcase, with the
   guard test.

After the handoff (one PR each, under the 20-file / 800-line split rule):
1. The landing page at `/` signed out, phone and desktop together, behind a new switch Hugh approves (off in
   production; the current splash stays until it flips).
2. The landing captures (`capture:landing`, six themes) from the fictional account.
3. The call to action's two states (invite-only and open sign-up), keyed on the sign-up decision.
4. Close-out: the `feature-acceptance` walk at 390 and desktop, signed out, both switch states.

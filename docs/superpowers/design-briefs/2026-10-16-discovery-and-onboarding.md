# Brief: Discovery and onboarding (the About redesign)

2026-10-16. Settled by Hugh and the orchestrator (d9) in conversation on 2026-10-16. This brief is the record of that
conversation: every item under "Locked" is theirs, quoted or restated, and is not reopened by Design.

**What this brief asks.** How a player learns what the app can do, at the moment it matters to them, without being
overwhelmed. Five layers, in build priority: moments, a showcase page, tools where the need is, About as a reference,
and a short first-run tour. It proposes three Design rounds.

## The problem

Hugh, on `/about` as it stands:

> It only serves someone if they know what to look for… a huge wall of text with some images sprinkled throughout…
> snippets [that] lack grounding context in the app.

- `/about` holds 71 entries (`src/lib/copy/about.ts`). Each is accurate, and each is reached only by a reader who goes
  looking for it.
- A specimen is drawn out of context: a card row or a sheet on a plain ground, with no sign of the screen it lives on.
- Valuable tools are buried. **Find a deck** (`fits-your-decks`, behind `SWAP_TOOLS_ENABLED`) is the clearest case: it
  answers "what do I do with this card I own?", and a player finds it only by opening card details on an owned card and
  reading far enough down.
- **Friends** sits in the account menu and nowhere else.

What a player needs is to learn what the app offers in pieces they can take in, each at the point where it would help.

## What exists today, and stays

- **About's entries and their switch-following.** Every entry's title, route, caption, specimen and key lines in
  `src/lib/copy/about.ts`; an entry behind a switch is drawn only when the reader's switch is on (`AboutSwitch`,
  `captionLineSwitches`, `keySwitches`). The content is reused by every layer below. It is not rewritten here.
- **The Home banner as the announcement channel** (plan `2026-10-15-about-on-the-banner.md`; PR A shipped as #1780,
  PR B due 2026-10-22). An `ABOUT_VERSION` bump puts one line on Home's banner, naming what is new. This brief adds no
  second channel for "what is new".
- **First run** (`design/design_handoff_the99_first_run_onboarding/`): Home with no collection, Home with a collection
  and no decks, the empty Collection's ways in (`NO_COLLECTION_ENTRY_ENABLED`). The tour (layer 5) sits on top of these
  screens; it does not replace them.
- **How it works** (`design/design_handoff_the99_about_how_it_works/`): About's closing appendix of reference rows.
  It stays as part of the reference (layer 4).
- **Six themes** in `src/app/globals.css`: `amonkhet` (the default), `eldraine`, `ixalan`, `kaldheim`, `kamigawa`,
  `phyrexia`, and the `themes` entry's picker.

## The five layers, in build priority

### 1. Moments

A **just-in-time introduction** when the context changes. A moment is triggered by the player's OWN data the first time
the condition holds, names one tool in one line, and points at the control that does it.

- **First time only**, per account.
- **At most one moment per visit.**
- **A dismissed moment is gone for good.** The tool stays in the showcase (layer 2) and in the reference (layer 4).
- **A moment follows its tool's switch.** With the switch off for that reader, the moment does not exist.
- **Quiet.** See "Style" below: no stacked inline cards, nothing that pushes the screen's own content.

The moments Hugh approved:

| Moment | Fires when | Where | Tool's switch | About entry |
|---|---|---|---|---|
| Top off | a deck under 100 cards that has cards to fill | the deck page | (none) | `auto-fill` |
| Find a deck | card details of an OWNED card that is in no deck | card details | `SWAP_TOOLS_ENABLED` | `fits-your-decks` |
| Wishlist | card details of a card the player does NOT own | card details | `SOCIAL_WISHLIST_ENABLED` | `wishlist` |
| Help me choose | the first visit to Commanders with no decks | `/commanders` | `HELP_ME_CHOOSE_ENABLED` | `help-me-choose` |
| Suggested changes | a deck reaches 100, on its first open at 100 | the deck page | `TUNING_ENABLED` | `suggested-changes` |
| Proposed cuts | a deck over 100 | the deck page | `PROPOSED_CUTS_ENABLED` | `proposed-cuts` |
| Mana Balance | as Suggested changes, on a LATER visit | the deck page | `MANA_BALANCE_ENABLED` | `mana-balance` |
| Cheaper stand-ins | the first Shopping row over the deck's limit | the deck's Shopping view | `SWAP_TOOLS_ENABLED` | `stand-ins` |
| Friends' spares | the first spare marker the player sees | the row's other-ways press | `SOCIAL_FRIENDS_ENABLED` | `friend-spares` |
| Card assignments | the first contested copy | where the contest shows | (none) | none yet (`availability` is the nearest) |
| Collection Sync | the second upload's choice screen | the upload choice | `COLLECTION_SYNC_ENABLED` | `upload-choice` |
| Lineup | `/decks` with 3 or more decks | `/decks` | `LINEUP_ENABLED` | `decks-stats` |
| Matchups | a deck's 3rd logged game | the deck's Games | `SOCIAL_GAMES_ENABLED` | `opponents` |
| Friends | the first game logged: "Playing with friends? Add them" | after the game is logged | `SOCIAL_FRIENDS_ENABLED` | `friends` |
| Friends, on Home | once a deck exists | a Home card | `SOCIAL_FRIENDS_ENABLED` | `friends` |
| Precons | the first "New deck" press: "Start from a precon you own" | `/decks/new` | `PRECONS_ENABLED` | `precons` |

Notes on the table:
- **Mana Balance and Suggested changes** share a trigger. Suggested changes takes the first visit at 100, and Mana
  Balance a later one, so they never compete for the same visit.
- **The Friends Home card** is the one moment drawn as a card, because Home is a page of cards and Friends has no other
  door from it. It obeys the other rules: once, dismissible for good, behind the switch.
- **Card assignments has no About entry** today; `availability` is the nearest. Whether it gets one is Hugh's call,
  and the moment does not wait on it.
- **A moment for a tool that spends credits** (Suggested changes, Proposed cuts, Help me choose, Find a deck's read)
  introduces the control and never presses it. Starting a run stays the player's own press.

### 2. The Smart tools showcase

One page, **mostly visual**. Each tool is shown as a REAL screenshot of the app, with the control highlighted, one line
on what it is for, and **"Try it on your deck"**, which takes the player to that control on one of their own decks.

- The tools are the moments' tools, plus any Design judges belongs (open question 3).
- A tool behind a switch the reader does not have is absent, exactly as on About.
- A dismissed moment's tool is still here. The showcase is how a player finds a tool again.

### 3. Tools where the need is

Entry points to a tool in the places a player already stands when they need it: an empty state that names the tool
that fills it, and a nudge beside the figure it answers (a deck short of its ramp target, say). These are permanent and
belong to the screen, unlike a moment, which is shown once.

### 4. About becomes a reference

- Reached from a **"?" on each screen**, which opens that screen's entries.
- **An entry's `route` does not say which screen it belongs to**, so this needs a mapping of its own. 33 of the 71
  entries route to `/decks` and carry an `opens` qualifier ("opens a deck's Analysis tab", "opens a deck's Shopping
  filter"), and none routes to a deck's own page; `fits-your-decks` routes to `/collection` but is reached through card
  details. Engineering adds a screen field to each entry (a deck page, card details, Shopping and so on) from those
  qualifiers; Design names the screens that carry a "?" (open question 5).
- **Searchable.**
- **The full list is kept**, for a reader who wants all of it.
- The reference is where the long form lives; the moments and the showcase each say one line and point here.

### 5. A short first-run tour

The app's SHAPE, not its features. Four stops and a theme step:
- **Collection:** what you own is the start of everything.
- **Commanders:** what you could build from it.
- **Decks:** where a deck is built, tuned and played.
- **Buying:** what a deck is missing, and what it costs.
- **"Pick your look":** the six themes, with live previews; the pick is saved as the `themes` entry's picker saves it.
- **Precons** as a way in, for a player with no collection file.
- **The last step points at the Home banner**, as the place new features are announced.

It is **skippable** and **shown once**. Spotlights (a dimmed overlay on the real control) belong to the tour alone.

## Style (Hugh's rules)

- **A mix, by layer.** Spotlights in the first-run tour only. **In-app moments are QUIET.**
- **No stacked inline cards.** Some screens are close to overloaded already (the deck page above all), and a moment
  must add nothing to their layout.
- **The quiet form is Design's call.** The likely shape is a small transient bubble anchored to the control it names,
  dismissed by a tap.
- **Never noisy. One thing at a time.** One moment per visit, one tool per moment, one line per tool.

## Locked (do not reopen)

1. The five layers, in this build priority: moments, showcase, tools where the need is, reference, tour.
2. The moments table above: the 16 moments, their triggers and their tools, as Hugh approved them.
3. A moment fires from the player's own data, the first time only, at most one per visit; a dismissed moment is gone
   for good, and its tool stays in the showcase.
4. A moment follows its tool's switch.
5. Moment state is per account. Where it is stored is engineering's call.
6. Spotlights in the tour only; moments are quiet and never stacked inline cards.
7. The showcase uses REAL app screenshots, with the control highlighted, one line and "Try it on your deck".
8. About's entries and their switch-following stay; the Home banner stays the announcement channel.
9. The tour is skippable, shown once, and ends by pointing at the Home banner.
10. Friends gets two moments: one after the first logged game, and a Home card once a deck exists.

## Open for Design to call

1. **The quiet form of a moment**: shape, anchor, how it arrives and leaves, and what a tap on it does (dismiss only,
   or open the tool, with a separate dismiss). It must not move the screen's content.
2. **Which moment wins** when two would fire on the same visit (a deck at 100 with a Shopping row over its limit). A
   fixed order, the newest condition, or the cheaper tool first.
3. **The showcase's set and order** of tools, how a screenshot is framed and highlighted, and its phone layout.
4. **"Try it on your deck"** for a player with no deck, or no deck that fits the tool (Proposed cuts with no deck over
   100): hidden, disabled with a reason, or a different door.
5. **The "?"**: where it sits on each screen at both widths, and how a screen's entries read: a sheet, a panel, or
   `/about` filtered.
6. **About's new shape**: how search and the full list sit beside the per-screen view, and what happens to the
   specimens.
7. **The tour**: spotlight treatment, how many steps fit, the theme step's live previews, and how skip reads.
8. **The Friends Home card**: where it sits among Home's cards, and its copy shape (the wording goes to /copy-review).

## Every state to draw

- **Moments:** each of the 16 at the width it fires at, 390 and desktop; one dismissed (gone); one with its switch off
  (absent); two qualifying on one visit (open question 2).
- **Showcase:** the page with every tool; with a tool behind an off switch (absent); "Try it" with no fitting deck;
  phone.
- **Tools where the need is:** each empty state and nudge Design adds, with and without the tool's switch.
- **Reference:** the "?" on a screen and that screen's entries; search with results and with none; the full list;
  390 and desktop.
- **Tour:** each step, the theme step in at least two themes, skipped, finished; 390 and desktop.

## About entries

This line changes how About is reached; it does not add a feature of its own. The showcase and the tour reuse the
existing entries' content, and no entry is owed for them. **No `ABOUT_VERSION` bump** comes with the moments, because a
moment is the introduction itself. If Design proposes an entry for the showcase or the tour, Hugh decides.

## Proposed split into Design rounds

1. **R1: moments.** The quiet form, every moment's placement at both widths, the collision rule, the Friends Home card.
2. **R2: showcase and the "?" reference.** The showcase page, "Try it on your deck", About's new shape, the per-screen
   "?" and search.
3. **R3: the tour and the tools where the need is.** The tour's steps, the spotlight, the theme step; each empty state
   and nudge.

## Out of scope

- **Streamlining the deck page.** It is saved separately, for later. This line adds nothing to that page's layout.
- Rewriting About's entry content.
- A second announcement channel beside the Home banner.

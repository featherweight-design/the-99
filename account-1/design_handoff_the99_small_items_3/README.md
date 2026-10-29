# The 99 · Small items 3 (account 1, 2026-10-29)

A light addendum of seven items, each drawn over the shipped surface it changes. Brief: Hugh's "Small items 3" design prompt, 2026-10-29. Items 1 to 4 are the visual About pages (R4, #2367), and 5 to 7 are other surfaces. Lives on main as `design/design_handoff_the99_small_items_3/`, beside `design_handoff_the99_small_items_2/`.

**Status: for Hugh's audit.** Everything not listed here stays as shipped. Every string is shipped copy unless a note marks it as a new draft for /copy-review.

Open `Main.html` for all seven boards, or open one board's page; each needs only `art/` beside it. The boards are plain HTML drawn in Low Sun over shipped captures (`public/about/pages/amonkhet`). `build.py` and `si3.css` regenerate them. Sources read: main @0c756cc; `src/components/about/pages/{rule-card,rule-diagrams,pin-dock,labelled-screen}.tsx`, `about/tools/tool-card.tsx`, `src/lib/about/pins.ts`, `src/lib/copy/{about-pages,about-entries,lanes,deck-stats,help-me-choose}.ts`, `src/components/intake/intake-form.tsx`, `src/components/ui/filter-chassis.tsx`, and the handoffs about_visual (with addendum-r4), help_me_choose, filter_chassis and all_decks_cart_v2 addendum-r3.

| Board | Item |
|---|---|
| `Good-To-Know-Contrast.html` | 1 · Good to know diagrams too dim |
| `Try-It-Halo.html` | 2 · Try it halo runs outside its frame |
| `Prices-Buy-Chips.html` | 3 · Right-align the prices diagram's buy chips |
| `Copy.html` | 4 · Copy direction: the Discover order, Squirrels, section lines |
| `Help-Me-Choose-Locked.html` | 5 · Help me choose's form while it reads |
| `Dock-Low-Region.html` | 6 · The phone dock for a low region |
| `Filter-Controls.html` | 7 · Shared phone filter controls |

## 1 · Every Good to know diagram reads at full strength (bug)

**Cause:** three things stack in `rule-diagrams.tsx`.
- A row's edge is `--border`, which is 1.1 to 1.2:1 against the plate (`--bg`), so a row has no visible shape.
- A `dim` row fades to 75% opacity and a `gone` row to 55%.
- A muted-tone tag on a dim row falls to about 4.0:1, and on a gone row to about 2.8:1.

The card-assignment (`one-copy`) and pending/commit (`commit`) diagrams show it worst, but every diagram uses the same parts.

**Call, for every diagram:**
1. Diagram parts get no opacity. `dim` and `gone` stop fading the whole row.
2. A **dim** row keeps full-strength words and draws its edge dashed (`--border-dashed`). A **gone** row strikes its name through in `--fg-muted`, and its tag stays at full strength.
3. Every row's edge is `--border-dashed` drawn solid, about 1.5 to 1.9:1 against the plate across the six themes. The row's fill stays `--surface-raised`.
4. Muted-tone tags and muted captions move from `--fg-muted` to `--fg-body`. Upper-case captions stay `--fg-faint` (5.3:1 or better). Compact rows go from 11px to 11.5px.
5. In all six themes, every word in a diagram is 4.5:1 or better against what's behind it. Card layout, plate size and rule text don't change.

## 2 · The Try it highlight stays inside its frame (bug)

Top off's halo box is `[0.0373, 0.488, 0.9627, 0.2197]`, which runs to the crop's right edge. `tool-card.tsx` draws the halo straight from those percentages, so the 2px ring and 6px glow overrun the frame.

**Call:**
- A tool card's halo goes through the same clamp as a labelled screen's: `haloAt` with `HALO_REACH = 8` (R4 §2). The lit box is held 8px inside the picture frame on every side.
- It's measured against the picture as rendered, so the 8px holds at every card width.
- The clamp applies to every tool card. A box already inside the frame is unchanged.

## 3 · The prices diagram right-aligns its buy chips

The chip slot keeps its 96px width and right-aligns its chip (`justify-end`, was centred). The gap to the note stays 10px. The chips then share a right edge, the way Shopping rows line up their buy tags, and the notes start at one x.

## 4 · Copy direction (drafts for /copy-review)

- **Discover's order label** (`commanders/discover/order`). Shipped: "**The order** you pick changes what leads. Each order says what it ranks by." Draft: "**Order** is how the list is sorted, and you choose it. Best fit puts first the commanders whose popular cards you already own. Something new puts first the ones least like decks you've built. Popularity puts first the ones with the most decks. Name and Recently released sort as they say." It reuses the options' shipped names and glosses (`lanes.ts` `order`).
- **"Squirrels"** appears three times in shipped copy:
  - The `intent` rule's prose keeps it as the one example.
  - The bracket diagram's foot caption becomes "a theme deck · no Game Changers · you pick".
  - The legacy bracket entry in `about-entries.ts` says "A theme deck" in place of "A Squirrel deck".
- **Section sub-lines** become one or two sentences on what the screen offers. Each draws only on that section's own labels, rules and tools, so none makes a new claim.

| Section | Shipped | Draft |
|---|---|---|
| Home | Where every visit starts. | Where every visit starts: what's new, two commanders you could build today, and the decks you were working on. |
| What's new | News for you, newest first, after anything waiting on you. | Anything waiting on you comes first. Then news for you, newest first: a new set, a combo you can now make, and more. |
| Cards | Everything you own, card by card. | Everything you own, card by card. Add cards by name or by scanning them, and see which copies your decks are holding. |
| Upload a file | Bring in an export from another app. | Bring in an export from ManaBox, Moxfield, Archidekt or Deckbox, or paste a list. You see every change before it happens. |
| For you | Commanders you own, ranked by fit. | Commanders you own, ranked by how well the rest of your cards suit each one, with the play styles EDHREC tracks for them. |
| Discover | Commanders worth buying. | Commanders worth buying, from every one EDHREC tracks. Sort them by fit, by how different they are from your decks, or by popularity. |
| Your decks | Every deck, with what it needs next. | Every deck you're building, with its status and what it needs next. Start a new one from a commander, a list or a precon. |
| Your deck | The list, and what each row is telling you. | The list itself. Each row says whether you own the card and whether you've changed it, and your changes wait here until you commit. |
| Analysis | Where your deck sits, and the tools that tune it. | Which bracket your deck sits in and why, plus the tools that tune it: Suggested changes, Proposed cuts and Mana Balance. |
| Versions | Every commit, kept. | Every commit, kept, with its date, card count and average mana value. Open an old one to see what changed. |
| Games | What happened at the table. | What happened at the table. Log a game in seconds, then see how the deck does against each commander, color and friend. |
| Stats | The deck, drawn. | The deck in charts: its curve by card type, its mana colors against its sources, the jobs its cards do, its value, and how its games went. |
| Notes | The small stuff, kept with the deck. | Anything you want to remember about the deck. Notes stay through every commit, and no tool reads them. |
| A deck's Shopping | What one deck still needs. | What one deck still needs, priced at Mana Pool, with cheaper stand-ins and the friends who can spare a card. |
| Shopping for all decks | Every deck's missing cards in one cart. | Every deck's missing cards in one cart, so one Mana Pool order covers them all. |
| Friends | Your friends, and your pods. | The people you play with, and your pods. See their spares and wishlists, and choose who sees yours. |

On desktop, the sub-line wraps under the section name at 68ch at most.

## 5 · Help me choose: the form locks while it reads

**When:** from the press until the read lands, or until a refusal returns the form (`submitting`). The press keeps its shipped busy look: hairline, greyed, its 1 credit pill, and "Reading…".

**The locked fields:** Colors, Theme with its All/Any, Sets, Cards for the 99, Budget, Bracket and Anything else? are `inert` and drawn locked.
- Values and chips are `--fg-muted`.
- The selected pip, segment and bracket keep their shape but drop to a `--border-strong` ring with no fill. Unselected ones go to `--fg-locked` on a `--border` edge.
- The chips' ✕, the Add another… and Add a set… inputs, and the [[ ]] button are hidden.
- The request box keeps its text on `--surface-sunken` with a `--border` edge.

**What doesn't change:**
- Labels and captions stay as they are.
- There's no overlay and no new motion.
- The layout and size are the same, so nothing jumps when the form unlocks.

**Unlock:** a refusal (out of credits, or a failed read) returns the form unlocked with its values, and focus goes back to the press, as shipped.

**Accessibility:** the `form` gets `aria-busy="true"`.

There are no new strings.

## 6 · The phone dock for a low region (R4 board 3)

1. The dock's home stays the foot, above the tab bar.
2. **When the dock would cover the lit region**, it goes to the top of the visible band instead. That's when the region's bottom edge falls below the dock's top edge as placed at the foot. At the top, it sits 12px under the sticky back bar, or under the header when no back bar shows, with the same 12px side gutters, look and ✕.
3. The position is decided once, on the tap, from the region's on-screen box and the dock's measured height. Scrolling afterwards doesn't move it, and another tap decides again.
4. A region so tall that the dock would cover it in both places keeps the foot.
5. The page still never scrolls (R4). There's no new motion, and desktop has no dock.

## 7 · Shared phone filter controls: the shipped controls win

| Control | Shipped | R3 boards | Ruling |
|---|---|---|---|
| Search field height | 44px | 40px | Shipped, 44px |
| Filters button | 44px box, 10px radius | 36px pill | Shipped, 44px box, 10px radius |
| Sort button | 44×44px, 8px radius | 44×40px, 10px radius | Shipped, 44×44px, 8px radius |

**This holds on every compact page that uses these controls:** Decks, the cart, Collection, Commanders and the precon list.

**Why:**
- The filter chassis handoff sets a real 44px on the phone (its decisions 8 and 11).
- Cart R2 ruled that the cart uses the shipped chassis parts as they are.
- R3's boards were drawn by hand.

**What still stands from R3:** its calls, the "Search" placeholder and the 16px gap under the controls row, now on the shipped controls. At 320px the field keeps well over 100px, so "Search" still fits.

**Errata for `all_decks_cart_v2/addendum-r3/`:** the phone controls are drawn at 40px and as a 36px pill. Build from the shipped parts. Nothing changes in code.

## Copy for /copy-review

| Where | Draft |
|---|---|
| `about-pages.ts` Discover `order` label | Item 4 above |
| `about-pages.ts` `intent` diagram foot caption | `a theme deck · no Game Changers · you pick` |
| `about-entries.ts` the legacy bracket entry | "A theme deck" in place of "A Squirrel deck" |
| `about-pages.ts` every section's `sub` | The table in item 4 |

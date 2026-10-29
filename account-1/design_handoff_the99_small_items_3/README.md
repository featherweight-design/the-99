# The 99 · Small items 3 (account 1, 2026-10-29)

A light addendum of eight items (item 8 added later on 2026-10-29), each drawn over the shipped surface it changes. Brief: Hugh's "Small items 3" design prompt, 2026-10-29. Items 1 to 4 are the visual About pages (R4, #2367), and 5 to 8 are other surfaces. Lives on main as `design/design_handoff_the99_small_items_3/`, beside `design_handoff_the99_small_items_2/`.

**Status: for Hugh's audit.** Everything not listed here stays as shipped. Every string is shipped copy unless a note marks it as a new draft for /copy-review.

Open `Main.html` for all eight boards, or open one board's page; each needs only `art/` beside it. The boards are plain HTML drawn in Low Sun over shipped captures (`public/about/pages/amonkhet`). `build.py` and `si3.css` regenerate them. Sources read: main @0c756cc; `src/components/about/pages/{rule-card,rule-diagrams,pin-dock,labelled-screen}.tsx`, `about/tools/tool-card.tsx`, `src/lib/about/pins.ts`, `src/lib/copy/{about-pages,about-entries,lanes,deck-stats,help-me-choose}.ts`, `src/components/intake/intake-form.tsx`, `src/components/ui/filter-chassis.tsx`, and the handoffs about_visual (with addendum-r4), help_me_choose, filter_chassis and all_decks_cart_v2 addendum-r3.

| Board | Item |
|---|---|
| `Good-To-Know-Rows.html` | 1 · Good to know rows cut short |
| `Try-It-Halo.html` | 2 · Try it halo runs outside its frame |
| `Prices-Buy-Chips.html` | 3 · Right-align the prices diagram's buy chips |
| `Copy.html` | 4 · Copy direction: the Discover order, Squirrels, section lines |
| `Help-Me-Choose-Locked.html` | 5 · Help me choose's form while it reads |
| `Dock-Low-Region.html` | 6 · The phone dock for a low region |
| `Filter-Controls.html` | 7 · Shared phone filter controls |
| `Deck-Toasts.html` | 8 · Deck toasts and the quick-add dock |

## 1 · No Good to know row is ever cut short (bug)

**Cause:** five diagrams put rows in side-by-side columns (`one-copy`, `hidden-deck`, `commit`, `own-it`, `replace`). A column has a fixed width (`w: 150`, `w: 104`, `w: 78`) or only what the plate leaves it. A row's tag is `flex-none`, so the card name gives way. Measured on the boards: one-copy shows "Gha…" and "Zi…", hidden-deck "Sol R…", at 390 and 1300 alike. Commit, own-it and Replace fit today by a few pixels only.

**Call, for every diagram:**
1. **A row never sits in a side-by-side column.** A diagram with a row puts every row in one column 250px wide (`w: 250`, as credits, never and invites already are). It reads top to bottom, and a step between rows is a `between` part in that column, with ↓ in place of →.
2. **Only tiles, the empty slot and captions sit side by side** in `columns`. Rows that follow them go in `foot`.
3. **One code change:** `foot` (and `head`) accept a full column `{ w, gap, parts }` as well as a parts list, and `RuleDiagram` renders it through `Stack`.
4. **Pin it:** `about-pages.test.ts` fails a diagram that has a row part in a column narrower than 250px, or in one of two or more `columns`. The row keeps its ellipsis as a last resort, but no shipped diagram reaches it.
5. **The five, redrawn** (same parts and words unless marked):
   - `one-copy`: Sol Ring with the tag "you own ×1", ↓, then Ghalta, Sai and Zimone.
   - `hidden-deck`: the Ghalta tile beside the empty slot, then a foot column: "Its cards", Sol Ring "in use", "not spares".
   - `commit`: "Ghalta · pending", its two rows, ↓ "commit", "Sai sees it · v2 · today", Sol Ring "short".
   - `own-it`: the Ghalta tile beside "holds your only Sol Ring", then a foot column: "Sai · Shopping", Sol Ring with its buy tag, "your copy is in Ghalta". The ≠ goes.
   - `replace`: "Your Collection, then Replace", then Sol Ring, Swords and Cultivate tagged "in the file", and Thrasios struck through, tagged "not in the file".
6. **Readability, kept from the first draft:** no opacity on a part (a dim row draws its edge dashed, a gone row strikes its name in `--fg-muted` and keeps its tag at full strength); row edges in `--border-dashed`; muted tags and captions in `--fg-body`. Every word is 4.5:1 or better in all six themes.

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

## 8 · Deck toasts stand above the quick-add dock (addendum)

**Cause:** Small items 2 item 8 lifts only the failed-search toast above the dock. Every other deck toast uses the shipped `DECK_SLOT` (phone: 10px above the tab bar; desktop: 16px from the bottom at rail + 16), which ignores the dock. So the I got it receipt and the refusal toasts cover the quick-add field. A refusal also measures only a receipt when it lifts, so it can land on the failed search.

**Call:**
1. **One floor.** Every toast in the deck slot stands on it: the receipt in each of its phases (added, undone elsewhere, undo failed), the refusals (a removal, a token, Suggested changes' Apply), and the failed search.
   - When a bar holds the page's foot, the floor is 10px above that bar's top edge. That bar is the quick-add dock, or on the phone the top-off commit bar that stands in for it.
   - With no bar (phone Shopping, Stats and Notes, or a resolution open), the floor is the shipped slot.
2. **Where:** phone keeps 16px gutters. Desktop keeps the shipped left edge (rail + 16) and 440px width, raised to the floor. No toast ever covers the quick-add field.
3. **At most two toasts, never overlapping.**
   - One receipt at a time: the next write replaces it, as shipped.
   - One alert at a time: a refusal or the failed search. The newer replaces the older, whichever kind it is.
4. **Order:**
   - The receipt keeps the floor because it holds Undo.
   - An alert sits 10px above the receipt, or on the floor when no receipt is up.
   - When the receipt goes, the alert drops to the floor at once, with no motion.
5. **When a receipt arrives:**
   - A refusal is dismissed, as shipped.
   - The failed search stays, because the field still holds its query. It moves above the new receipt.
6. **Unchanged:** each toast keeps its own 8s timer, held by its own hover and focus. Roles stay as shipped: receipts `status`, alerts `alert`.
7. **Engineering:**
   - The quick-add dock and the top-off bar publish their measured height on the root as `--deck-foot-h` (0 while hidden), the way `useDockClearance` publishes `--dock-h`.
   - `DECK_SLOT` becomes one fixed stack (a flex column with a 10px gap). Its bottom is `calc(var(--tabbar-h) + var(--deck-foot-h) + 10px)` on the phone, and `max(16px, var(--deck-foot-h) + 10px)` from md.
   - Toasts render into that stack, so `lift` and the refusal's measuring of the receipt go away.
   - The failed search joins the refusal claim (`the99:deck-refusal-claim`).
   - The cart's slot and /credits' toasts are unchanged.

There are no new strings: the boards reuse the shipped receipt and removal strings and Small items 2's failed-search draft.

## Copy for /copy-review

| Where | Draft |
|---|---|
| `about-pages.ts` Discover `order` label | Item 4 above |
| `about-pages.ts` `one-copy` row tag | `you own ×1` (was a caption) |
| `about-pages.ts` `commit` caption | `Sai sees it · v2 · today` (two captions merged) |
| `about-pages.ts` `own-it` caption | `holds your only Sol Ring` (was `has Sol Ring`) |
| `about-pages.ts` `replace` head and tags | `Your Collection, then Replace`, `in the file`, `not in the file` (was Now / File / Replace) |
| `about-pages.ts` `intent` diagram foot caption | `a theme deck · no Game Changers · you pick` |
| `about-entries.ts` the legacy bracket entry | "A theme deck" in place of "A Squirrel deck" |
| `about-pages.ts` every section's `sub` | The table in item 4 |

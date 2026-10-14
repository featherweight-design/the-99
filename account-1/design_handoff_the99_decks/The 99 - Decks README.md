# The 99 — Decks &amp; deck-builder (design handoff)

The richest surface in the app: three connected routes that turn a chosen commander into a
finished (or honestly-unfinished) 99. **`/decks`** lists the decks assembled from the
collection, **`/decks/new`** creates one, and **`/decks/[id]`** is the builder itself — where
suggestions, colour-scoped search, live role counters, in-place ownership and two text exports
all live.

File: `The 99 - Decks.dc.html` (canvas — pan/zoom). Each state leads with the phone, desktop
beside it. Built against the locked brand system in `design_handoff_the99_brand/` and the app
shell in `design_handoff_the99_appshell/` (same rail, bottom tabs, account trigger, card-fan
mark). All hexes below are brand tokens; production references token names, not raw values.

Entered from **#7** (a commander's detail links here with the general pre-filled) and
standalone. This surface owns the **live** half of the shell's guided-flow **step 3**.

## States delivered
- **Deck list** (`/decks`, populated) — four decks, build progress + owned/to-buy per card.
- **Create · pre-filled** (`/decks/new?commander=…`) — seeded from a Commanders recommendation.
- **Create · picker** (`/decks/new`) — searching the player's legal, owned generals.
- **Builder · empty** — just created; commander set, the 99 still to assemble.
- **Builder · mid-build** — role counters, decklist with in-place shopping markers, colour-scoped
  search open (mobile shows the decklist **and** the add sheet).
- **Builder · suggestions degraded** — EDHREC offline; recommendations fall back to role coverage.
- **Exports** — one dialog, two plain-text tabs (decklist, commander first · shopping list).
- **First-run arrival** — guided-flow **step 3 live**, the payoff of the shell's checklist.

---

## Decisions log

### 1. Builder layout → **a ledger + workbench split**
The builder has two jobs that pull in opposite directions: *show me what I have* and *let me add
fast*. So the screen is split — the **deck you have** on the left (grouped decklist), the **ways
to add** on the right (one Add panel). Above both sits a fixed spine: commander, progress to 99,
and the role-counter strip. The same logic scales to the phone: the decklist is the screen, the
role strip compresses into a five-cell mini-row, and the Add panel becomes a bottom sheet. One
mental model, two widths — the app-shell decision (desktop = "mobile, widened") carried through.
The decklist groups **by card type** (Creatures / Instants / Sorceries / Artifacts / Enchantments /
Lands — the entrenched, default view) or **by role**; a `Group: By type · By role` toggle switches
lenses without reinventing how players already read a list.

### 2. Suggestions ↔ search → **one Add panel, two modes, adding always deliberate**
Suggestions and search answer the same question ("what goes in next?") from opposite ends —
push vs. pull — so they share **one panel** with a two-tab head, not two scattered surfaces.
**Suggestions** are display-only: each card carries a **reason** (EDHREC synergy % or the role it
fills) and an explicit **+ Add**. **Search** is scoped to the commander's colours, min 2
characters, ≤20 results, each flagged owned/unowned, with an owned-only toggle. Crucially, in
**both** modes adding is a single deliberate click — nothing enters the 99 by being looked at.
A card already in the deck shows **✓ In deck** instead of Add, which is how the singleton rule
(server-enforced silent no-op) is made *legible* rather than mysterious; basic lands are the one
exception and increment.

### 3. Role counters → **a recommended mix, sourced and non-alarming**
Role balance is a **subjective recommendation**, so the strip is framed and coloured as guidance,
not a scorecard. Five cells — Ramp `rec 10`, Draw `rec 10`, Removal `rec 8`, Wipes `rec 3`, and an
**advisory** Lands `rec ~37` — each show your current count over a fill bar, labelled `rec N` rather
than a hard `have/target`. Below-rec is **neutral** (`#C6B79A` figure, brass bar), *not* alarm-amber:
not hitting 8 removal or 37 lands is explicitly fine. A met role goes success green. Crucially the
numbers **explain themselves** — a `Recommended mix` header names the source ("EDHREC averages for
a 4-drop Jund commander — a guide, not a gate"), every cell carries a hover rationale, and a worked
example is spelled out inline (*"Ramp · rec 10 — decks that cast a 4-mana commander on curve average
~10 sources; you're at 8, fine for a slower build"*). Without the *why*, the numbers would feel made
up. Nothing here blocks export — the brief's "advisory, never blocking" is literal.

### 4. Shopping list → **marked in place, then gathered**
"Always know which deck cards you don't own" is answered twice. **In place:** every decklist row
carries an ownership dot — solid green = owned, dashed hollow = unowned — and unowned rows get a
small amber **buy** tag, so the gap is visible while you build. **Gathered:** an `All / Shopping`
toggle over the decklist filters to just the unowned cards, and the same set totals and exports.
Ownership is a property of each deck card, so the shopping list is derived, never a separate list
to maintain.

### 5. Exports → **one dialog, two plain-text tabs, each copyable**
Both takeaways live in a single **Export** dialog (centred modal on desktop, bottom sheet on
phone) with **Decklist** and **Shopping list** tabs. Decklist is **commander first**, then
`N Card Name` lines (Moxfield/Archidekt-ready). The shopping list copies **names only** — the
brief's planned small addition, same dialog, second tab. **Price is deliberately out of the core
flow:** the mock still shows an `est.` reference figure and per-card prices, but they're de-emphasised
(muted, never amber) and an explicit callout states *pricing is a planned add, not part of the
export* — price visibility is sticky enough to earn its own later decision, so nothing here depends
on it. Each tab has **Copy to clipboard** + **Download .txt**.

### 6. Create flow → **two doors, server validates both**
Deck creation comes from two directions, so `/decks/new` has two forms. **Pre-filled:** arriving
from a #7 recommendation, the general is set and shown as a full card with a green "legal —
validated" strip; you only name the deck. **Picker:** arriving standalone, a search over your
**legal, owned** generals with a sticky "selected" summary; pick one, name it, create. Either way
the commander's legality is **server-validated on create** (stated in the UI), and the deck starts
**empty and named**. Colour identity is shown **locked** to the commander so the colour-scoped
search downstream is never a surprise.

### 7. First-run → **the live half of the shell's guided step 3**
The shell ships step 3 ("Build your first deck") **dimmed**; this surface owns the **live** arrival.
Coming straight from Commanders' *Build this deck*, the builder opens empty under a brass
**guided banner** — `step 3 of 3` with the 3-diamond crumb (steps 1 &amp; 2 done, 3 active), the
card-fan mark, and copy that names the finish line: **the moment the deck has cards, setup is done**
and the checklist dissolves into the dashboard. Below it is the real, usable builder with primed
suggestions — the banner is the only first-run-specific element.

### 8. Mobile / desktop parity
Every state exists on both. The deck list, both create doors, the empty/mid/degraded builder, both
export tabs, and the first-run banner all have a phone form. Desktop uses the rail + browser chrome;
mobile uses the notch + bottom tabs with **Decks** active. The builder's Add panel is a right-hand
column on desktop and a **bottom sheet** on phone (drawn as its own frame in mid-build and degraded);
Export is a centred modal on desktop, a sheet on phone.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Deck card (list)** | surface `#1E1A15`, `1px #2A241D`, radius 12px; art thumb `aspect 63/88` identity gradient + WUBRG pips; name Cinzel 600; build bar track `#2A241D`, fill `built≥99` `#6FA368` / `≥55` `#E0913C` / else `#C6533F`; `N/99` + `owned · to buy` in Plex Mono; status pill Building `#E0913C` / Complete·Playable `#6FA368` / Draft `#A89B84`. |
| **Builder spine** | commander thumb + name (Cinzel) + WUBRG pips; `built/99` Plex-Mono figure over a 170px bar (amber mid-build); `owned · to buy` caption; **Export ▾** primary (disabled/grey until ≥1 card). |
| **Role counter cell** | `#181410`, `1px #2A241D`, radius 9px; label Plex-Mono 10px uppercase `#8E8269`; current-count figure over a 5px fill bar to `pct`; below-rec **neutral** (`#C6B79A` figure, `#C9A24B` bar), met `#6FA368`, advisory (Lands) `#C9A24B` — never alarm-amber; `rec N` caption; per-cell `title` hover rationale + a `Recommended mix` header naming the EDHREC source and one worked example. |
| **Group-by toggle** | `Group: By type · By role` pills over the decklist; active `#2A241D` + `1px #3A3229` + `#EDE6D8`, idle `#8E8269`. **By type** is the default (standard MTG card types); **By role** is the recommendation lens. |
| **Decklist group** | Cinzel 600 header + Plex-Mono count `#8E8269` + right-aligned note `#6E6353`; grouped **by card type** (default) or **by role**; two-column card grid on desktop, single column on phone. |
| **Decklist row** | `#1A160F`, radius 7px; ownership dot — owned solid `#6FA368`, unowned dashed hollow `#6E6353`; name `#EDE6D8` (muted `#8E8269` for "+N more" meta rows); unowned gets amber **buy** tag `rgba(224,145,60,0.13)`; trailing `✕` remove `#4A4033`. |
| **Add panel** | `#181410`, `1px #2A241D` left border; two-tab head (active `#EDE6D8` + 2px `#C9A24B` underline). Desktop right column 340–346px; phone bottom sheet with grab handle. |
| **Suggestion card** | `#1E1A15`, `1px #2A241D`, radius 10px; ownership dot; **+ Add** `#C9A24B` or **✓ In deck** `#6FA368`; reason chip — synergy brass `rgba(201,162,75,0.14)`, role neutral `#2A241D` `#A89B84`; `owned / unowned · buy` in mono. |
| **Search** | input `#14110E`, `1px #C9A24B`; `N results · Jund-legal only` + **Owned only** toggle (`#2A241D` track, `#8E8269` knob); result row = dot + name + `owned/unowned · Jund-legal` + **+ Add** / **✓ In deck**; footer note on the singleton no-op. |
| **Create · pre-filled** | full commander card (`aspect 63/88`, gradient, inset pips) + green **legal · validated** strip (`rgba(111,163,104,0.1)`, `1px #33402F`); name field `1px #C9A24B` (active); colour identity **locked** row; **Create deck →** primary. |
| **Create · picker** | search over legal generals; row `#1A160F` idle / `#211C15` + `1px #C9A24B` selected; art thumb + name + pips + `pool` count + radio (`#C9A24B` filled when selected); sticky **Selected** summary card + name + **Create deck →**. |
| **Export dialog** | modal `#1A160F`, `1px #3A3229`, radius 16px, shadow `0 40px 100px rgba(0,0,0,.7)` over `rgba(8,6,4,.68)` dim; tab pills — Decklist `#C9A24B`, Shopping `#E0913C`; body mono block on `#100D0A`; shopping copies **names only** with a callout that price is a **planned** add (reference `est.` figure muted, never amber); **Copy to clipboard** primary + **Download .txt** secondary. |
| **Guided banner (first-run)** | `linear-gradient(120deg,#221D14,#1A160F)`, `1px #3A3229`, radius 14px; card-fan glyph + `step 3 of 3` crumb (3 diamonds: done/done/active) + Cinzel *"Build your first deck"* + `0/99` figure. |
| **Empty builder mark** | card-fan (3 stacked rects, front brass-outlined `99`) — the library motif, per the shell's mark map (card-fan = Collection **and** Decks). |

## Notes for engineering
- **Backend payload** drives every element: per deck — commander (name, colour identity, card
  image), size vs. 99, and per card `{name, role, owned}`; the shopping list is `cards.filter(!owned)`.
  Role counters read `roleCounts` against the **recommended** mix **ramp 10 / draw 10 / removal 8 /
  wipes 3** and the **advisory lands ~37** — each recommendation ships with a short rationale + source
  string for the hover/worked-example (the mock uses EDHREC-average copy). Suggestions carry `{name, reason, reasonType, owned, inDeck}`;
  search results `{name, owned, inDeck}` scoped to the commander's colour identity.
- **Advisory, never blocking.** Progress to 99 + commander is guidance only; **Export is enabled at
  any deck size**. Role counts are **subjective recommendations** with a stated *why*, not targets —
  below-rec is styled neutral, never as an error. The decklist groups **by card type** (default) or
  **by role**; grouping is a view, not a constraint.
- **Adding is always deliberate**; **re-adding is a server-enforced silent no-op** except basic
  lands (increment). The UI reflects this with the **✓ In deck** state — never a duplicate row.
- **Search:** commander-colour-scoped, commander-legal only, **min 2 chars**, **≤20 results**, each
  `owned`-flagged, with an **owned-only** toggle. Maps to a query param alongside the deck route.
- **Exports are plain text.** Decklist: commander first, then `N Card Name` lines. Shopping list:
  the unowned set, **names only**. **Price is not in the export** — the reference figures in the mock
  are a flagged **planned feature**; keep price out of the core copy flow until it's deliberately
  designed (visibility is sticky).
- **Create validates commander legality server-side** on both entries; decks start **empty and
  named**. Colour identity is locked to the commander.
- **Deck management:** create + delete are shipped; **rename** is a cheap add (the deck-name field is
  already the create control — reuse it inline on the list/spine).
- **First-run = live step 3.** Building the first deck (deck gains ≥1 card) **completes guided setup**;
  the banner then dissolves, mirroring how the shell's home checklist dissolves after upload.
- **Card art is striped/gradient placeholder** (identity gradient) exactly as Collection/Commanders —
  Scryfall art drops into the same `aspect 63/88` frames later. The card-detail modal from
  `design_handoff_the99_collection/` is available for any row that needs full oracle text.
- **Card names are real Oracle cards** used as realistic sample data (Korvold's Jund shell); counts,
  prices and scores are mock (see the component's logic class).
- Rebuild the **card-fan**, wordmark, and diamonds as **inline SVG** in production (brand-sheet
  guidance); the mockup uses CSS boxes.

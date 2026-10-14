# The 99 — Collection (design handoff)

The product's entry point: the surface at `/collection` where a player flips through ~2,900
owned cards, searches and filters to answer *"do I own this?"*, opens any card for its full
text — plus the deliberate two-step flow to **replace** a collection from a fresh export.

File: `The 99 - Collection.dc.html` (canvas — pan/zoom). Each state leads with the phone,
desktop beside it. Built against the locked brand system in `design_handoff_the99_brand/` and
the shell in `design_handoff_the99_appshell/` (same rail, bottom tabs, account trigger, marks).
All hexes below are brand tokens; production references token names, not raw values.

## States delivered
- **Browse** — `1a` dense rows · `1b` card-art gallery (ships as a view toggle).
- **Card detail** — full modal overlay (full-screen sheet on phone).
- **No results** — search + filters returned nothing (distinct from empty collection).
- **Replace · step 1** — upload/replace entry with full-replace warning + current count.
- **Replace · step 2** — `2a` single scrollable review (chosen) · `2b` collapsed alt (rejected).
- **Replace · step 3** — type-to-confirm modal.

The **empty collection** state (no CSV yet) is owned by the App Shell ticket (its Collection
surface empty state) and is not re-drawn here; "no results" is the distinct filtered-empty case.

---

## Decisions log

### 1. List treatment → **rows ⇄ grid view toggle; rows default on mobile, grid on wide screens**
The two jobs pull opposite ways: *"do I own this?"* wants a scannable, high-density list;
*"what's in my pile"* browsing wants recognizable art. Rather than pick one, the surface ships a
**view toggle** (segmented `≣`/`▦` control in the filter bar). Rows are the phone default —
1,418 unique entries scan far faster than a 2-wide art grid on a small screen — and the art grid
is the wide-screen default where the horizontal room pays off. Same data, same filters, two
densities. Explored as `1a` (rows) and `1b` (grid).
- **Row:** grid `52 / 54 / 1fr / 150 / 92 / 18` px → quantity (Plex Mono brass) · color pips ·
  name (Plex Sans 600) · type line (`#A89B84`) · rarity dot + set code (Plex Mono) · chevron.
  Surface `#1E1A15`, `1px #2A241D`, radius 8px; hover `bg #221D16 / border #3A3229`.
- **Grid tile:** `aspect-ratio 63/88` art region (Scryfall art assumed present), quantity badge
  top-right on brass, name + `set · rarity` caption below. 5-up desktop, 2-up phone.

### 2. Filter pattern → **sticky bar above the list; active filters become removable chips**
One bar, phone and desktop: search (grows) · **Color** (five WUBRG pips, toggle to include) ·
**Type ▾** · **Set ▾** · **Sort ▾** · view toggle. Active constraints drop to a **chip row**
below (`Blue ✕`, `Instant ✕`, `Clear all`) with a live `Showing N of 2,933` count on the right.
Chips keep the current filter state legible while scrolling a 2,900-row list — you always know
why the list is short. Bar is `position: sticky; top: 0` so it stays put through the scroll. On
phone the filter row scrolls horizontally; the chip row wraps.

### 3. Card detail → **full modal overlay** (full-screen sheet on phone)
Chosen over drawer or dedicated page. Big art is the point — a modal centers it and dims the
grid so a player can open, read, and dismiss without losing scroll position, then keep flipping
(`‹ Prev` / `Next ›` step through the current filtered result set). Desktop: 820px two-column
modal (art left, oracle text + meta right) over a blurred/dimmed collection. Phone: full-screen
sheet, art up top, close `✕` overlaid. Contents: name (Cinzel) · type line · mana cost (Plex
Mono pips tinted to WUBRG) · oracle text block · set · rarity · color identity · quantity owned.
The URL carries `?card=` so a detail view is still deep-linkable without being its own route.

### 4. Review flow → **single scrollable review** (`2a`), not a stepped or collapsed shape
Summary banner up top (matched count as the hero figure, unmatched + errors beside it), then the
issues in full — **unmatched names** (amber) and **parse errors** (red) — then a **sticky confirm
bar** that keeps the replace count in view the whole scroll. Review is a hard requirement on
every real upload (~2,900 rows with a handful of bad lines), so it's one honest screen, not a
wizard. `2b` shows the rejected alternative (issues collapsed into expandable sections): it hides
the exact thing the player opened the screen to check, and with only ~29 problems there's no need
to hide them. State colors follow the brand: **warning `#E0913C`** for unmatched (recoverable —
just skipped), **danger `#C6533F`** for parse errors (malformed rows). Each issue row uses the
brand **status-row** pattern — `3px` left border in the state color, label in Plex Sans, line
number / reason in Plex Mono.

### 5. Replace safety → **type-to-confirm**
Upload is full-replace, no merge — the most destructive action in the app. Step 1 (upload entry)
states it up front with an amber warning banner and the current count (`replaces your 2,933
cards`). Step 3 is a **danger-styled modal that requires typing `REPLACE`** to arm the button;
until then the confirm sits disabled at 0.6 opacity with a mono hint. Two deliberate gates
(review, then type-to-confirm) make an accidental wipe effectively impossible. The confirm button
is labelled with the concrete count — `Replace 2,933 cards` — never a generic "Confirm".

### 6. Scope → **read-only browse**
No inline quantity editing, no foil/condition, no wishlist in v1. The exported file (ManaBox or
equivalent) stays the source of truth; to change the collection you re-export and **replace**.
The surface is deliberately narrow: search, filter, sort, view a card. Keeping it read-only also
keeps the "replace is the only write path" model clean.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Collection row** | grid `52/54/1fr/150/92/18`; surface `#1E1A15`, `1px #2A241D`, radius 8px; qty Plex Mono `#C9A24B`; name Plex Sans 600 `#EDE6D8`; type `#A89B84`; set Plex Mono `#8E8269`; rarity dot common `#A89B84` / uncommon `#B7C4CE` / rare `#C9A24B` / mythic `#E0913C`; hover `bg #221D16`. |
| **Grid tile** | radius 10px, surface `#1E1A15`, `1px #2A241D`; `aspect-ratio 63/88` art + inset shadow; qty badge Plex Mono `#14110E` on `#C9A24B`, radius 6px; name 13px 600 + `set · rarity` mono caption; hover border `#C9A24B`. |
| **Filter bar** | `position: sticky; top:0; bg #14110E`, `1px #2A241D` bottom. Search `#181410` / `1px #3A3229` / radius 8px. Filter buttons `#2A241D` / `1px #3A3229`. Color pips 15px circles; inactive `opacity .4`, selected `box-shadow 0 0 0 2px #C9A24B`. |
| **Filter chip** | `#2A241D` pill, `1px #3A3229`, radius 999px, 12.5px; leading WUBRG dot where color; trailing `✕` in `#8E8269`. `Clear all` link in brass. |
| **View toggle** | `#181410` / `1px #3A3229` segmented, radius 8px; active segment `bg #C9A24B / #14110E`, idle `#8E8269`. |
| **Result count** | Plex Mono 11px `#8E8269`; turns `#E0913C` when `Showing 0`. |
| **Card modal (desktop)** | 820px, `#1A160F` / `1px #3A3229`, radius 16px, shadow `0 40px 100px rgba(0,0,0,.7)`; 320px art column on `#14110E`; close `✕` `#221D16` circle. Backdrop `rgba(8,6,4,.72)` over blurred grid. |
| **Card modal (mobile)** | full-screen sheet; art header with color-identity gradient + overlaid close; 2×2 meta grid `#1E1A15` split by `#2A241D`. |
| **Mana pip** | 22–26px circle, Plex Mono; generic `{n}` `#4A4033`/`#EDE6D8`; WUBRG uses the identity hex fill with `#14110E` glyph. |
| **Oracle text block** | `#14110E`, `1px #2A241D`, radius 10px; body Plex Sans `#C6B79A` 1.65; reminder text italic; keywords `#EDE6D8` 600. |
| **Review summary banner** | matched card `#1E1A15` / `3px #6FA368` left border, count Plex Mono 30px `#EDE6D8`; issue tallies with `#E0913C` / `#C6533F` dots. |
| **Issue row** | status-row pattern: `#1E1A15`, `3px` left border in state color (`#E0913C` unmatched / `#C6533F` error), radius 8px; name Plex Sans, line/reason Plex Mono `#8E8269`. |
| **Sticky confirm bar** | `#1A160F`, `1px #3A3229` top; summary sentence left, `Cancel` (secondary) + `Continue to replace` (primary) right. |
| **Replace warning banner** | `#211C15`, `1px #3A3229`, `3px #E0913C` left border, radius 10px; `⚠` + copy stating full replace + current count. |
| **Type-to-confirm modal** | danger dialog `#1A160F` / `1px #3A3229`, radius 16px; input `#181410` / `1px #C6533F`; confirm `#3A2019` / `1px #C6533F` disabled at `opacity .6`, armed on exact `REPLACE`; label states the count. |

## Notes for engineering
- **Card art is assumed present** (Scryfall or equivalent) per Design's answer — tiles and the
  modal are laid out as if images load. The mockup fills art regions with color-identity gradient
  placeholders standing in for real art; swap in the image source, keep the `aspect-ratio 63/88`
  frame and the quantity badge / caption chrome.
- **Query API drives every designed control:** name search, filters on color identity / card
  type / set, and sort. Active-filter chips map 1:1 to query params (see the `?q=…&c=R&t=sorcery`
  URL on the no-results frame). The result count is `matched / total`.
- **Replace is a two-step server flow** (already built): *preview* returns matched count,
  unmatched rows (name + set + line), and parse errors (line + reason) → the step-2 review;
  *confirm* replaces the whole collection → gated behind type-to-confirm. Current collection size
  feeds the "replaces your N cards" copy in steps 1 and 3.
- **Sample counts** (2,933 read → 2,904 matched, 21 unmatched, 8 errors) mirror the shape of
  `data/the-vault.csv`; card names in the browse frames are real Oracle cards used as realistic
  data, not invented.
- Rebuild the **card-fan** empty/no-results mark and all logomarks as inline SVG in production
  (brand-sheet guidance); the mockup uses CSS boxes.

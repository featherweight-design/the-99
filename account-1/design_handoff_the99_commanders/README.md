# The 99 — Commanders (design handoff)

The bridge between **Collection** (#6) and **Decks** (#8): the surface at `/commanders`
that answers *"which commander should I build, given what I already own?"* with a ranked list
where **every recommendation explains itself all the way down to the named cards** — so a
skeptical Commander player can see the receipts and trust the order.

File: `The 99 - Commanders.dc.html` (canvas — pan/zoom). Each state leads with the phone,
desktop beside it. Built against the locked brand system in `design_handoff_the99_brand/` and
the app shell in `design_handoff_the99_appshell/` (same rail, bottom tabs, account trigger,
XCIX seal). All hexes below are brand tokens; production references token names, not raw values.

## States delivered
- **First-run arrival** — guided-flow **step 2 live** (the shell ships it dimmed; this is the
  moment a player lands here right after their first upload).
- **Populated ranked list** — color-identity filter in use.
- **Commander detail** — full card, oracle text, complete component breakdown + the named-card
  receipts (29 owned + 11 missing EDHREC chips), and the deck-creation entry point.
- **Degraded · global** — EDHREC unavailable everywhere; two-part scores + banner.
- **Degraded · per-commander** — one general with no synergy data, ranked on pool + roles.
- **Empty · no candidates** — XCIX-seal state (extends the shell's).
- **Empty · filtered-to-zero** — distinct from no-candidates; an active color filter matched none.

---

## Decisions log

### 1. List treatment → **ranked recommendation cards, each carrying its own evidence**
The core requirement is that the ranking *explains itself*, so a bare sortable table was never
enough. Every row is a **recommendation card** that shows, inline: rank, commander art + WUBRG
identity, name/type, the **Fit score**, a **role-coverage chip row** (ramp/draw/removal/wipes
with gaps flagged), a **synergy overlap** bar (own N of top M), and a one-line **receipts
preview** naming the actual cards behind the strength. You can trust or dismiss a pick without
opening it. The **order stays opinionated** — Fit descending, non-reorderable; the only steering
is the color filter (decision 6). Desktop uses a 4-column grid (`rank / art / evidence / fit`);
mobile compresses the same card into a stacked tile with the Fit figure pinned top-right.

### 2. Score model → **Fit /100, split into Pool · Roles · Synergy**
A single opaque number is exactly the kind of thing a skeptic distrusts, so **Fit** is always
shown as a **brass segmented bar** broken into its three contributing components — a monochrome
brass ramp (`#6E5B33` pool → `#A9863E` roles → `#C9A24B` synergy) that reads as "one score, three
sources." The number tells you *how ready*; the bar tells you *why*; the receipts (below) tell you
*from which cards*. Every figure is Plex Mono per the brand rule. When synergy is missing the bar
degrades to two segments (decision 5) rather than lying about a third.

### 3. Receipts → **named cards at every level, full lists on detail**
"The explanation must go all the way down." So named cards appear **everywhere**, scaled to the
space: a **3-card preview + count** on each list card (`Dockside Extortionist · Pitiless Plunderer
· Mayhem Devil +25`), and the **complete list on detail** — every role expands to the owned cards
that fill it, and the EDHREC section shows all **29 owned** cards as green-dotted chips *plus* the
**11 missing** as faint dashed chips ("the gap to close"). An overlap can be 30+ cards; the detail
is built to carry it as a wrapping chip cloud, not truncate it. Owned = success-dotted; missing =
faint outline. No score on this surface is unexplained.

### 4. Detail container → **a dedicated page, not a modal or drawer**
Collection's card detail is a modal because a card is a lightweight *peek* you flip through.
A commander recommendation is the opposite: a **decision surface** you commit from, and the
**launch pad into deck-building**. It carries a full card, oracle text, three breakdown sections
with 40+ named cards, and the primary *Build this deck* action — too heavy for a modal, and it
deserves its own URL (`/commanders/:slug`) so a pick is shareable and back-navigable. Layout:
sticky left column (card image, identity, **Build this deck →**, compare, seed note) + a scrolling
right column (Fit hero → The pool → Role coverage → EDHREC synergy). Mobile is a full-height page
with an art header and a **sticky Build bar** so the commit action is always reachable. On desktop
the full card is always shown in the left column; on mobile the header is a **cropped art band**,
so it carries a `⛶ Full card` affordance (and the whole header is tappable) that opens a
**full-card lightbox** — the complete 63/88 card with oracle text, dimmed over the page, tap to
close. Both the affordance and the opened lightbox are drawn as phone frames.

### 5. Degraded → **the ranking survives, and says so, at two scopes**
EDHREC is a real dependency that fails. Both conditions are designed as first-class, not error
pages:
- **Global** — an amber status banner (`#E0913C`, brand warning) states synergy is offline and
  that ranking continues on **pool + role coverage**; every card drops to a **two-part Fit**, the
  synergy bar/receipts are replaced by a quiet "receipts hidden — data offline" note, and a
  **Retry** is offered. The list still ranks and is fully usable.
- **Per-commander** — one general (EDHREC has no page for it yet) shows an **inline neutral note**
  in its own card ("No synergy data for this general — ranked on pool + roles only"), a two-part
  Fit, and its own Retry. Neutral `#8E8269`, not alarm-amber — it's a data gap for one pick, not a
  system fault. The rest of the list is unaffected.

### 6. Steering → **one control: a color-identity filter that narrows, never re-scores**
The ranking is the product's opinion; letting users re-sort would undercut it. The single steering
control is the **WUBRG color-identity filter** (same pip vocabulary as Collection). It **narrows
the field** — "generals whose identity includes Black" — with active colors dropping to removable
chips and a live `Showing N of 24` count, but **Fit order is fixed** and labeled as such (`Order:
Fit ↓ · fixed`). Filtering to nothing is the **filtered-to-zero** empty state, kept visually
distinct from **no-candidates** so the player always knows *why* the list is short.

### 7. First-run → **the live half of the shell's guided step 2**
The shell owns the *dimmed* "Review your commanders" checklist item; this surface owns its **live**
form. On first arrival a brass **XCIX-sealed banner** ties back to the checklist (`Guided setup ·
step 2 of 3`, with the 3-diamond progress crumb: step 1 done, step 2 active, step 3 locked),
states what was read (`1,418 cards → 24 legal generals`), and points at the payoff — pick one, see
the receipts, build to finish setup. Below it is the real ranked list; the banner simply dissolves
on later visits into the populated header (decision 1).

### 8. Mobile / desktop parity
Every state exists on both. The recommendation card, the full breakdown, both degraded treatments,
both empty states, and the filter all have a phone form. Desktop uses the rail + browser chrome;
mobile uses the notch + bottom tabs with **Commanders** active. Detail's *Build this deck* is a
sticky bottom bar on phone, a sticky side button on desktop.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Recommendation card (desktop)** | grid `40 / 100 / 1fr / 236`px → rank · art · evidence · fit. Surface `#1E1A15`, `1px #2A241D`, radius 12px; hover `bg #211C15 / border #3A3229`. Rank in Cinzel 800 `#8E8269` + `#3A3229` diamond. |
| **Recommendation card (mobile)** | stacked tile, radius 11px; Fit figure Plex Mono pinned top-right; art thumb 36×50; role chips + synergy line below. |
| **Commander art** | `aspect-ratio 63/88`, color-identity gradient placeholder (Scryfall art drops in later), WUBRG pips inset bottom-left. Same gradient system as Collection. |
| **Fit bar** | track `#2A241D`, radius 999; filled to `fit%`, split by `flex-grow` into brass ramp `#6E5B33` (Pool) · `#A9863E` (Roles) · `#C9A24B` (Synergy). Legend dots match. Two-segment (Pool/Roles) when degraded. |
| **Role chip** | Plex Mono 11px `#2A241D` pill; label `#8E8269` uppercase + count. Gap → count `#E0913C` (warning), border `#4A3A24`, trailing " gap". |
| **Synergy line** | `Synergy` mono label + 120px brass overlap bar (`own/top`) + `own N of top M` in mono. |
| **Receipts preview** | Plex Mono 11px `#6E6353`, `receipts:` label `#8E8269`, ellipsis-truncated, trailing `+N`. |
| **Detail card (left)** | `aspect-ratio 63/88`, radius 14px, gradient art; name Cinzel over shadow, mana pips top-right, oracle block on `rgba(10,7,4,.5)` glass. Sticky. |
| **Mana pip** | 22–24px circle, Plex Mono 600; generic `{2}` `#3A322A`/`#C6B79A`; WUBRG uses identity hex with dark glyph. |
| **Fit hero (detail)** | `#1A160F`, `1px #2A241D`, radius 14px; 52px Plex Mono score + `/100`; 12px segmented bar + labeled legend with per-component %. |
| **Role panel (detail)** | `#1A160F`, `1px #2A241D`, radius 10px; role name Plex Sans 600 + `N owned · baseline M` (success `#6FA368`) + note `#8E8269`; owned cards as green-dotted mono chips. |
| **Owned chip** | Plex Mono 12px `#221D16`, `1px #33402F`, radius 999; 6px `#6FA368` dot. |
| **Missing chip** | Plex Mono 12px transparent, `1px dashed #3A3229`, radius 999; `#8E8269`; hollow `#6E6353`-outline dot. |
| **Build button** | primary — `bg #C9A24B / text #14110E`, Plex Sans 600; the deck-creation entry point (sticky on mobile). |
| **Color-identity filter** | Collection's pip vocabulary: 16px circles, inactive `opacity .35`, selected `box-shadow 0 0 0 2px #C9A24B`. Active → removable chips + `Showing N of 24`; order label `Fit ↓ · fixed`. |
| **Global degraded banner** | `#211C15`, `1px #3A3229`, `3px #E0913C` left border, radius 12px; `⚠` in amber ring; **Retry now** secondary button. |
| **Per-commander degraded note** | inline status-row: `#211C15`, `2px #8E8269` left border (neutral, not amber), radius 8px; message + `Retry`. |
| **No-candidates empty** | XCIX seal (brass-outlined 110px badge), Cinzel heading *"No generals in the ranks — yet"*, scanned count in Plex Mono, `Add more cards` / `View collection`. |
| **Filtered-to-zero empty** | dimmed WUBRG pips of the active filter, Cinzel *"No generals in {guild}"*, `Showing 0 of 24` in `#E0913C`, `Clear color filter`. |
| **Guided banner (first-run)** | `linear-gradient(120deg,#221D14,#1A160F)`, `1px #3A3229`, radius 14px; XCIX ring + `step 2 of 3` crumb (3 diamonds: done/active/locked) + Cinzel *"Review your commanders"*. |

## Notes for engineering
- **Backend payload** drives every element: per commander — name, score, owned-pool size for its
  colors, role coverage (counts + which are gaps), EDHREC overlap (own N of top M), **color
  identity**, **card image**, and the **named cards** behind each component (which owned cards
  overlap EDHREC's list, which fill each role). Design assumes card names are present, including
  large lists (overlaps of 30+).
- **Fit is `pool + roles + synergy`.** When synergy is null (global or per-commander), Fit is the
  renormalized two-part score — the mockup carries a `fitNS` field alongside `fit` to show both;
  production computes one from the availability of the synergy component.
- **Color filter maps 1:1 to a query param** (`?c=B`, `?c=WU`); it filters candidates by identity
  and never changes sort order. `Showing 0` is the filtered-to-zero state, distinct from the
  no-candidates condition (no legal general in the whole collection).
- **Detail is its own route** (`/commanders/:slug`); *Build this deck* hands off to the Decks /
  deck-builder ticket (#8) seeded with the owned pool. That handoff is where guided-flow **step 3**
  goes live.
- **Card art is striped/gradient placeholder** (identity gradient) exactly as Collection —
  Scryfall art drops into the same `aspect-ratio 63/88` frames later.
- **Commander names and all card names are real Oracle cards** used as realistic sample data
  (matching Collection's approach), not invented — the receipts are only convincing if the names
  are real. Counts and scores are mock data (see the component's logic class).
- Rebuild the **XCIX seal**, wordmark, and diamonds as **inline SVG** in production (brand-sheet
  guidance); the mockup uses CSS boxes.

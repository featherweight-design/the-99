# The 99 — App Shell (design handoff)

The **frame** that wraps every surface: the route at `/`, navigation, auth chrome, and
the first-run / empty moments. Collection, Commanders, and Decks get their own tickets —
this delivers the shell, not the rooms.

File: `The 99 - App Shell.dc.html` (canvas — pan/zoom).
- **Turn 1** — two explored directions: `1a` The Rail, `1b` The Crown Bar.
- **Turn 2** — resolved on `1a`, full state matrix, mobile-first (phone leads, desktop beside it).

Built against the locked brand system in `design_handoff_the99_brand/`. All hexes below are
those tokens; production should reference the token names, not raw values.

---

## Decisions log

### 1. Navigation pattern → **left rail (desktop) + bottom tab bar (mobile)**
Both explored directions collapse to the same bottom tab bar on phones, so mobile parity was
a wash. The rail won on desktop because it mirrors how mobile already thinks: persistent chrome
(wordmark, nav, account) framing a single narrow scrolling content column. Desktop becomes
"mobile, widened" — one layout logic, not two to reconcile. Given the app is mobile-first, that
convergence matters more than the extra horizontal room a top bar would free up.
- Rail: `#1A160F` on `#14110E`, `1px #3A3229` right border, 236px.
- Nav item = brass **diamond** bullet (crown motif) + label. Active: `#2A241D` fill, `#EDE6D8`
  label 600, brass diamond. Rest: `#A89B84` label 500, `#3A3229` diamond; hover `#211C15`.
- Mobile tab bar: 4 tabs, diamond icon + label; active brass `#C9A24B`, rest `#8E8269`.
- Nav reaches `/collection`, `/commanders`, `/decks`; Home is `/`.

### 2. `/` serves two conditions
- **Signed-out** — deliberately minimal: crowned-numeral wordmark, locked tagline
  *"99 problems, but your commander ain't one."*, one brass **Sign in** (Clerk Account Portal
  entry), `Invite-only · access by request` note. No marketing.
- **Signed-in** — home (below).

### 3. Home content model → **dashboard**
Ranked by usefulness to a returning player:
1. **Most complete general** — hero recommendation (top commander by completeness) with a
   progress bar + primary *Build this deck*.
2. **Recommended from your collection** — commander cards, brass "All 24 →".
3. **Recent decks** + **Collection stats** side by side.
Every figure is Plex Mono; flavor stays in the Cinzel greeting only — data UI stays quiet.

### 4. First-run → **hybrid: home *is* a 3-step checklist**
You leaned checklist; I made home itself the checklist on first run rather than a separate
welcome screen (nothing extra to maintain, and it dissolves into the real dashboard after
upload). Steps: **1 Upload collection** (active, contains the dropzone) → **2 Review commanders**
→ **3 Build first deck** (locked/dimmed until unlocked). Nav surfaces read as locked until a
collection exists. The three surface-level empty states are *lightweight in-context nudges*, not
repeats of the whole checklist.

### 5. CSV upload → **dropzone + inline format help + paste fallback**
- Dropzone: `1.5px dashed #4A4033` on `#181410`, hover brass. Accepts Moxfield / Archidekt /
  Deckbox / plain CSV (shown in Plex Mono).
- Inline help: only a **Name** + **Quantity** column required.
- **Paste a list instead** → mono textarea, "quantity then name", live recognized-count.

### 6. Empty states (driven by real backend conditions)
- **Collection empty** (no CSV): card-fan mark, *"Your collection is empty"*, Upload / Paste.
- **No commander candidates** (uploaded, nothing legal/ownable): XCIX seal, *"No generals in the
  ranks — yet"*, scanned-count in mono, Add more cards / View collection.
- **No decks**: card-fan mark, *"No decks yet"*, Browse commanders.
Headings carry the flavor (Cinzel, some brass); bodies stay calm; counts stay mono.

### 7. Account control → **Clerk `<UserButton />`**
We own only the **trigger placement** (pinned to the base of the rail; top-right avatar on
mobile) and re-skin the popover to brand tokens. Menu: account header (name + email),
**Manage account** (Clerk hosted profile modal), **Sign out** (→ signed-out landing),
`SECURED BY CLERK` caption. Auth forms themselves are Clerk-hosted — not designed here.
Invite-only rejection happens at Clerk's layer, so there is no "access denied" state.

### 8. Mobile / desktop parity
Identical capability on both. Rail ↔ bottom tabs; rail account block ↔ top-right avatar +
bottom sheet; every empty state and the upload flow exist on both.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Rail nav item** | 236px rail `#1A160F`; item radius 8px; active `bg #2A241D / text #EDE6D8 600 / diamond #C9A24B`; idle `text #A89B84 500 / diamond #3A3229`; hover `bg #211C15`. |
| **Bottom tab** | diamond icon + 10px label; active `#C9A24B`, idle `#8E8269`; bar `#1A160F`, `1px #3A3229` top. |
| **Account trigger** | avatar 38px, radius 12px, `bg #14110E`, `1px #C9A24B`, initials Plex Mono `#C9A24B`; row `#221D16`, hover border brass. |
| **Account popover** | `#221D16`, `1px #3A3229`, radius 14px, shadow `0 20px 50px rgba(0,0,0,.6)`; destructive (Sign out) diamond `#C6533F`. |
| **Wordmark** | mono `THE` (0.42em) + crown diamonds (6/8/6px) over Cinzel 800 `99`. Below 24px drop the crown (favicon rule). |
| **Dropzone** | `1.5px dashed #4A4033` on `#181410`, radius 12px; hover border `#C9A24B` bg `#1C1712`; ↑ in brass ring. |
| **Primary button** | `bg #C9A24B / text #14110E`, 600 14px, radius 8px, pad 11×22; hover `#D8B25E`. |
| **Secondary button** | transparent, `1px #3A3229`, `#EDE6D8`; hover border brass + text `#D8B25E`. |
| **Commander card** | surface `#1E1A15`, `1px #3A3229`, radius 12px; striped art placeholder + WUBRG pips; name Cinzel 600; completeness Plex Mono; bar track `#2A241D`, fill success≥90 `#6FA368` / ≥75 `#E0913C` / else `#C6533F`. |
| **Empty-state marks** | XCIX seal (brass-outlined badge) for "no candidates"; card-fan (3 rects, front brass `99`) for empty collection / decks. Secondary marks per brand sheet. |

### Mark usage — which mark, where
- **Crowned "99" — identity.** The app itself: wordmark, signed-out landing, home greeting,
  splash, favicon. *Not* a per-surface icon — it represents The 99, not a section. (Drop the
  crown below 24px per the brand sheet.)
- **Card fan — the library.** Collection **and** Decks — the pile you own and the decks you
  assemble from it — plus their empty states. Reads as "a stack of cards."
- **XCIX seal — leadership.** Commanders only — the general who leads the 99 — and the Commanders
  surface's empty / loading states. The regalia reads as command.

So the proposed mapping is right; the only nuance is that crowned-99 is *identity*, not a fourth
surface icon.
| **Window / phone chrome** | reference framing only (browser dots + URL, phone notch + bottom tabs) — not production shell. |

## Notes for engineering
- **Guided-flow steps 2 & 3 are out of scope here** and must be built as the first-run entry
  points of their surface tickets, not a separate task: step 2 *"Review your commanders"* = the
  **Commanders** surface's first-run state; step 3 *"Build your first deck"* = the **Decks /
  deck-builder** surface's first-run state. This shell owns step 1 (upload) as the unlock and the
  dimmed/locked presentation of 2–3 only. Track the two live states in those tickets.
- Art thumbnails are **striped placeholders** with mono captions — real card imagery (Scryfall
  or equivalent) drops in later; not part of this ticket.
- Commander names in the mockups are **invented** (Ysolde, Corvyn, Mireth…) — placeholders, not
  real cards.
- Progress-bar fill widths and all counts are mock data (see the component's logic class).
- Rebuild wordmark / seal / card-fan as **inline SVG** in production (brand sheet guidance);
  the mockup uses CSS boxes.

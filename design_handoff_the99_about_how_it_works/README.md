# Handoff: About · How the app reaches its answers (R1)

Repo path: `design/design_handoff_the99_about_how_it_works/`. This is an addendum to About R6
(`design/design_handoff_the99_about/`).

Brief: `docs/superpowers/design-briefs/2026-09-28-how-it-works.md` and its inventory
`2026-09-28-how-it-works-inventory.md`, on branch `docs/about-how-it-works-brief`.

## Overview

This adds a closing appendix to `/about`: eight reference rows, one per thing the app decides. The rows
are Brackets, Roles and targets, Themes, Commander recommendations, Availability and claims, Prices,
Stand-ins and Find a deck, and Written text and credits.
- **What each row names:** where the answer comes from, how it is decided, how often it refreshes, and
  whether it is exact or partial, naming what it misses.
- **Method tags:** each row carries the methods it uses: `rules text`, `other decks`, `model-written` or
  `your input`.
- **Entry links:** feature entries link down to their row, and each row links back.

It adds no new route and no new app surface. Nothing in it is a score or a percentage, and card labels
are excluded.

## About the design files

The `.dc.html` canvas is a **design reference made in HTML**, not code to ship. Rebuild it in the app's
stack (Next.js, Tailwind utilities, the `ui/` primitives), in `src/components/about/`, following the
patterns already in `about-page.tsx` and `provenance-panel.tsx`. The page chrome, desktop rail, sheet,
index, jump mark and figures in the frames are R6's, drawn as scaffolding.

## Fidelity

**High** for the appendix, the method key, `MethodTag`, the row (closed and open), the entry link line
and the contents group: exact tokens, sizes and copy. Everything else in the frames is scaffolding.

## Screens / views

The canvas sections and what each one specifies:
- **§1a Method key:** the long form, with the tag above its definition.
- **§1b The sheet with tags:** "How we make these decisions" with the tags in each `dt`, to show the tag
  can be reused there later. It is not this round's build.
- **§2a Desktop, 1300×820:** the end of chapter 04, then the appendix heading, the key and eight closed
  rows. The rail shows the new contents group.
- **§3a Phone, 390×844:** the appendix with the one-column key and closed rows.
- **§3b Phone:** landed on Roles and targets, open and washed.
- **§3c Phone:** the contents list with its fifth row, open.
- **§4a–4f One open row per method:**
  - `rules text` → Roles;
  - `other decks` → Recommendations;
  - `model-written` → Written text;
  - `your input` → Availability;
  - plus Brackets, whose last field holds the sheet's detection rows, and Prices, the open-1 case.
- **§5a Entry with its link line:** "Why a card is filed under Ramp", with `How this is decided ↓`.
- **§5b Landed on `#how-roles`:** the row is open and washed, the rail marks it current, and the
  `explained in` links point back to the entry.

### Appendix (`section#how-it-works`, after the chapters map in `about-page.tsx`)

- **Section:** `mt-28`, 1px `--border` top, `pt-18`.
- **Heading:** `h2` "How the app reaches its answers" in `font-display` 21/700 (16 on a phone), with
  **no mono numeral**. The display face is the theme's own: `--font-display-face` in `globals.css`.
- **Sub:** 13px `--fg-muted`, 4px under the heading: *Grouped by what the app decides. Each row says
  where an answer comes from, how it is decided, how often it refreshes, and what it might miss.*
- **Intro:** `aboutCopy.pageIntro` gains the clause `, then how the app reaches its answers` after
  "Four chapters, in the order you would use them".

### Method key (inside the appendix, 14px under the sub)

- **Box:** `--surface` fill, 1px `--border-strong`, radius 10, padding 12/16/14 (12/14 on a phone).
- **Heading:** "Four ways an answer is reached", Plex Mono 11/500, tracking .08em, `--fg-faint`.
- **Items:**
  - Desktop: a 2-column grid, gaps 8/24.
  - Phone: one column.
  - Each item has a 1px `--border` hairline above it and 8px top padding.
  - `dt` is a **fixed 100px column** holding the tag, so definitions align in both columns. `dd` is
    12.5/1.5 `--fg-body` (13 on a phone).

### `MethodTag` (new, in `ui/`)

- **Keys:** `rules` | `decks` | `model` | `you`, which map to `rules text`, `other decks`,
  `model-written` and `your input`.
- **Type:** Plex Mono 10 (10.5 in the long-form key), line-height 1.
- **Box:** padding 3/6, radius 4, 1px `--border-strong`, text `--fg-muted`, no fill, `nowrap`.
- **Spacing:** 5px between tags.
- **All four are identical.** No colour or shape differs, on purpose: colouring by trust would be a
  score.

### Row (`HowRow`, new, in `components/about/`)

**Closed:**
- **Container:** a 1px `--border` hairline above.
- **Head:** a `button[aria-expanded][aria-controls]` of at least 44px on desktop and 52px on a phone,
  padding 6/10 (9/8 on a phone), radius 6. It spills into the gutter with `-mx-10` (`-mx-8` on a
  phone).
- **Head content:**
  - `h3`: Plex Sans 14/600 `--fg` (14.5 on a phone), with `tabindex=-1`.
  - The tags follow the title.
  - Desktop: the verdict is pushed right, in mono 10.5 `--fg-faint`, then a ▾/▴ in mono 10
    `--fg-faint`.
  - Phone: the tags and verdict sit on a second line, 6px under the title, and a 44px disclosure sits at
    the right.
- **Verdicts:** `exact`, `partial`, `exact and partial` or `written`. None is coloured.

**Open:**
- **Desktop:** a `dl` grid `128px minmax(0,1fr)`, gaps 9/16, 14px padding at the foot.
  - `dt`: mono 10.5 `--fg-faint`, padding-top 2.
  - `dd`: 13/1.55 `--fg-body`.
- **Labels:** `comes from`, `decided by`, `refreshes`, `exact or partial`, then `explained in` when the
  row has entries.
- **Phone:** each label sits above its sentence, 3px apart and 12px between fields, and the sentence is
  13.5.
- **Brackets' last field:** "Partial, count by count:", then five sub-rows. Each has a 1px `--border`
  hairline, a label at 12.5/600 `--fg` and a sentence. The sub-rows are Game Changers, Mass land denial,
  Extra turns, Two-card infinites and Tutors, **templated from the same constants as
  `deckAnalysisCopy.detection`**.
- **`explained in` links:**
  - desktop: 13px accent, wrapping with gaps 4/14;
  - phone: 44px rows.
- **The sheet's rule, kept:** an exact row's last field is one short statement ("Exact."), and a partial
  row names what it misses.

### Entry link line (`Entry` in `about-page.tsx`)

- **Placement:** 10px under the keys `ol`, or under the caption when an entry has no keys.
- **Style:** the `ProvenanceOpener` quiet tone. The words `How this is decided` are mono 10.5
  `--fg-faint` with a dotted `--border-dashed` underline, then `↓`, 8px apart. The line is at least 44px
  on a phone and 0 from `md`.
- **When drawn:** only when `entryRow[entry.id]` exists. Otherwise nothing is drawn.

### Contents

- **Rail (`ContentsRailR6`):**
  - 8px after chapter 04, a 1px `--border` top with 8px padding.
  - The group row "How the app reaches its answers" is 13px, padding 7/10, with no numeral and no count.
  - The eight row titles follow in entry-row type: 12.5/1.35, padding 4/10/4/30, radius 6.
  - The current row takes `--elevated` fill and `--fg` text.
- **Phone (`ContentsListR6`):** a fifth row of 44px after the chapters, with a `--border-strong` top.
  - The title is a link, `--accent` 14px.
  - The trailing disclosure reads `8 rows`, then ▾/▴.
  - It opens to eight rows of 44px, 13.5 `--fg-body`, indented 26px.
- **Search** matches row titles too. The count's denominator grows by 8, and a match opens the group on
  a phone.

## Interactions and behaviour

1. **Rows start closed.** A press toggles the row. There is no single-open rule, and a row stays open
   for the visit. Nothing is persisted.
2. **A hash opens its row.** When `location.hash` names a row (`#how-roles`), open that row **before**
   scrolling, so the landing measures the open height. The landing is R6 §P1's:
   - it lands 20px from the top (`scroll-mt-[20px]`);
   - the head is washed with `--elevated`;
   - focus moves to the `h3`;
   - the wash clears when the row leaves the upper 30% band (`rootMargin: "0px 0px -70% 0px"`, as
     `contents-rail.tsx`).
3. **Entry link:** a plain hash link to `#how-{row}`, and Back returns to the entry.
4. **Rail tracking:** `aria-current` moves to a row once it reaches the band, as it does for entries.
5. **No animation** beyond R6's existing wash.
6. **Accessibility:**
   - `aria-controls` points at each row's body id;
   - the tags are plain text, so they are read in the accessible name;
   - the `↓` is `aria-hidden`.

## State

- **Client:** `openRows: Set<string>`, seeded from the hash. It lives alongside R6's `query`,
  `openChapters`, `jumpedId` and `currentId`, and the phone group joins `openChapters`.
- **Server:** nothing new.
- **Rows are not `AboutEntry`s.** They have no `since` and no NEW, and they never appear in the sheet or
  the index.
- **Versioning:** it rides the next batched `ABOUT_VERSION` bump, and the `about.test.ts` hash is
  re-pinned deliberately.

## Design tokens

Per theme, from `src/app/globals.css`, and **all six blocks are in the canvas** (`theme` prop, default
`amonkhet`, which is the app's `:root`). The kamigawa values follow as a reference:

| Token | Kamigawa value |
|---|---|
| `--bg` | `#0E0F14` |
| `--surface` | `#16181F` |
| `--surface-rail` | `#12141B` |
| `--surface-sunken` | `#101219` |
| `--elevated` | `#20222A` |
| `--border` | `#181C26` |
| `--border-strong` | `#262A35` |
| `--border-dashed` | `#343843` |
| `--fg` | `#E6E8F0` |
| `--fg-body` | `#B1B6C7` |
| `--fg-muted` | `#959AAD` |
| `--fg-faint` | `#6F7486` |
| `--accent` | `#FF4D9A` |

**Display face** (`font-display`), one per theme:

| Theme | Face |
|---|---|
| Amonkhet | Cinzel |
| Kamigawa | Chakra Petch |
| Ixalan | Trirong |
| Phyrexia | Syncopate |
| Eldraine | Cormorant Garamond |
| Kaldheim | Metamorphous, with `font-synthesis-weight: none` |

**Other type:** body is IBM Plex Sans, and mono is IBM Plex Mono.

**Radii:** 4 (tag), 6 (row head, rail rows), 10 (key box).

No new tokens.

## Copy

Every string is in `how-it-works · copy strings.ts`: `howItWorksCopy` plus the `entryRow` map, which
covers 21 entries, one row each. It goes into `src/lib/copy/about.ts` after `/copy-review`. **Figures
that live in code are templated from their constants, never typed.** The constants include
`MLD_DETECTION`, `EXTRA_TURN_DETECTION`, `COMBO_DETECTION`, `ROLE_TARGETS`, the fit weights, the
200-card pool, 30%, 28, and the credit allowance. Shipping strings carry no em dashes.

## Open (see READINESS-r1.md)

1. **This needs a ruling.** Game Changers and Prices fit none of the four locked methods. Both are drawn
   untagged.
   - Option A: add a fifth tag, `published list`. Design leans A.
   - Option B: leave them untagged, with `comes from` naming the list.
2. **Tutors' accuracy is stated nowhere** (brief §5.5). The sub-row "Not measured yet." is a placeholder,
   not a string to ship.
3. **`deck-analysis.ts:539` names the wrong Game Changer source** (§5.1). That is engineering's fix. The
   appendix's own copy already names Scryfall.
4. **Written text has no `explained in` entries yet.** The Analysis launch entries should key to
   `how-written`.
5. **Whether the batched bump announces the appendix** is Hugh's call.

## Files

| File | What it is |
|---|---|
| `The 99 - About How It Works (R1).dc.html` | The canvas. It opens directly in a browser, and `support.js` is its runtime |
| `READINESS-r1.md` | The four §4 calls, measurements, behaviour and open items |
| `STATES-how-it-works-r1.md` | State tables: §S row, §T entry link, §U contents, §V state |
| `how-it-works · copy strings.ts` | Every string, plus `entryRow` |
| `support.js` | The canvas runtime. It is not app code |

Source it was aligned with, on `main`:
- `src/components/about/about-page.tsx`;
- `src/lib/copy/about.ts`;
- `src/components/decks/provenance-panel.tsx`;
- `src/lib/copy/deck-analysis.ts` (`provenance`, `detection`);
- `src/components/ui/provenance-disc.tsx`;
- `src/app/globals.css`.

# Addendum — Home hero, "General" → "Commander", and per-route loading copy

**Filed by:** Eng, alongside PR for `fix/bug-batch-1` (commit `8006d48` — *fix: commander eligibility, Commander copy, real art, per-route loading*).
**Date:** 2026-07-25
**Status:** Design call — five items. Four are corrections Eng believes are unambiguous (§1, §3, §5 and the stale-row list in §2); one is a **removal** (§4) that needs Design to ratify or commission.
**Scope:** Home dashboard header + hero card, app-wide noun choice, and the loading surface. `docs/superpowers/design-tables/appshell.md` is LOCKED and untouched by this addendum. Every property table below cites the locked row it departs from so Design can see exactly which rows go stale if these are ratified.

---

## Item 1 — Hero section label: "Most complete general" → "Most complete deck"

`appshell.md:780` names the section-label component *§Section label (e.g. "Most complete general", "Recommended", "Recent decks", "Collection")*. The label is only cited as an example there — the locked table specifies the label's **type treatment**, not its wording — but "Most complete general" is the string that shipped.

### Why it's a defect, not a preference

The label sits above `<HeroCommander>`, which ranks **decks** by completeness: `getRankedList()` → `items[0]` → `completeness(top)`, a percentage of the 99 that is built. It does not rank commanders by any property of the commander. The label named the wrong entity — a reader following it expects "the general you own the most support for," which is a different (and unimplemented) computation.

### Current state

| Property | Mobile | Desktop |
|---|---|---|
| content | `Most complete general` | `Most complete general` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `11px` |
| letter-spacing | `0.16em` | `0.16em` |
| text-transform | `uppercase` | `uppercase` |
| color | `var(--fg-faint)` `#8E8269` | same |
| margin-top | `22px` | `22px` |
| margin-bottom | `10px` | `12px` |

### Target

| Property | Mobile | Desktop |
|---|---|---|
| content | `Most complete deck` | `Most complete deck` |
| every other property | unchanged | unchanged |

Copy only. No type, colour, spacing or layout change. `src/components/home/dashboard.tsx:88`.

**Stale row if ratified:** `appshell.md:780` — the parenthetical example list should read *"Most complete deck"*.

---

## Item 2 — App-wide "General" → "Commander"

"General" is Elder Dragon Highlander wording, retired when Wizards adopted the format in 2011. The game's term — the one on the card, in the rules, and on every site the app links out to — is **Commander**. The app used both, in the same session: nav says *Commanders*, the empty state said *No generals in the ranks — yet*.

### Every string changed

| File | Before | After |
|---|---|---|
| `src/app/collection/page.tsx:39` | `A pile of possibilities waiting for a general.` | `…waiting for a commander.` |
| `src/app/commanders/page.tsx:115` | `No generals in the ranks — yet` | `No commanders in the ranks — yet` |
| `src/components/commanders/filtered-empty.tsx:113` | `No generals in {label}` | `No commanders in {label}` |
| `src/components/commanders/guided-banner.tsx:66` | `{n} legal general{s}.` | `{n} legal commander{s}.` |
| `src/components/commanders/guided-banner.tsx:133` | `Meet your generals` | `Meet your commanders` |
| `src/components/commanders/guided-banner.tsx:148` | `{n} legal general{s} ranked…` | `{n} legal commander{s} ranked…` |
| `src/components/decks/create-picker.tsx:73` (mobile `<span>`) | `Pick a general` | `Pick a commander` |
| `src/components/home/dashboard.tsx:88` | `Most complete general` | `Most complete deck` (Item 1) |

`grep -ri general src/` now returns nothing. The sweep is complete on the code side.

### Design-table rows that go stale if ratified

These are the rows Design must decide on. Eng has **not** touched them — the tables are locked.

| Table row | Current wording | Note |
|---|---|---|
| `appshell.md:780` | `"Most complete general"` | → `Most complete deck` (Item 1) |
| `appshell.md:1388` | `A pile of possibilities waiting for a general. Upload a CSV and the table fills — commanders and decks follow.` | Sentence already says *commanders* in its second clause; the first clause is the only holdout |
| `appshell.md:1475` | `No generals in the ranks — yet` (both breakpoints) | |
| `appshell.md:2186` | state row citing `"No generals in the ranks — yet"` | Derived from `:1475` |
| `commanders.md:915` | `### Banner heading ("Review your commanders" / "Meet your generals")` | Same heading pair uses both nouns |
| `commanders.md:1641` | `### Heading "No generals in the ranks — yet"` | |
| `commanders.md:1731` | `### Heading "No generals in {guild}"` | |
| `commanders.md:1795` | `### "+ 20 more generals ↓" hint (mobile first-run)` | **Not shipped** — no such string exists in `src/`. Flagged so it isn't built with the old noun |
| `decks.md:638` | `### Page header — "Pick a general" / "New deck"` | |
| `decks.md:2190` | `Page load, no general chosen` | Prose in a state table, not a rendered string |

### Per breakpoint

| Property | Mobile | Desktop |
|---|---|---|
| noun | `commander` / `commanders` | same |
| every type, colour and spacing property | unchanged | unchanged |

No breakpoint split — a noun does not change with viewport width. The one string with a real mobile/desktop split (`create-picker.tsx:73`, mobile `Pick a commander` vs desktop `New deck`) keeps its split; only the mobile branch changed.

---

## Item 3 — Hero art: real commander art, stripes demoted to fallback

`appshell.md:818` specifies §*Hero card: Art placeholder* — a 200px column filled with a 135° repeating stripe. That was correct when written: art had not landed. `cards.imageUri` is now populated, and the hero rendered stripes over a commander whose art the app already had.

### Current state (`appshell.md:818`, as shipped)

| Property | Mobile | Desktop |
|---|---|---|
| rendered | not rendered (`hidden md:block`) | `block` |
| width | — | `200px` |
| flex | — | `none` (`shrink-0`) |
| background | — | `#14110E` (`--bg`) |
| background-image | — | `repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px)` |
| border-right | — | `1px solid var(--border-strong)` |
| art caption | — | mono `10px` `--fg-faint`, content `commander art` |

Note: the art caption at `appshell.md:818` has **never shipped**. The column has always been an empty `aria-hidden` div. That gap predates this PR and is recorded here only so it doesn't get read as a regression.

### Target

| Property | Mobile | Desktop |
|---|---|---|
| rendered | not rendered (`hidden md:block`) — unchanged | `block` |
| width | — | `200px` — unchanged |
| background (art present) | — | `url({imageUri}) center/cover` |
| background (no art) | — | `repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px), var(--bg)` — the locked value, unchanged |
| border-right | — | `1px solid var(--border-strong)` — unchanged |
| art caption | — | still not rendered; see note above |

The stripe is not deleted. It is now the **no-art branch** — Scryfall misses and un-imaged cards still get the locked treatment. Nothing about the column's box changes; only the paint inside it.

The same change lands on the deck card thumbnail (`src/components/decks/deck-card.tsx:80-85`), where `artGradient` becomes the fallback behind `deck.commanderImageUri`. This required plumbing `commanderImageUri` through `listDecksWithStats()` (`src/lib/decks/read.ts`) — data only, no visual property beyond the fill.

### Contrast

The hero art column carries no text at either breakpoint (`aria-hidden`, empty). Replacing a low-contrast stripe with photographic art changes no text/background pairing, and no WCAG 1.4.3 ratio moves. On the deck card the thumbnail keeps its `inset 0 0 0 1px rgba(0,0,0,0.35)` inner shadow, which is what separates it from `--surface`; art does not weaken that boundary.

**One thing for Design to look at:** `center/cover` on a 200px × full-card-height column crops Scryfall's 63:88 full-card image hard. It reads well on most art but can centre on a frame border for cards with unusual layouts. If Design wants a specific crop origin (e.g. `center 22%` to bias toward the art box), that's a one-token change and Eng will take it.

---

## Item 4 — "Update collection" CTA removed from the home header — **REMOVAL, needs a decision**

This is not a styling call. Eng deleted a component the locked table specifies. Design's options are **ratify the removal** or **commission a handoff for what replaces it**.

### Current state (`appshell.md:759` and `:773`, as shipped)

Two call sites, one desktop and one mobile, both in `src/components/home/dashboard.tsx` (deleted at `:76-87` and `:239-251`).

| Property | Mobile (aside, `md:hidden`) | Desktop (header, `hidden md:inline-block`) |
|---|---|---|
| content | `Update collection` | `Update collection` |
| href | `/collection` | `/collection` |
| font-family | `var(--font-sans)` | `'IBM Plex Sans'` |
| font-weight | `600` | `600` |
| font-size | `13px` | `13px` |
| color | `var(--fg)` `#EDE6D8` | `#EDE6D8` |
| background | `transparent` | `transparent` |
| border | `1px solid var(--border-strong)` `#3A3229` | `1px solid #3A3229` |
| border-radius | `8px` | `8px` |
| padding | `9px 16px` | `9px 16px` |
| margin-top | `16px` (`mt-4`) | — |
| hover | border `--brass`, color `--brass-hover` | border `#C9A24B`, color `#D8B25E` |

### Target

| Property | Mobile | Desktop |
|---|---|---|
| rendered | **not rendered** | **not rendered** |

The desktop header row keeps its `flex` container with the greeting/stats block as its only child. The mobile aside ends after the recent-decks list.

### The argument for removal

1. **The destination owns the action.** `/collection` renders its own *Replace collection* control (`src/app/collection/page.tsx`, §*Replace-collection control* — see the sibling collection addendum). The home button's entire function was to navigate to a page that immediately offers the same verb, one row down.
2. **Its label overstates it.** "Update collection" implies the click updates something. It navigates. The user reported it as redundant on exactly this reading.
3. **The nav already goes there.** *Collection* is a persistent top-level nav item at both breakpoints. The button is a third path to a destination that already has two.

### What Design has to decide

- **Ratify:** `appshell.md:759` and `appshell.md:773` (the hover pair) become stale and describe a component with no call site.
- **Commission:** if Home is meant to carry a collection entry point distinct from nav — e.g. a *state-aware* prompt that only appears when the collection is stale or has unresolved issues — that is a different component with different copy and a conditional, and it needs a handoff. Eng will not rebuild the unconditional version.

Eng's recommendation is **ratify**. Nothing in the surrounding surface depends on it, and the conditional version is the more interesting product question.

---

## Item 5 — Per-route loading copy

`appshell.md:1980`, `:1991` and the caption row below them specify one loading heading, one status line and one caption. `appshell.md:2193` names the mechanism explicitly: *"`app/loading.tsx`: … heading 'Reading your collection'"*.

That was written against a single root `loading.tsx`. In the App Router, a root `loading.tsx` is the Suspense fallback for **every** route segment that lacks its own. So navigating to `/decks/new` was greeted with *"Reading your collection · matching to Oracle…"* — a claim about a fetch that route does not perform.

### Current state

| Property | Mobile | Desktop |
|---|---|---|
| heading content | `Reading your collection` (all 8 segments) | same |
| status content | `matching to Oracle…` (all 8 segments) | same |
| caption content | `This is the boring part. I'll flag anything that looks off.` | same |
| heading type | Cinzel `700`, `19px` | Cinzel `700`, `22px` |
| status type | mono `12px`, `--fg-faint` | mono `13px`, `--fg-faint` |
| caption type | `13.5px`, `--fg-body`, `max-w 380px`, `lh 1.6` | `15px`, same |
| container | `p-40px`, `min-h-420px`, `--bg` + brass radial vignette | `min-h-520px`, same |

### Target — markup identical, copy per segment

The skeleton is now one shared component, `src/components/shell/loading-screen.tsx`, taking a `LoadingCopy = { heading, status, caption }`. **Every type, colour, spacing and layout property in the table above is byte-for-byte unchanged** — the component is the old `app/loading.tsx` body with three strings parameterised. Each segment's `loading.tsx` is five lines picking its entry from `shellCopy.loading` (`src/lib/copy/shell.ts`).

| Route segment | `shellCopy.loading` key | Heading | Status | Caption |
|---|---|---|---|---|
| `/` (`src/app/loading.tsx`) | `home` | `Setting the table` | `counting what you've got…` | `Pulling your collection, commanders and decks into one place.` |
| `/collection` | `collection` | `Reading your collection` | `matching to Oracle…` | `This is the boring part. I'll flag anything that looks off.` |
| `/collection/replace` | `collection` | `Reading your collection` | `matching to Oracle…` | `This is the boring part. I'll flag anything that looks off.` |
| `/commanders` | `commanders` | `Consulting the council` | `ranking by what you own…` | `Scoring every legal commander in your collection. Won't be a moment.` |
| `/commanders/[slug]` | `commanders` | `Consulting the council` | `ranking by what you own…` | `Scoring every legal commander in your collection. Won't be a moment.` |
| `/decks` | `decks` | `Shuffling up` | `counting the 99…` | `Fetching your decks and how close each one is to done.` |
| `/decks/[id]` | `decks` | `Shuffling up` | `counting the 99…` | `Fetching your decks and how close each one is to done.` |
| `/decks/new` | `deckNew` | `Clearing a space` | `gathering candidates…` | `Lining up every commander you can legally helm.` |

Five copy sets across eight segments — the two collection routes share, and so do the two commanders and the two decks routes, because in each pair the wait is the same wait.

### Per breakpoint

| Property | Mobile | Desktop |
|---|---|---|
| copy set | route-determined (table above) | same — identical at both widths |
| heading font-size | `19px` | `22px` |
| status font-size | `12px` | `13px` |
| caption font-size | `13.5px` | `15px` |
| container min-height | `420px` | `520px` |

No breakpoint split on copy. All longest headings (`Reading your collection`, 23ch) fit the existing `min-h` at 320px without changing the block's height.

### Voice check — for Design to confirm

The four new copy sets are Eng-written against the Kitchen Table voice already in `src/lib/copy/shell.ts` (whose header comment reads *"Do not paraphrase; the wink is load-bearing"*). `Setting the table`, `Consulting the council`, `Shuffling up` and `Clearing a space` are all table-side gerunds in the register of the existing `This is the boring part.` **Eng is not claiming authorship rights over these strings.** If Design wants to rewrite any of the four, it's a one-line change per route and no markup moves. The collection set is verbatim the locked copy.

**Stale rows if ratified:** `appshell.md:1980`, `:1991`, the caption row, and the mechanism sentence at `:2193`. The three type/spacing rows in each are correct and unchanged — only their `content` cells and the "one `app/loading.tsx`" framing go stale.

---

## Contrast — WCAG AA

Only Item 5 moves text, and it moves only the string, not the colour. Ratios are unchanged and recorded for completeness, all against `var(--bg)` `#14110E`:

| Element | Colour | Ratio | Verdict |
|---|---|---|---|
| Loading heading | `var(--fg)` `#EDE6D8` | **15.3:1** | AA / AAA ✅ |
| Loading status | `var(--fg-faint)` `#8E8269` | **4.9:1** | AA ✅ (AAA ✗ — pre-existing, mono 12–13px) |
| Loading caption | `var(--fg-body)` `#C6B79A` | **9.9:1** | AA / AAA ✅ |
| Section label (Item 1) | `var(--fg-faint)` `#8E8269` | **4.9:1** | AA ✅ — unchanged by a copy edit |

Item 3 introduces photographic art into a `aria-hidden` decorative column with no overlaid text — no ratio applies. Item 4 removes a `15.3:1` label; nothing takes its place, so there is nothing to measure.

## New tokens

**None required.** Every value in this addendum already exists in `src/app/globals.css`. Items 1, 2 and 5 are copy. Item 3 replaces a hard-coded gradient with a data URL and keeps the gradient as fallback. Item 4 deletes.

---

## READINESS

**🟠 ORANGE** — four of five items are clean, but Item 4 cannot ship as a styling decision.

| Item | Verdict |
|---|---|
| 1 — `Most complete deck` | 🟢 The label named the wrong entity. Correction. Ship. |
| 2 — General → Commander | 🟢 Correction to the format's actual noun. Ship. Ten design-table rows need Design to re-word at leisure; none block the code. |
| 3 — Real hero art | 🟢 The stripe was explicitly a placeholder-until-art; art landed and the stripe survives as fallback. Ship. One optional question on crop origin. |
| 4 — "Update collection" removed | 🟠 **A specified component was deleted.** Design must ratify the removal or commission a conditional replacement. Eng recommends ratify; will not rebuild the unconditional button either way without a handoff. |
| 5 — Per-route loading copy | 🟢 The single-heading spec was written before the router's fallback semantics were understood; the shared skeleton preserves every locked visual property. Ship. Four new copy strings are Design's to rewrite if the voice is off. |

No new tokens. No design-table edits made by Eng. The stale rows listed under Items 1, 2, 4 and 5 are Design's to update once these are ratified.

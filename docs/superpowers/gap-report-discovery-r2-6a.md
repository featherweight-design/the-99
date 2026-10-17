# Gap report · Discovery R2·6a · Reference tab and the creator's note (Agent 2)

Table: `docs/superpowers/design-tables/discovery-r2-6a-reference.md`. Implementation read at `135feb408`.
R = `src/components/about/reference/reference-tab.tsx`, F = `entry-frame.tsx`, N = `creator-note.tsx`, T = `src/components/ui/text-field.tsx`, I = `src/components/ui/search-icon.tsx`.

## PASS 1 · Visual properties

| # | Result |
|---|---|
| 1 | ✅ MATCH (`about-tabs.tsx:57`, `aboutShapeCopy.referenceSub`) |
| 2 | ✅ MATCH (R2·5, unchanged) |
| 3 | ✅ MATCH (R2·5, unchanged) |
| 4 | ✅ MATCH (inner column `gap-[12px]`; outer row only shows a second child from md, `gap-[48px] items-start`) |
| 5 | ✅ MATCH (`mt-[16px] px-[16px]` / `md:mt-[28px] md:px-0`; margin in place of padding-top, same placement) |
| 6 | ✅ MATCH (`min-w-0 flex-1 flex-col md:gap-[14px]`) |
| 7 | ✅ MATCH (`hidden md:flex` nav) |
| 8 | ✅ MATCH (search, what's new, screens, `how`, CreatorNote) |
| 9 | ✅ MATCH (label flex center gap 10) |
| 10 | ✅ MATCH (`h-[46px] px-[14px]`) |
| 11 | ✅ MATCH (border-strong; accent when `q`) |
| 12 | ✅ MATCH (`rounded-[10px]`, `--surface-sunken`) |
| 13 | ❌ MISMATCH — design: 16×16 both widths, stroke-width 1.6, `circle 8.5/8.5 r5.5`, `path M13 13l4.5 4.5` / implementation: shared `SearchIcon` 18 below md and 16 from md, stroke-width 1.7, `circle 8.4/8.4 r5.8`, `path M14 14L18 18` (I:10-25) |
| 14 | ✅ MATCH (`type="search"` default; placeholder and aria-label `referenceCopy.search`) |
| 15 | ✅ MATCH (`text-[15px]`, `--fg`, transparent/no border/outline, `min-w-0 flex-1`) |
| 16 | ❌ MISMATCH — design: only when the TRIMMED query is non-empty / implementation: shown whenever the value is non-empty, spaces included (T:130, 177), kept mounted with `visibility:hidden` |
| 17 | ❌ MISMATCH — design: 32×32, no background/border, ✕ 14 `--fg-faint` / implementation: 24×24, `rounded-full`, background `--border`, ✕ 12 `--fg-faint` (T:178); aria-label `referenceCopy.clear` ✅ |
| 18 | ✅ MATCH (`searchEntries`: title, caption, keys; How it works settled) |
| 19 | ✅ MATCH (`!q && whatsNew.length > 0`) |
| 20 | ✅ MATCH (`id="new"`) |
| 21 | ✅ MATCH |
| 22 | ✅ MATCH (`px-[18px] py-[16px]`, col, gap 10) |
| 23 | ✅ MATCH (`aboutCopy.newSinceEyebrow(n)`, uppercase) |
| 24 | ✅ MATCH |
| 25 | ✅ MATCH (eyebrow is the row's only child; layout has no visible effect) |
| 26 | ✅ MATCH |
| 27 | ✅ MATCH |
| 28 | ✅ MATCH |
| 29 | ✅ MATCH |
| 30 | ✅ MATCH (list wrapper `hidden={q !== ""}`; what's new gated on `!q`) |
| 31 | ✅ MATCH (`referenceCopy.hits(n, q)`) |
| 32 | ✅ MATCH (`pb-[4px] pt-[6px]` mono 12 `--fg-muted`) |
| 33 | ✅ MATCH |
| 34 | ❌ MISMATCH — design: 12 at 390, 14 at 1280 (the column gap) / implementation: hits wrapper `gap-[12px]` at every width (R:202) |
| 35 | ✅ MATCH |
| 36 | ✅ MATCH |
| 37 | ❌ MISMATCH — design: every hit draws a snippet line / implementation: a hit matched on its TITLE draws no snippet; the mark goes in the title instead (R:216-221) |
| 38 | ✅ MATCH |
| 39 | ✅ MATCH |
| 40 | ✅ MATCH |
| 41 | ✅ MATCH (`referenceCopy.none(q)`) |
| 42 | ✅ MATCH (`referenceCopy.noneNote`; wording settled) |
| 43 | ❌ MISMATCH — design: `a` / implementation: `button type="button"` (R:232). Behavior (clears, back to list) matches |
| 44 | ✅ MATCH (no underline at rest; `hover:underline` is an added hover state) |
| 45 | ✅ MATCH |
| 46 | ✅ MATCH |
| 47 | ✅ MATCH (button `md:hidden`; static `h2` head `hidden md:flex`) |
| 48 | ✅ MATCH |
| 49 | ✅ MATCH |
| 50 | ✅ MATCH (`{n} ⌄/⌃`; `{where} · referenceCopy.count(n)`) |
| 51 | ✅ MATCH |
| 52 | ✅ MATCH (open screens only below md; `md:block`). Drawn-open Shopping is a specimen state; none open by default |
| 53 | ✅ MATCH |
| 54 | ✅ MATCH |
| 55 | ✅ MATCH (desktop grid exact; mobile is a two-row grid, `gap-y-[3px]`, `min-h-[48px] py-[10px]`) |
| 56 | ✅ MATCH |
| 57 | ✅ MATCH |
| 58 | ✅ MATCH |
| 59 | ✅ MATCH (column kept, empty string) |
| 60 | ❌ MISMATCH — design 390: inline after the title, a space between / implementation: its own `auto`-sized grid column beside the title, `gap-x-[8px]`, so it never flows on the title's last line (R:90, 93). 1280 ✅ |
| 61 | ✅ MATCH |
| 62 | ✅ MATCH |
| 63 | ✅ MATCH |
| 64 | ✅ MATCH (F:11; adds `--bg` backing) |
| 65 | ❌ MISMATCH — design: `img` absolute inset 0, 100%×100%, `object-fit:cover` / implementation: `img` full width, `top`/`height` set as percentages by `frameWindow` to scroll a tall frame so the control sits in the 3:2 window, no `object-fit` (F:20-21). Alt ✅ (`referenceCopy.frameAlt`) |
| 66 | ❌ MISMATCH — design: no frame yet → the entry's specimen in the picture's place / implementation: `entry.shot && <EntryFrame>`; a null shot draws no picture at all (R:37; `entryShotFor` returns null, reference.ts:97) |
| 67 | ✅ MATCH |
| 68 | ✅ MATCH (percentages, re-based to the window) |
| 69 | ✅ MATCH (`color-mix` equivalents of accent/.75, accent/.2, bg/.28; radius 8) |
| 70 | ✅ MATCH |
| 71 | ✅ MATCH (`!text-[14px] !leading-[1.6]`, `--fg-body`; `p` margins zero by preflight) |
| 72 | ✅ MATCH |
| 73 | ✅ MATCH (`gap-x-[18px] gap-y-[10px] mt-[4px]`) |
| 74 | ✅ MATCH (`entry.tryIt`, from a Tools card) |
| 75 | ✅ MATCH (`showcaseCopy.tryOn(deck)` or the card's page label) |
| 76 | ✅ MATCH |
| 77 | ✅ MATCH |
| 78 | ✅ MATCH (`referenceCopy.reachesThis`, `#${entryRow[id]}`) |
| 79 | ✅ MATCH |
| 80 | ✅ MATCH |
| 81 | ✅ MATCH |
| 82 | ✅ MATCH |
| 83 | ✅ MATCH (IntersectionObserver picks current) |
| 84 | ✅ MATCH |
| 85 | ✅ MATCH |
| 86 | ✅ MATCH (`how` inside the hidden-on-query wrapper) |
| 87–93 | ✅ SETTLED (the shipped How it works component, passed in as `how`) |
| 94 | ✅ MATCH |
| 95 | ❌ MISMATCH — design: `a`, `padding:0 18px`, `min-height:56px` / implementation: `button`, `px-[18px] py-[8px]` (N:69). The 8px vertical padding lifts the row past 56 (two lines, ~45px of text + 16 = ~61) |
| 96 | ✅ MATCH |
| 97 | ✅ MATCH |
| 98 | ✅ MATCH |
| 99 | ✅ MATCH |
| 100 | ✅ MATCH (sheet below md, dialog from md, one DOM) |
| 101 | ✅ MATCH (`fixed` in the app where the board's frame is `absolute`) |
| 102 | ❌ MISMATCH — design: `section` with `aria-label` = title / implementation: `div` with `aria-labelledby` → the `h2` (N:23-28). Accessible name is the same |
| 103 | ✅ MATCH (`h-[min(700px,92dvh)] w-full` bottom; `md:w-[640px] md:h-[min(660px,90dvh)]` centered) |
| 104 | ✅ MATCH |
| 105 | ✅ MATCH |
| 106 | ✅ MATCH |
| 107 | ✅ MATCH |
| 108 | ✅ MATCH |
| 109 | ✅ MATCH |
| 110 | ✅ MATCH |
| 111 | ✅ MATCH |
| 112 | ❌ MISMATCH — design: `position:relative`, `padding:4px 16px 0` (`4px 28px 0` md) / implementation: not relative, `pb-[28px]` (N:45) |
| 113 | ✅ MATCH |
| 114 | ✅ MATCH |
| 115 | ✅ MATCH |
| 116 | ✅ MATCH |
| 117 | ❌ MISMATCH — design: bottom fade, absolute, height 70, `linear-gradient(transparent → --surface-rail)` / implementation: absent (N:45-53) |

## PASS 2 · State reachability

| State | Result |
|---|---|
| Default (list) | ✅ REACHABLE |
| Entry closed | ✅ REACHABLE |
| Entry open | ✅ REACHABLE (one `openId`; `#id` links open it) |
| Screen row closed (390) | ✅ REACHABLE |
| Screen row open (390) | ✅ REACHABLE |
| 1280 screens | ✅ REACHABLE |
| Search with hits | ✅ REACHABLE (snippet caveat, gap 4) |
| Search with none | ✅ REACHABLE |
| What's new present | ✅ REACHABLE in the component (`whatsNew` prop); its source is R2·6b's visit (settled) |
| What's new absent | ✅ REACHABLE |
| Arrived from banner | ⚠️ PARTIALLY REACHABLE — settled: the tab is unmounted until R2·6b. Note `follow()` does not handle `#new` (it is not an entry id); landing on it relies on the browser's own hash scroll |
| Opened entry with a frame | ✅ REACHABLE (`entryShotFor`) |
| Opened entry without a frame | ❌ NOT REACHABLE — a null shot renders no picture; no specimen fallback (R:37) |
| With halo | ✅ REACHABLE |
| Without halo | ✅ REACHABLE (`halo: null`, top of the frame) |
| With Try it | ✅ REACHABLE |
| Without Try it | ✅ REACHABLE (actions row holds only the How link; row omitted when neither) |
| With How-it-works link | ✅ REACHABLE (`entryRow`) |
| Without How-it-works link | ✅ (not specified; link omitted) |
| `in Tools` mark | ✅ REACHABLE (placement caveat, gap 6) |
| Index current screen | ✅ REACHABLE |
| Note dialog (md+) | ✅ REACHABLE |
| Note sheet (< md) | ✅ REACHABLE |

## Gap list

### Visual gaps
1. `src/components/ui/search-icon.tsx:10-25` (via T:146) — Search icon — design: 16 both widths, stroke 1.6, circle 8.5/8.5 r5.5, path `M13 13l4.5 4.5` → impl: 18 phone / 16 md, stroke 1.7, circle 8.4/8.4 r5.8, path `M14 14L18 18` (shared icon; at least the phone size differs)
2. `src/components/ui/text-field.tsx:178` — Clear ✕ — design: 32×32, no bg/border, ✕ 14 → impl: 24×24 round, bg `--border`, ✕ 12
3. `src/components/ui/text-field.tsx:130` — Clear ✕ rendered — design: trimmed query non-empty → impl: any non-empty value (spaces included)
4. `reference-tab.tsx:202` — Hits gap — design: 14 at 1280 → impl: 12 at every width
5. `reference-tab.tsx:216-221` — Hit snippet — design: every hit → impl: none on a title match
6. `reference-tab.tsx:232` — See every entry — design: `a` → impl: `button`
7. `reference-tab.tsx:90,93` — `in Tools` mark at 390 — design: inline after the title, a space → impl: own grid column, 8px gap
8. `entry-frame.tsx:20-21` — Picture `img` — design: inset 0, 100%×100%, `object-fit:cover` → impl: `frameWindow` top/height offsets, no `object-fit` (likely a deliberate adaptation for tall frames; needs a settled line if kept)
9. `creator-note.tsx:69` — Note row — design: `a`, `padding:0 18px` → impl: `button`, `py-[8px] px-[18px]` (row taller than 56)
10. `creator-note.tsx:23-28` — Note surface — design: `section` `aria-label` → impl: `div` `aria-labelledby` (same name)
11. `creator-note.tsx:45` — Note body — design: `position:relative`, padding-bottom 0 → impl: not relative, `pb-[28px]`
12. `creator-note.tsx:45-53` — Bottom fade — design: 70px gradient to `--surface-rail` → impl: absent

### State reachability gaps
1. Opened entry without a frame — no specimen fallback; a null `shot` draws no picture — `reference-tab.tsx:37` (gap 9: "until the last capture lands an entry keeps its specimen")

## Copy items (route to /copy-review; not gaps)
- None found. Keys and arguments match the table everywhere (`referenceSub`, `newSinceEyebrow(n)`, `hits(n, q)`, `none(q)`, `noneNote` (settled), `noneOut`, `count(n)`, `screensLabel`, `howIndex`, `reachesThis`, `frameAlt(title, screen)`, `creatorNoteCopy.title/row/close`, `aboutCopy.pageIntro`).

VERDICT: 12 visual gaps, 1 state gap

## Agent 3 — confirmation

- 4, gap between search results: FIXED. Design 12 at 390 / 14 at 1280 (row 34); implementation `gap-[12px] md:gap-[14px]` on `[data-reference-hits]`.
- 5, result snippet: FIXED. Every hit renders the 13.5 `--fg-muted` snippet line; a title match shows the entry's `first` (its caption's first sentence), any other match shows the marked span.
- 6, "See every entry": FIXED. An `a` whose click prevents default and clears the query, returning to the list.
- 7, `in Tools` mark: FIXED. At 390 an inline span after the title with a leading space (`md:hidden`); at 1280 its own 56px grid column (`md:grid-cols-[300px_minmax(0,1fr)_56px_16px]`, area `mark`); mono 10.5 `--accent` at both.
- 9, note row: FIXED. `min-h-[56px] px-[18px] py-0` (element stays a `button`, settled).
- 11, note body: FIXED. `relative`, with `pb-[70px]` (settled).
- 12, bottom fade: FIXED. `absolute inset-x-0 bottom-0 h-[70px] bg-[linear-gradient(transparent,var(--surface-rail))]`.

VERDICT: all 7 re-checked items FIXED.

## Second pass: the settled items, fixed (the mocks win)

Re-checked against the standing rule that a mismatch is a defect unless a LATER Design decision supersedes the mock.
The handoff (#1927, 2026-10-16) post-dates every earlier decision these items leaned on, so each is fixed:

- 1, the magnifier: 16px at both widths (`SearchIcon size={16}` as the field's `leading`).
- 2, the clear ✕: 32×32, no background or border, ✕ at 14 (`SearchField`'s new `clearClassName`).
- 3, when the ✕ shows: only for a trimmed query with text (`SearchField`'s new `clearTrimmed`).
- 8, the picture: fills the box (`inset: 0`, 100%×100%, `object-fit: cover`); `frameWindow`'s `position` is its
  `object-position` y, so the entry's control stays in view.
- 9, the note row: an `a` (`href="#creator-note"`, opening the note), `padding: 0 18px`, 56 tall.
- 10, the note: a `section role="dialog"` named by `aria-label`.

## Settled (not changed)

- 1, the magnifier's drawing (stroke 1.6, circle 8.5/8.5 r5.5, path `M13 13l4.5 4.5` in the mock): the app draws ONE
  magnifier, `SearchIcon`, redrawn in #1660 because the drawing the mock carries puts the handle inside the lens's
  stroke and reads as one smear at small sizes. The mock's geometry is that pre-#1660 drawing; the size is matched.
  Source: #1660, Hugh's bug batch A item 1, the later decision (orchestrator's ruling, 2026-10-17).
- State "opened entry with no frame": unreachable. Every screen has a frame in every theme (`shots.test.ts` fails
  otherwise) and every entry is placed on its frame (the locator PR, R2·6a-2); the specimens retire in R2·7
  (readiness R2 gap 9).

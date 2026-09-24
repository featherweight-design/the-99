# Design Property Table: Deck Tuning D2 (header intent line, Games pointer)

**Scope:** two elements.
- **The deck-header intent line (E2 / E2b).** Covers the set, app-seeded and absent states, the `edit` affordance, and the header order around the line.
- **The Games-tab pointer line (C1 / C2).** Covers the pointer and the `note.readBack` amendment.

**Sources (design only).** Paths are relative to `design/design_handoff_the99_deck_tuning/`.

| Key | File |
|---|---|
| V2 | `The 99 - Deck Tuning · Placement Addendum v2.dc.html` (r3 section E; uses real token names) |
| V1 | `The 99 - Deck Tuning · Placement Addendum.dc.html` (r1; the only drawing of the Games line) |
| OC | `The 99 - Deck Tuning.dc.html` (the base canvas, raw hexes; the only drawing of the seeded state) |
| R | `README.md` (r1 `:3-69`, r3 `:95-108`, base `:112+`) |
| IW | `INTENT-where-it-lives.md` |
| CS | `deck-tuning · copy strings.ts` |
| ST | `STATES-tuning-panel.md` |
| RA | `READINESS-addendum-audit.md` |
| R3A | `READINESS-r3-audit.md` |

**Precedence:** Hugh's rulings > r3 > r2 > r1 > base.
- r3 (V2 E2/E2b, R:103) governs the set line's position, type and ink.
- The seeded state is drawn only in OC surface 3, state 4 (OC:358-376). R:387 and V2:165 carry it forward.
- OC hexes are mapped to tokens by R:386-387, not by eye. For example, OC `#4A4033` underline becomes `--border-strong` (R:386, V2:141). On V2's palette, `#4A4033` is `--fg-disabled`, so the hex is ignored.

**Breakpoint:** `md:` (768px). **Fonts:** "display" = `var(--display)` = `font-display`; "mono" = IBM Plex Mono; unlabelled = IBM Plex Sans.

**Copy:** strings are listed for identification only. Content belongs to `/copy-review`.

---

## 1. Intent line: the header order

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Row order | deck name → **intent** → pips + commander · colour → chips row → progress bar | same | V2:163, R:103, R3A:13 |
| Intent's position | second, directly under the deck name | same | V2:163 |
| Tabs | on every tab once it exists | same | IW:5, R:166 |
| Header files (engineering note) | `spine-mobile.tsx` | `spine-desktop.tsx` | R3A:31-33 |
| Name row above (context only) | display 700 19px `--fg`, ✎ 13px `--fg-muted`, gap 6px | display 700 21px/1.2 `--fg`, ✎ 14px `--fg-muted`, gap 6px | V2:153, V2:140 |
| Header column (context only) | `padding:14px 16px 16px`, flex column | absolute `left:440px; right:24px; bottom:18px`, flex column | V2:152, V2:139 |

## 2. Intent line: set, player-written (state 3)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Row: display | `flex` | `flex` | V2:154 / V2:141 |
| Row: align-items | `baseline` | `baseline` | V2:154 / V2:141 |
| Row: gap | 8px | 8px | V2:154 / V2:141 |
| Row: margin-top (below name) | **5px** | **4px** | V2:154 / V2:141 |
| Row: flex-wrap | not set in V2 (OC:350 used `wrap`) | not set in V2 | V2:154, V2:141; OC:350 |
| Commander line below: margin-top | 6px (unchanged) | 6px | V2:155 / V2:142 |
| **Sentence** |  |  |  |
| font-family | Plex Sans | Plex Sans | V2:154 / V2:141 |
| font-size | **12.5px** | **14px** | V2:154 / V2:141, V2:164, R:103 |
| line-height | **1.5** | **1.45** | V2:154 / V2:141 |
| font-weight | not set (400) | not set (400) | V2 |
| color | `var(--fg-body)` | `var(--fg-body)` | V2:154 / V2:141, R:386 |
| Underline | `border-bottom: 1px dashed var(--border-strong)` | same | V2:154 / V2:141, R:386 |
| Wrapping | wraps and never truncates (no ellipsis, no clamp) | same | V2:164, R:103, R3A:13 |
| Max length | 120 chars, one line of input, plain text (no markdown) | same | V2:164, IW:93, CS `maxLength: 120` |
| Role | body ink, not a heading | same | IW:18-20, V2:164 |
| Copy element | the player's intent sentence (canvas: "Grind a four-person table out and win late with Gisa.") | same | V2:154/141 |
| **`edit` affordance** |  |  |  |
| font-family | mono | mono | V2:154 / V2:141 |
| font-size | 10px | 10px | V2:154 / V2:141, R:386 |
| color | `var(--fg-locked)` | `var(--fg-locked)` | V2:154 / V2:141 |
| flex | `flex: none` | not set | V2:154 / V2:141 |
| Placement | inline after the sentence, same baseline, gap 8px | same | V2:154 / V2:141 |
| Copy element | `edit` label + aria label (`editAria`) | same | CS `edit`, `editAria` |
| Pattern | the shipped dashed-underline edit-in-place affordance, the same one `played tonight` uses in the log form | same | IW:18-19, R:167, OC:356 |
| Hover / focus | — (not drawn) | — | — |
| Tap target size | — (not specified) | — | — |

## 3. Intent line: app-seeded (state 4)

This state is drawn only in OC, at one width (a 900px frame), before the r3 re-slotting. V2:165 says it goes "on this same line", in the r3 position.

| Property | Value (both widths unless noted) | Source |
|---|---|---|
| Row content order | provenance disc → sentence → `from the build` chip → `edit` | OC:365-368, IW:59 |
| Row | flex, `align-items: baseline`, gap 10px, `flex-wrap: wrap` (OC geometry; V2 set-state gap is 8px) | OC:364 |
| **Provenance disc** | "the shipped 18px provenance disc" | IW:64, R:183, R:387 |
| Disc: size | 18×18px, `flex: none`, border-radius 999px | OC:365 |
| Disc: border | 1.5px solid brass (OC `#C9A24B` = `--accent`) | OC:365 |
| Disc: glyph | display 700 10px, brass, centred (flex center) | OC:365 |
| **Sentence** | same as state 3 (OC: 14px, `--fg-body`, lh 1.55, 1px dashed underline); r3 values in §2 govern | OC:366, V2:165 |
| **`from the build` chip** |  |  |
| font | mono 10px, `letter-spacing: 0.1em`, `text-transform: uppercase` | OC:367, R:387 |
| color | brass (`--accent`) | OC:367, R:387 |
| background | `--accent` at 12% (OC `rgba(201,162,75,0.12)`) | OC:367, R:387 |
| radius | 999px | OC:367 |
| padding | 2px 9px | OC:367 |
| border | — (none drawn) | OC:367 |
| Copy element | chip label (`seeded`) + aria label (`seededAria`) | CS `seeded`, `seededAria` |
| **`edit`** | mono 10px, `--fg-locked` (OC `#6A6152`) | OC:368 |
| Chip lifecycle | removed **permanently** the first time the player edits the line; does not return on re-import; no "edited" chip | IW:67-69, R:185, CS comment |

## 4. Editing the intent (the header's `edit`)

| Property | Value | Source |
|---|---|---|
| Entry points | two (the panel ask and the header's `edit`), writing to one field, one string and one column (`decks.intent`) | IW:46-47, R:178 |
| Where the header edit opens | — **not drawn** in any file | (open) |
| Field constraints | ≤120 chars, one line, plain text, nullable; quoted verbatim to the model and never parsed | R:404-405, IW:93 |
| Save announcement (live region) | "Deck intent saved." (`announce.intentSaved`) | ST:116, CS:308 |
| Edit on a seeded line | removes the `from the build` chip permanently | IW:67 |

## 5. Intent line: absent (states 1 and 2)

| Property | Value | Source |
|---|---|---|
| Row renders | **no**: no line, no dashed placeholder, no `+ add a description`, no grey italic prompt | IW:29-30, V2:165, R:170-171 |
| Rows below | the commander line moves up (no reserved space) | V2:165 |
| Where the ask lives | in the tuning panel on the Analysis tab, above the primary (D1's scope, not D2's) | V2:166, IW:32-44 |

## 6. Games-tab pointer line

Drawn only in V1 C1/C2 (V1:236-256), in r1. RA finding 9 says this frame should be composed from r1, not redrawn.

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Position | after `GameFindings`, before History | same | V1:237-242 / V1:246-250, R:61 |
| Container: display | `flex`, `align-items: center` | same | V1:247 / V1:239 |
| Container: min-height | 44px | 44px | V1:247 / V1:239, R:61 |
| Container: margin-top (from GameFindings) | **10px** | **14px** | V1:247 / V1:239 |
| History label: margin-top (below the line) | 10px | 12px | V1:250 / V1:242 |
| **Sentence** |  |  |  |
| font | Plex Sans 13px | Plex Sans 13px | V1:248 / V1:240 |
| line-height | 1.5 | not set | V1:248 / V1:240 |
| color | `var(--fg-body)` | `var(--fg-body)` | V1:248 / V1:240 |
| Copy element | pointer sentence (`gamesLine`, canvas: "Suggested changes reads these games.") | same | V1:286 |
| **Link** (inline, after a space) |  |  |  |
| font-weight | 600 | 600 | V1:248 / V1:240 |
| color | `var(--accent)` | `var(--accent)` | V1:248 / V1:240 |
| Underline | — (none drawn) | — | V1 |
| Copy element | link text (`gamesLink`, canvas: "It is on the Analysis tab →", arrow included in the string) | same | V1:287 |
| Action | `setView('analysis')`, as the header chip does; the tab has no URL | same | V1:254, R:62-63 |
| Hover / focus | — (not drawn) | — | — |
| Tap target | 44px row min-height (the only size given) | same | V1:247/239 |
| Wiring (eng) | `GamesPanel` gains `hasReading` + `onOpenAnalysis` | same | RA:107 |

## 7. `note.readBack` amendment

| Property | Value | Source |
|---|---|---|
| Change | the shipped `readBack` string gains the held clause, canvas wording "and read by Suggested changes" | V1:256, R:64, RA:107 |
| Structure | a clause appended to the existing readBack; no other string drawn | V1:256 |
| Visual treatment | — (not drawn; the shipped read-back styling is unchanged) | — |
| Copy route | new copy, goes to `/copy-review`; no em dash | R:68 |

---

## State coverage

| State | Triggering condition (data) | What renders |
|---|---|---|
| Intent absent | `decks.intent` null / empty | No intent row at either width. The commander line sits directly under the name (V2:165, IW:29) |
| Intent set (player-written) | `decks.intent` non-null, not seeded (or seeded then edited) | Sentence (14px desktop / 12.5px phone, `--fg-body`, dashed `--border-strong` underline) + mono 10px `--fg-locked` `edit`, second in the header, on every tab (V2:141/154) |
| Intent app-seeded | `decks.intent` non-null, written by the app's build and never edited by the player (seeded flag true) | 18px provenance disc + sentence + brass `from the build` chip + `edit` on the same line (OC:364-368, V2:165) |
| Seeded, then edited | seeded flag cleared by the first player edit | Renders as "set"; the chip never returns, including after a later re-import (IW:67-69) |
| Long intent | length up to 120 | Wraps across lines; never truncated (V2:164) |
| Header edit pressed | user activates `edit` | Opens the single intent field; **placement is not drawn** (IW:46) |
| Intent saved | save succeeds | Live region: "Deck intent saved." (ST:116) |
| Games: no reading | deck has no stored bracket reading | No pointer line ("Before a reading the panel does not exist to point at") (V1:255, R:63) |
| Games: reading, 0 games | reading exists, games count = 0 | No pointer line; the shipped no-games empty state is unchanged (V1:255) |
| Games: reading, ≥ 1 game | reading exists and games count ≥ 1 | Pointer line after GameFindings, before History, 44px min-height (V1:239/247, R:61-63) |
| Link pressed | user activates the pointer link | `setView('analysis')`; no navigation or URL (V1:254) |

## Gaps (not specified in any design file)
- Where or how the header `edit` opens the intent field (inline vs. elsewhere). Only "one field, two entry points" is stated.
- Hover and focus states for the intent `edit` and for the Games link.
- Tap-target size for the intent `edit` (a 10px mono label; no hit area is drawn).
- The seeded state at r3 geometry. It is drawn only on OC's pre-r3 900px frame, at no phone width, and phone wrapping of the disc and chip is not drawn.
- The disc's glyph. OC draws an "i", but the handoff calls it "the shipped provenance disc", so the shipped component governs.
- `flex-wrap` on the r3 intent row. It is absent in V2 and set to `wrap` in OC.

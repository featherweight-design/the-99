# Design Property Table — Deck Tuning Addendum (PR D1)

**Scope:** `TuningPanel` (every state), `SuggestionCard` (open card, answered rows, no longer applies,
bracket flag, citation chips, availability marks and buy tag, thumbnails, name triggers),
`ManifestRows` (with the dashed no-games row), the in-panel intent ask (`DeckIntentAsk`), the
animated fan (`FanShuffle`), and the mount on the Analysis tab. The deck-header intent line and the
Games-tab pointer line are PR D2 and are listed only under **Deferred to D2**.

**Sources (design only).** Paths are relative to `design/design_handoff_the99_deck_tuning/`.

| Key | File |
|---|---|
| V2 | `The 99 - Deck Tuning · Placement Addendum v2.dc.html` (the current canvas; tokens are real names) |
| V1 | `The 99 - Deck Tuning · Placement Addendum.dc.html` (r1; history, used only where V2 does not redraw) |
| OC | `The 99 - Deck Tuning.dc.html` (original canvas; raw hexes, mapped to tokens by `deck-tuning.md`) |
| R | `README.md` (r1 `:3-69`, r2 `:71-93`, r3 `:95-108`, base `:112+`) |
| ST | `STATES-tuning-panel.md` |
| IW | `INTENT-where-it-lives.md` |
| RA | `READINESS-addendum-audit.md` |
| R3A | `READINESS-r3-audit.md` |
| DT | `docs/superpowers/design-tables/deck-tuning.md` (the base table; superseded wherever V2 differs) |

**Precedence:** Hugh's rulings > r3 > r2 > r1 > base. The rulings that override the canvas:

1. **Up to five swaps** per run (RA ruling 2).
2. **Credit line** reads `{n} of {total} left · reset at {time}`, rolling 24 hours, `{time}` in
   **12-hour** form (`2:20 PM`), via the app's time formatting (RA ruling 5, R3A note 2). Every
   calendar string on the canvas (`left today`, `00:00 UTC`, `14:20`) is superseded.
3. **Bracket flag** uses the shipped `BracketChip` with `permits={bracketAfter}`; compare the
   **lowest** bracket of each set: higher → *raises*, lower → *lowers*, equal lowest with a
   different set → *changes* (R3A note 1).
4. **r2 removed** the consequence line, the ownership atoms (`×1 owned` / `not owned`), the
   price-only atom, the applied verdict and the shopping clause (R:80-82).
5. **Primaries are brass OUTLINE**, never brass solid (V2:225, 295, 442; OC:449 and DT:734 superseded).
6. No `backLabel` on the CardModal opened from a card (RA finding 11, R:92-93); V2:405's
   `← Suggested changes` pill is not built.

**Breakpoint:** `md:` (768px), as the base table. Columns are **390** (phone) and **1300** (desktop).

**Fonts:** "display" = `var(--display)` on the canvas = the app's `font-display`
(`--font-display-face`). "mono" = IBM Plex Mono (`var(--font-plex-mono)`). Unlabelled = IBM Plex Sans
(body default).

Copy strings are recorded for identification only; copy content is `/copy-review`'s, not this table's.

---

## Component: Mount (Analysis tab)

### Tab body

| Property | 390 | 1300 | Source |
|---|---|---|---|
| position of panel | last child: banner · Overview · bracket box · climb · findings · mix · **Suggested changes** | same | R:28, R:66 |
| padding | 18px 16px 32px | 24px 30px 40px | V2:313 / V2:258 |
| display | flex column | flex column | V2:313 / V2:258 |
| gap | 16px | 24px | V2:313 / V2:258 |
| HoverPreviewProvider | one, around the tab body | one, around the tab body | V2:392, RA "What PR D must build" 1 |

### Panel wrapper

| Property | 390 | 1300 | Source |
|---|---|---|---|
| border-top | 1px solid var(--border) | 1px solid var(--border) | V2:315 / V2:260 |
| padding-top | 18px | 24px | V2:315 / V2:260 |

### Mount condition

| Condition | Renders | Source |
|---|---|---|
| a reading exists (fresh or stale) | panel mounts | R:42, RA ruling 6 |
| no reading | panel absent (no placeholder) | RA ruling 6 |
| reading is stale | panel unchanged: never dimmed, tagged or hidden | R:40 |
| `ANALYSIS_TAB_ENABLED` off | panel absent (no Analysis tab) | RA ruling 6, finding 14 |
| an applied swap | panel stays mounted mid-write (no unmount on the edit) | RA finding 2 |

---

## Component: TuningPanel

### Container `<section>` (accessible name = heading)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | var(--surface-sunken) | var(--surface-sunken) | V2:316 / V2:261 |
| border | 1px solid var(--border) | 1px solid var(--border) | V2:316 / V2:261 |
| border-radius | 11px | 12px | V2:316 / V2:261 |
| padding | 16px 14px | 18px 20px | V2:316, 173 / V2:261, 429 |
| display | block (children stacked by margin) | block | V2:173 / V2:429 |

#### Container — loading

| Property | 390 | 1300 | Source |
|---|---|---|---|
| border | 1px solid var(--accent) | 1px solid var(--accent) | V2:550 / V2:450 |
| aria-busy | true | true | V2:550 / V2:450 |

### Heading "Suggested changes"

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | display (`font-display`) | display | V2:317 / V2:262 |
| font-weight | 600 | 600 | V2:317 / V2:262 |
| font-size | 17px | 19px | V2:317 / V2:262 |
| color | var(--fg) | var(--fg) | V2:317 / V2:262 |
| icon / count / colour change | — (never) | — (never) | R:210 |
| focus target | receives focus when results land | same | DT:780 |

### Read line (collapsed manifest)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | V2:318 / V2:263 |
| font-size | 9.5px | 10.5px | V2:318 / V2:263 |
| color | var(--fg-faint) | var(--fg-faint) | V2:318 / V2:263 |
| margin-top | 8px | 9px | V2:318 / V2:263 |
| line-height | 1.5 | — | V2:318 |
| parts separator | ` · ` | ` · ` | V2:263 |
| with games, parts | `{n} games` · `{m} game notes` · `{cards} cards` · `your collection` | same | V2:263, R:88 |
| no games, parts | `{cards} cards` · `the recommended mix` · `your collection` · `no games logged` | same | V2:625 |
| "no games logged" part color | var(--fg-body) | var(--fg-body) | V2:625 |
| shown in states | results, part-answered, credits spent (with a body) | same; **not** in never-run, loading, all-answered, retired | V2:263, 479, 579 / absent V2:429, 503, 531 |

### Lead paragraph

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 12.5px | 13.5px | V2:175 / V2:264, 431 |
| line-height | 1.6 | 1.65 | V2:175 / V2:264 |
| color | var(--fg-body) | var(--fg-body) | V2:175 / V2:264 |
| margin-top | 10px | 11px | V2:175 / V2:264 |
| max-width | — | 680px on results (A1); none in C frames | V2:264 / V2:431 |
| results lead | **omitted** (read line → cards) | drawn (full set) | V2:318-319 / V2:264 |
| results lead, no-games results (D2) | omitted | **omitted** (read line → cards) | V2:625-626 |

### Card list (results)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex column | flex column | V2:319 / V2:265 |
| gap | 12px | 8px | V2:319 / V2:265 |
| margin-top | 14px | 14px | V2:319 / V2:265 |
| max items | 5 | 5 | RA ruling 2 |
| padding to five | never | never | R:78 |
| slot order after answers | unchanged; answered cards collapse in place | same | V2:480-492, R:85 |

### Answered-row list (all answered, C4)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex column | flex column | V2:506 |
| gap | not drawn | 6px | V2:506 |
| margin-top | not drawn | 14px | V2:506 |
| order | applied rows, then rejected rows | same | V2:507-519 |

### Action row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | V2:190, 353 / V2:224, 294, 441 |
| flex-direction | column | row | V2:190 / V2:441 |
| align-items | stretch | center | V2:190 / V2:441 |
| gap | 9px | 16px (12px while loading) | V2:190 / V2:441, 468 |
| flex-wrap | — | wrap | V2:441 |
| margin-top | 16px | 18px | V2:190 / V2:441 |
| padding-top | 15px | 16px | V2:190 / V2:441 |
| border-top | 1px solid var(--border) | 1px solid var(--border) | V2:190 / V2:441 |
| min-height | — | 56px | V2:441 |
| order | primary, then note | primary first, then note | V2:191-192 / V2:442-443 |
| primaries per state | exactly one | exactly one | V2:441 |

### Primary button — enabled (brass outline)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-weight | 600 | 600 | V2:191 / V2:442 |
| font-size | 13.5px | 14px | V2:191 / V2:442 |
| color | var(--accent) | var(--accent) | V2:191 / V2:442 |
| background | — (transparent) | — (transparent) | V2:442 |
| border | 1px solid var(--accent) | 1px solid var(--accent) | V2:191 / V2:442 |
| border-radius | 8px | 8px | V2:191 / V2:442 |
| padding | — (centred in fixed height) | 11px 20px | V2:442 |
| height | 44px | — (from padding) | V2:191 |
| width | full width | auto | V2:191 |
| display / align / justify | flex, center, center | inline | V2:191 |
| label: never run / retired | "Suggest changes" | "Suggest changes" | V2:191 / V2:442, 535 |
| label: results / part / all answered / spent | "Suggest again" | "Suggest again" | V2:354 / V2:295, 495, 522 |
| label: unchanged | not drawn at 390 | "Suggest again anyway" | OC:799 |

### Primary button — disabled (credits spent)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| color | var(--fg-disabled) | var(--fg-disabled) | V2:204 / V2:583 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) | V2:204 / V2:583 |
| aria-disabled | true | true | V2:204 / V2:583 |
| other geometry | as enabled | as enabled | V2:204 / V2:583 |
| `--danger` / error / tag | — | — | V2:583, R:108 |

### Note beside / under the primary (credit line)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | V2:192 / V2:443 |
| font-size | 9.5px | 11px | V2:192 / V2:443 |
| color | var(--fg-faint) | var(--fg-faint) | V2:192 / V2:443 |
| text-align | center | left | V2:192 |
| line-height | 1.55 | — (1.5 in spent state) | V2:192 / V2:584 |
| max-width | — | 380px in spent state only | V2:584 |
| wrap | may wrap | may wrap | V2:496 |
| never-run form | "Uses a credit. {n} of {total} left · reset at {time}." | same | V2:740 (ruling 2) |
| again form | "Replaces these suggestions and uses a credit. {n} of {total} left · reset at {time}." (proposed, undrawn) | same | V2:755 + R:108 (ruling 2) |
| spent form | "0 of {total} left · reset at {time} · What uses credits?" (the phrase links to About `credits`; Hugh, 2026-10-12, link, never list) | same | V2:741, superseded |
| part-answered form | "{applied} of {total} applied · {rejected} rejected · {again form}" | same | V2:496, R:85 |
| {time} | 12-hour (`2:20 PM`) | 12-hour | R3A note 2 |
| all credits available | no "next one" time exists; not drawn | not drawn | spec §9.1 |

---

### Loading head (state S-D)

#### Head wrapper

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | V2:552 / V2:452 |
| flex-direction | column | row | V2:552 / V2:452 |
| align-items | center | center | V2:552 / V2:452 |
| gap | 10px | 20px | V2:552 / V2:452 |
| margin-top | 14px | 12px | V2:552 / V2:452 |
| text-align | center | — | V2:552 |
| children | fan, heading, lead | fan, then text column | V2:553-555 / V2:453-457 |

#### Text column (1300 only)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| flex | — | 1 | V2:454 |
| min-width | — | 0 | V2:454 |
| display | — | flex column | V2:454 |
| gap | — | 6px | V2:454 |

#### Loading heading "Shuffling through your deck…"

| Property | 390 | 1300 | Source |
|---|---|---|---|
| role | status (the live region) | status | V2:554 / V2:455 |
| font-family | display | display | V2:554 / V2:455 |
| font-weight | 600 | 600 | V2:554 / V2:455 |
| font-size | 15px | 16px | V2:554 / V2:455 |
| color | var(--fg) | var(--fg) | V2:554 / V2:455 |

#### Loading lead

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 12.5px | 13.5px | V2:555 / V2:456 |
| line-height | 1.55 | 1.6 | V2:555 / V2:456 |
| color | var(--fg-body) | var(--fg-body) | V2:555 / V2:456 |

#### Loading manifest list

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex column | flex column | V2:557 / V2:458 |
| gap | 6px | 6px | V2:557 / V2:458 |
| margin-top | 14px | 14px | V2:557 / V2:458 |

#### Loading action row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex row | flex row | V2:565 / V2:468 |
| gap | 8px | 12px | V2:565 / V2:468 |
| margin-top | 16px | 18px | V2:565 / V2:468 |
| padding-top | 15px | 16px | V2:565 / V2:468 |
| border-top | 1px solid var(--border) | 1px solid var(--border) | V2:565 / V2:468 |
| min-height | — | 56px | V2:468 |
| flex-wrap | — | wrap | V2:468 |

#### "Reading…" (non-interactive)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-weight | 600 | 600 | V2:566 / V2:469 |
| font-size | 13.5px | 14px | V2:566 / V2:469 |
| color | var(--fg-muted) | var(--fg-muted) | V2:566 / V2:469 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) | V2:566 / V2:469 |
| border-radius | 8px | 8px | V2:566 / V2:469 |
| padding | — | 11px 20px | V2:469 |
| height | 44px | — | V2:566 |
| flex | 2 | — | V2:566 |
| align / justify | center / center | — | V2:566 |

#### "Stop"

> **Removed 2026-10-12** (Hugh): Suggested changes no longer draws Stop. The server finishes every run in `after()` and the panel polls, so a read always runs to its end. The rows below are kept as the record of what shipped.

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-weight | 500 | 500 | V2:567 / V2:470 |
| font-size | 13px | 13px | V2:567 / V2:470 |
| color | var(--fg-muted) | var(--fg-muted) | V2:567 / V2:470 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) | V2:567 / V2:470 |
| border-radius | 8px | 8px | V2:567 / V2:470 |
| padding | — | 10px 14px | V2:470 |
| height | 44px | — | V2:567 |
| flex | 1 | — | V2:567 |
| behaviour | returns to never-run, manifest unchecked, no error, no tag; refunded | same | ST:44, R:91 |

#### Progress "{done} of {total} read"

| Property | 390 | 1300 | Source |
|---|---|---|---|
| placement | own line below the action row | inline in the action row, after Stop | V2:570 / V2:471 |
| font-family | mono | mono | V2:570 / V2:471 |
| font-size | 9.5px | 11px | V2:570 / V2:471 |
| color | var(--fg-faint) | var(--fg-faint) | V2:570 / V2:471 |
| text-align | center | — | V2:570 |
| margin-top | 8px | — | V2:570 |
| total | rows read (5 with intent; no-games total not drawn) | same | DT:538 |

---

### Unchanged state (S-I; OC state 5, 1300 only, not redrawn in V2)

#### Unchanged lead

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | not drawn | 13.5px | OC:788 |
| color | not drawn | var(--fg-body) | OC:788 |
| line-height | not drawn | 1.65 | OC:788 |
| margin-top | not drawn | 12px | OC:788 |
| max-width | not drawn | 640px | OC:788 |
| first sentence | not drawn | var(--fg), weight 600 | OC:788 |

#### Reason list

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | not drawn | flex column | OC:789 |
| gap | not drawn | 6px | OC:789 |
| margin-top | not drawn | 14px | OC:789 |
| max-width | not drawn | 640px | OC:789 |

#### Reason row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | not drawn | flex | OC:791 |
| align-items | not drawn | baseline | OC:791 |
| gap | not drawn | 11px | OC:791 |
| min-height | not drawn | 34px | OC:791 |
| background | not drawn | var(--surface) | OC:791 |
| border | not drawn | 1px solid var(--border) | OC:791 |
| border-radius | not drawn | 8px | OC:791 |
| padding | not drawn | 8px 12px | OC:791 |
| rows | not drawn | games / weakest axis / this deck is for | OC:790-795, DT:645-668 |

#### Reason key

| Property | 390 | 1300 | Source |
|---|---|---|---|
| width | not drawn | 98px, flex none | OC:792 |
| font-family | not drawn | mono | OC:792 |
| font-size | not drawn | 10px | OC:792 |
| letter-spacing | not drawn | 0.1em | OC:792 |
| text-transform | not drawn | uppercase | OC:792 |
| color | not drawn | var(--fg-locked) | OC:792 |

#### Reason value

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | not drawn | mono | OC:793 |
| font-size | not drawn | 11px | OC:793 |
| color | not drawn | var(--fg-muted) | OC:793 |
| flex / min-width | not drawn | auto / 0 | OC:793 |

#### Unchanged tail

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | not drawn | 13px | OC:797 |
| color | not drawn | var(--fg-faint) | OC:797 |
| line-height | not drawn | 1.6 | OC:797 |
| margin-top | not drawn | 12px | OC:797 |
| max-width | not drawn | 640px | OC:797 |
| `--danger` anywhere | — | — | DT:645-668 |

---

### Failure block (S-J; OC state 6, classes 6a–6e)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | var(--surface-sunken) | var(--surface-sunken) | OC:807 |
| border | 1px solid var(--border) (never --danger) | same | OC:807 |
| border-radius | 12px | 12px | OC:807 |
| padding | 16px 18px | 16px 18px | OC:807 |
| old suggestions on a failed re-run | stay in place | same | ST:42 |

#### Tag + heading row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | OC:808 |
| align-items | baseline | baseline | OC:808 |
| gap | 10px | 10px | OC:808 |
| flex-wrap | wrap | wrap | OC:808 |

#### Failure tag

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | OC:809 |
| font-size | 9.5px | 9.5px | OC:809 |
| letter-spacing | 0.14em | 0.14em | OC:809 |
| text-transform | uppercase | uppercase | OC:809 |
| color | var(--danger) | var(--danger) | OC:809 |
| background | --danger at 12% | --danger at 12% | OC:809 |
| border-radius | 999px | 999px | OC:809 |
| padding | 3px 9px | 3px 9px | OC:809 |
| note | the only `--danger` on the surface | same | DT:670-711 |

#### Failure heading

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | display | display | OC:810 |
| font-weight | 600 | 600 | OC:810 |
| font-size | 17px | 17px (not 19) | OC:810 |
| color | var(--fg) | var(--fg) | OC:810 |

#### Failure body

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 13.5px | 13.5px | OC:812 |
| color | var(--fg-body) | var(--fg-body) | OC:812 |
| line-height | 1.6 | 1.6 | OC:812 |
| max-width | 660px | 660px | OC:812 |
| margin-top | 11px | 11px | OC:812 |

#### Failure "kept" line

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | OC:813 |
| font-size | 10.5px | 10.5px | OC:813 |
| color | var(--fg-faint) | var(--fg-faint) | OC:813 |
| margin-top | 9px | 9px | OC:813 |

#### Failure action row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | OC:814 |
| align-items | center | center | OC:814 |
| gap | 14px | 14px | OC:814 |
| margin-top | 14px | 14px | OC:814 |
| padding-top | 13px | 13px | OC:814 |
| border-top | 1px solid var(--border) | 1px solid var(--border) | OC:814 |
| min-height | 56px | 56px | OC:814 |
| flex-wrap | wrap | wrap | OC:814 |

#### "Try again" (outline)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-weight | 600 | 600 | OC:815 |
| font-size | 13.5px | 13.5px | OC:815 |
| color | var(--accent) | var(--accent) | OC:815 |
| border | 1px solid var(--accent) | 1px solid var(--accent) | OC:815 |
| border-radius | 8px | 8px | OC:815 |
| padding | 10px 18px | 10px 18px | OC:815 |

#### Failure note

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | OC:816 |
| font-size | 11px | 11px | OC:816 |
| color | var(--fg-faint) | var(--fg-faint) | OC:816 |

---

### Credits-spent body placeholder

| Property | 390 | 1300 | Source |
|---|---|---|---|
| body content | whatever the panel held, unchanged | same | V2:202 / V2:581 |

---

## Component: SuggestionCard (open card) `<article>`

### Card container

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | var(--surface) | var(--surface) | V2:321 / V2:267 |
| border | 1px solid var(--border) | 1px solid var(--border) | V2:321 / V2:267 |
| border-radius | 10px | 9px | V2:321 / V2:267 |
| padding | 13px 12px | 10px 12px (canvas wins over R:391's 9px 12px) | V2:321 / V2:64, 267, 628 |
| display | flex column | flex column | V2:321 / V2:267 |
| gap | 11px | 8px | V2:321 / V2:267 |
| row order | pair (2 lines) → [marks row] → rationale short → [bracket flag] → chips → actions | pair → rationale → [bracket flag] → actions + chips | V2:322-349 / V2:268-290 |

### Pair row wrapper

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | V2:322 / V2:268 |
| flex-direction | column | row | V2:322 / V2:268 |
| gap | 7px | 9px | V2:322 / V2:268 |
| align-items | — | center | V2:268 |
| flex-wrap | — | wrap | V2:268 |

### Pair line 1 (390 only: cut)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | — | V2:323 |
| align-items | center | — | V2:323 |
| gap | 9px | — | V2:323 |
| children | cut thumb, cut name | — | V2:324-325 |

### Pair line 2 (390 only: add)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | — | V2:327 |
| align-items | center | — | V2:327 |
| gap | 9px | — | V2:327 |
| children | add thumb, then span (arrow, dot, add name) | — | V2:328-329 |

### Add span (390 only)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| flex | auto | — | V2:329 |
| min-width | 0 | — | V2:329 |
| display | flex | — | V2:329 |
| align-items | center | — | V2:329 |
| gap | 7px | — | V2:329 |

### Cut thumbnail (card-open trigger)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| width | 22px | 22px (DT:830's 20×28 superseded) | V2:324 / V2:269 |
| height | 31px | 31px | V2:324 / V2:269 |
| flex | none | none | V2:324 / V2:269 |
| border-radius | 3px | 3px | V2:324 / V2:269 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) | V2:324 / V2:269 |
| placeholder background | repeating-linear-gradient(135deg, var(--border), var(--border) 3px, var(--surface-raised) 3px, var(--surface-raised) 6px) | same | V2:324 / V2:269 |
| with art | real card art replaces the placeholder | same | spec §3.2 |
| press | `open(cutId, [cut, add])` | same | V2:416 |
| hover (pointer-fine) | — | shipped HoverPreview of the cut | V2:392 |

### Cut name (card-open trigger)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 13px | 13px | V2:325 / V2:270 |
| color | var(--fg-body) | var(--fg-body) | V2:325 / V2:270 |
| text-decoration | line-through | line-through | V2:325 / V2:270 |
| text-decoration-color | var(--fg-locked) | var(--fg-locked) | V2:325 / V2:270 |
| border-bottom | 1px dotted var(--accent) | 1px dotted var(--accent) | V2:325 / V2:270 |
| min-width | 0 | — | V2:325 |
| availability mark | none (the cut carries none) | none | V2:367 |
| press | `open(cutId, [cut, add])` | same | V2:416 |

#### Cut name — hover / focus

| Property | 390 | 1300 | Source |
|---|---|---|---|
| border-bottom | — (tap opens sheet) | 1px solid var(--accent) | V2:388 |
| preview | — | HoverPreview opens | V2:392 |

### Arrow `→`

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | V2:329 / V2:271 |
| font-size | 12px | 13px | V2:329 / V2:271 |
| color | var(--accent) | var(--accent) | V2:329 / V2:271 |
| flex | — | none | V2:271 |
| position | line 2, before the dot | between cut name and add thumb | V2:329 / V2:271 |

### Add thumbnail (card-open trigger)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| width | 22px | 22px | V2:328 / V2:272 |
| height | 31px | 31px | V2:328 / V2:272 |
| flex | none | none | V2:328 / V2:272 |
| border-radius | 3px | 3px | V2:328 / V2:272 |
| border | 1px solid var(--border-dashed) | 1px solid var(--border-dashed) | V2:328 / V2:272 |
| placeholder background | repeating-linear-gradient(135deg, var(--elevated), var(--elevated) 3px, var(--border) 3px, var(--border) 6px) | same | V2:328 / V2:272 |
| press | `open(addId, [cut, add])` | same | V2:416 |

#### Add thumbnail — hover

| Property | 390 | 1300 | Source |
|---|---|---|---|
| border | — | 1px solid var(--accent) | V2:386 |
| preview | — | HoverPreview opens | V2:392 |

### Add name (card-open trigger)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 13px | 13px | V2:329 / V2:275 |
| font-weight | 600 | 600 | V2:329 / V2:275 |
| color | var(--fg) | var(--fg) | V2:329 / V2:275 |
| border-bottom | 1px dotted var(--accent) | 1px dotted var(--accent) | V2:329 / V2:275 |
| press | `open(addId, [cut, add])` | same | V2:416 |

#### Add name — hover / focus

| Property | 390 | 1300 | Source |
|---|---|---|---|
| border-bottom | — | 1px solid var(--accent) | V2:388 |

### HoverPreview (shipped, pointer-fine only)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| component | — (not on touch) | shipped `HoverPreview` via the tab's one provider | V2:392 |
| width × height | — | 230 × 321 | V2:389 |
| border-radius | — | 12px | V2:389 |
| border | — | 1px solid var(--border-strong) | V2:389 |
| box-shadow | — | 0 18px 48px rgba(0,0,0,0.55) | V2:389 |
| triggers | — | both names and both thumbnails | V2:392 |

### CardModal (opened by any of the four triggers)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| call | `open(id, [cut, add])`, cut first | same | V2:416 |
| presentation | card sheet from 96px | modal | V2:416 |
| stacked / backLabel | none; unstacked, own ✕ | none; unstacked, own ✕ | R:92-93, RA finding 11 |

### Availability dot (add only)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| width × height | 7 × 7 | 7 × 7 | V2:329 / V2:273-274 |
| border-radius | 50% | 50% | V2:329 / V2:273 |
| flex | none | none | V2:329 / V2:273 |
| owned (free, soft, hard) | background var(--success) | same | V2:329 / V2:273 |
| unowned | border 1px dashed var(--fg-muted), box-sizing border-box, no fill | same | V2:329 / V2:274 |
| position | line 2, between arrow and add name | between add thumb and add name | V2:329 / V2:273 |

### Availability mark — owned, unclaimed (free)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| mark | green dot alone | green dot alone | V2:273 |
| label | none (the free state is never named) | none | R:81 |
| marks row | not rendered (`hasMark` false) | — | V2:332, 669 |

### Availability mark — soft claim

| Property | 390 | 1300 | Source |
|---|---|---|---|
| placement | own marks row under the pair | inline after the add name | V2:334 / V2:276 |
| wrapper display | inline-flex | inline-flex | V2:334 / V2:276 |
| wrapper align-items | center | center | V2:334 / V2:276 |
| wrapper gap | 6px | 6px | V2:334 / V2:276 |
| wrapper height | 26px | — | V2:334 |
| diamond size | 6 × 6 | 6 × 6 | V2:334 / V2:276 |
| diamond transform | rotate(45deg) | rotate(45deg) | V2:334 / V2:276 |
| diamond border | 1px solid var(--avail-soft) | same | V2:334 / V2:276 |
| diamond fill | none | none | V2:334 / V2:276 |
| label font | mono 10.5px | mono 10.5px | V2:334 / V2:276 |
| label color | var(--avail-soft) | var(--avail-soft) | V2:334 / V2:276 |
| label | `availabilityCopy.marker.soft(n)` e.g. "1 in a draft" | same | V2:683 |

### Availability mark — hard claim

| Property | 390 | 1300 | Source |
|---|---|---|---|
| placement | marks row | inline after the add name | V2:335 / V2:277 |
| wrapper | inline-flex, center, gap 6px, height 26px | inline-flex, center, gap 6px | V2:335 / V2:277 |
| diamond | 6 × 6, rotate(45deg), background var(--avail-hard-fg) | same | V2:335 / V2:277 |
| label | mono 10.5px, var(--avail-hard-fg), `availabilityCopy.marker.hard` ("none free") | same | V2:335 / V2:277, 688 |

### Buy chip (unowned)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| component | shipped `buy-tag.tsx` / `availability-marker.tsx` | same | R:81 |
| placement | marks row | inline after the add name | V2:336 / V2:278 |
| display | inline-flex | inline-flex | V2:336 / V2:278 |
| align-items | center | center | V2:336 / V2:278 |
| gap | 8px | 8px | V2:336 / V2:278 |
| min-width | 132px | 124px | V2:336 / V2:278 |
| height | 26px | 24px | V2:336 / V2:278 |
| padding | 0 9px | 0 9px | V2:336 / V2:278 |
| border-radius | 5px | 5px | V2:336 / V2:278 |
| background | color-mix(in oklab, var(--warning) 11%, var(--surface)) | same | V2:336 / V2:278 |
| "buy" | mono 11px, var(--warning) | same | V2:336 / V2:278 |
| leader | flex 1, min-width 12px, border-bottom 1px dotted color-mix(in oklab, var(--warning) 35%, transparent) | same | V2:336 / V2:278 |
| price | mono 11px, var(--fg-body), tabular-nums | same | V2:336 / V2:278 |

### Marks row (390 only)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| rendered when | soft, hard or unowned (`hasMark`) | — (marks inline) | V2:332, 669 |
| display | flex | — | V2:333 |
| align-items | center | — | V2:333 |
| gap | 8px | — | V2:333 |
| position | after the pair, before the rationale | — | V2:332-338 |

### Rationale

| Property | 390 | 1300 | Source |
|---|---|---|---|
| text | `rationaleShort` (≤ 80 chars) | `rationale` (full) | V2:339 / V2:280, RA:76-78 |
| font-size | 12.5px | 12.5px | V2:339 / V2:280 |
| color | var(--fg-body) | var(--fg-body) | V2:339 / V2:280 |
| line-height | 1.55 | 1.5 | V2:339 / V2:280 |
| max-width | — | 980px | V2:280 |
| truncation / ellipsis | never | never | R:392 |
| typewriter / motion | none | none | R:427 |

### Bracket flag row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| rendered when | `bracketAfter` differs from the current reading's permits | same | V2:124, R3A note 1 |
| reserved row when absent | none | none | V2:124 |
| position | after rationale, before chips | after rationale, before actions | V2:340 / V2:281 |
| display | flex | flex | V2:340 / V2:281 |
| align-items | center | center | V2:340 / V2:281 |
| gap | 8px | 8px | V2:340 / V2:281 |
| flex-wrap | wrap | wrap | V2:340 / V2:281 |

#### Flag sentence

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 12.5px | 12.5px | V2:340 / V2:281 |
| color | var(--fg-body) | var(--fg-body) | V2:340 / V2:281 |
| lowest bracket higher | "Applying it raises the deck’s bracket to" | same | V2:714 |
| lowest bracket lower | "Applying it lowers the deck’s bracket to" | same | V2:715 |
| equal lowest, different set | "Applying it changes the deck’s bracket to" (undrawn; /copy-review) | same | R3A note 1 |

#### Flag chip (shipped `BracketChip permits={bracketAfter}`)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| height | 22px | 24px | V2:709 |
| display | inline-flex | inline-flex | V2:709 |
| align-items | center | center | V2:709 |
| gap | 5px | 5px | V2:709 |
| border-radius | 6px | 6px | V2:709 |
| padding-left / right | 2px / 8px | 2px / 8px | V2:709 |
| background | color-mix(in srgb, var(--bracket-N) 12%, var(--bg)) | same | V2:709 |
| border | 1px solid color-mix(in oklab, var(--bracket-N) 55%, transparent) | same | V2:709 |
| white-space / flex | nowrap / none | nowrap / none | V2:709 |
| mark | 22 × 22, ink var(--bracket-N) | 22 × 22 | V2:710 |
| name | mono 10px, var(--bracket-N) | mono 11px, var(--bracket-N) | V2:711 |
| range | unrounded (both names) | same | V2:125 |
| new mark / arrow / direction colour | none | none | R:102 |
| size prop | none (chip is responsive via `md:`) | none | spec §3.5 |

### Citation chips wrapper

| Property | 390 | 1300 | Source |
|---|---|---|---|
| placement | own row after flag/rationale, before actions | inside the action row, `margin-left: auto` | V2:341 / V2:285 |
| display | flex | flex | V2:341 / V2:285 |
| gap | 6px | 5px | V2:341 / V2:285 |
| flex-wrap | wrap | wrap | V2:341 / V2:285 |

### Citation chip

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | V2:343 / V2:287 |
| align-items | baseline | baseline | V2:343 / V2:287 |
| gap | 5px | 5px | V2:343 / V2:287 |
| font-family | mono | mono | V2:343 / V2:287 |
| font-size | 9.5px | 9.5px | V2:343 / V2:287 |
| background | var(--surface-sunken) | var(--surface-sunken) | V2:343 / V2:287 |
| border | 1px solid var(--border) | 1px solid var(--border) | V2:343 / V2:287 |
| border-radius | 5px | 5px | V2:343 / V2:287 |
| padding | 3px 7px | 3px 7px | V2:343 / V2:287 |
| source text | letter-spacing 0.1em, uppercase, var(--fg-locked) | same | V2:343 / V2:287 |
| value text | var(--fg-muted) | same | V2:343 / V2:287 |
| kinds | games · note · decklist · intent · mix | same | V2:674-696, RA finding 4 |
| note value | app display date from `format.ts` (not ISO) | same | RA finding 6 |
| mix value | a pack cell's `have of target` | same | RA finding 4 |
| no games | no `games` or `note` chip | same | V2:659 |
| intent chip | only when intent moved the suggestion | same | IW:103-105 |

### Card action row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex | flex | V2:346 / V2:282 |
| align-items | — | center | V2:282 |
| gap | 8px | 7px | V2:346 / V2:282 |
| flex-wrap | — | wrap | V2:282 |
| position | last (after chips) | last, chips inside at the right | V2:346 / V2:282 |

### Apply (outline)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| label | "Apply" | "Apply" | V2:347 / V2:283 |
| font-weight | 600 | 600 | V2:347 / V2:283 |
| font-size | 13px | 12.5px | V2:347 / V2:283 |
| color | var(--accent) | var(--accent) | V2:347 / V2:283 |
| border | 1px solid var(--accent) | 1px solid var(--accent) | V2:347 / V2:283 |
| border-radius | 8px | 7px | V2:347 / V2:283 |
| padding | — | 7px 13px (32px tall) | V2:283 |
| height | 44px | — | V2:347 |
| flex | 1 | — | V2:347 |
| align / justify | center / center | — | V2:347 |

#### Apply — applying

| Property | 390 | 1300 | Source |
|---|---|---|---|
| label | "Applying…" | "Applying…" | ST:62 |
| interactive | no | no | ST:62 |
| Reject | disabled | disabled | ST:62 |
| unmount | nothing unmounts | same | ST:62 |

#### Apply — refused

| Property | 390 | 1300 | Source |
|---|---|---|---|
| component | shipped `MutationError` under this card's action row | same | R:400 |
| copy | `card.applyRefused` | same | DC |

### Reject

| Property | 390 | 1300 | Source |
|---|---|---|---|
| label | "Reject" | "Reject" | V2:348 / V2:284 |
| font-weight | 500 | 500 | V2:348 / V2:284 |
| font-size | 13px | 12.5px | V2:348 / V2:284 |
| color | var(--fg-muted) | var(--fg-muted) | V2:348 / V2:284 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) | V2:348 / V2:284 |
| border-radius | 8px | 7px | V2:348 / V2:284 |
| padding | — | 7px 12px | V2:284 |
| height | 44px | — | V2:348 |
| flex | 1 | — | V2:348 |
| align / justify | center / center | — | V2:348 |

### Removed by r2 (must not render)

| Element | 390 | 1300 | Source |
|---|---|---|---|
| consequence line | — | — | R:81-82, RD:9-12 |
| `×1 owned` / `not owned` atoms | — | — | R:81 |
| price-only atom | — | — | R:81 |
| applied verdict / shopping clause | — | — | R:82 |

---

## Component: SuggestionCard — Applied row

Two drawings conflict (spec §9.7): C3 (part answered) draws a 15px box and `10px 12px`; C4 (all
answered) draws inline "✓ applied" and `9px 12px`. Both are recorded. No 390 frame.

| Property | 390 | 1300 (C3) | 1300 (C4) | Source |
|---|---|---|---|---|
| background | not drawn | var(--surface) | var(--surface) | V2:482 / V2:508 |
| border | not drawn | 1px solid var(--success) | 1px solid var(--success) | V2:482 / V2:508 |
| border-radius | not drawn | 9px | 9px | V2:482 / V2:508 |
| padding | not drawn | 10px 12px | 9px 12px | V2:482 / V2:508 |
| display | not drawn | flex | flex | V2:482 / V2:508 |
| align-items | not drawn | center | center | V2:482 / V2:508 |
| gap | not drawn | 9px | 9px | V2:482 / V2:508 |
| flex-wrap | not drawn | wrap | — | V2:482 |

### Applied stamp

| Property | 390 | 1300 (C3) | 1300 (C4) | Source |
|---|---|---|---|---|
| wrapper | not drawn | flex, center, gap 6px | inline text | V2:483 / V2:509 |
| font-family | not drawn | mono | mono | V2:483 / V2:509 |
| font-size | not drawn | 9.5px | 9.5px | V2:483 / V2:509 |
| letter-spacing | not drawn | 0.1em | 0.1em | V2:483 / V2:509 |
| text-transform | not drawn | uppercase | uppercase | V2:483 / V2:509 |
| color | not drawn | var(--success) | var(--success) | V2:483 / V2:509 |
| box | not drawn | 15 × 15, radius 4px, 1px solid var(--success), flex centred, ✓ at 9px | — ("✓ applied" as text) | V2:483 / V2:509 |
| label | not drawn | "applied" | "✓ applied" | V2:483 / V2:509 |

### Applied pair

| Property | 390 | 1300 (C3) | 1300 (C4) | Source |
|---|---|---|---|---|
| font-size | not drawn | 13px | 12.5px | V2:484 / V2:510 |
| color (cut) | not drawn | var(--fg-body) | var(--fg-body) | V2:484 / V2:510 |
| arrow color | not drawn | var(--success) | var(--success) | V2:484 / V2:510 |
| add | not drawn | `<b>`, var(--fg), 600 | same | V2:484 / V2:510 |
| verdict / shopping clause | — | — | — | R:82 |

### "Undo swap"

| Property | 390 | 1300 | Source |
|---|---|---|---|
| margin-left | not drawn | auto | V2:485, 511 |
| font-weight | not drawn | 500 | V2:485 |
| font-size | not drawn | 12px | V2:485 |
| color | not drawn | var(--fg-muted) | V2:485 |
| border | not drawn | 1px solid var(--border-strong) | V2:485 |
| border-radius | not drawn | 7px | V2:485 |
| padding | not drawn | 6px 11px | V2:485 |
| refused | shipped `MutationError`, `card.undoRefused` | same | DC |

---

## Component: SuggestionCard — Rejected row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | not drawn | var(--surface-sunken) | V2:487, 515 |
| border | not drawn | 1px solid var(--border) | V2:487 |
| border-radius | not drawn | 9px | V2:487 |
| padding | not drawn | 9px 12px | V2:487 |
| display | not drawn | flex | V2:487 |
| align-items | not drawn | center | V2:487 |
| gap | not drawn | 9px | V2:487 |
| motion out | none | none | spec §3.6 |

### "rejected" label

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | not drawn | mono | V2:488 |
| font-size | not drawn | 9.5px | V2:488 |
| letter-spacing | not drawn | 0.1em | V2:488 |
| text-transform | not drawn | uppercase | V2:488 |
| color | not drawn | var(--fg-locked) | V2:488 |

### Rejected pair

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | not drawn | 12.5px | V2:489 |
| color | not drawn | var(--fg-faint) (whole pair, arrow included) | V2:489 |
| form | not drawn | "Cut → Add" | V2:489 |

### "Show it again"

| Property | 390 | 1300 | Source |
|---|---|---|---|
| style | not drawn | as "Undo swap": margin-left auto, 500 12px, var(--fg-muted), 1px solid var(--border-strong), radius 7px, padding 6px 11px | V2:490 |

---

## Component: SuggestionCard — No longer applies row

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | not drawn | var(--surface-sunken) | V2:541 |
| border | not drawn | 1px solid var(--border) | V2:541 |
| border-radius | not drawn | 9px | V2:541 |
| padding | not drawn | 9px 12px | V2:541 |
| display | not drawn | flex | V2:541 |
| align-items | not drawn | center | V2:541 |
| gap | not drawn | 9px | V2:541 |
| flex-wrap | not drawn | wrap | V2:541 |
| button | none drawn | none drawn | V2:540-544 |

### "no longer applies" label

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | not drawn | mono | V2:542 |
| font-size | not drawn | 9.5px | V2:542 |
| letter-spacing | not drawn | 0.1em | V2:542 |
| text-transform | not drawn | uppercase | V2:542 |
| color | not drawn | var(--fg-locked) | V2:542 |

### Broken line

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | not drawn | 12.5px | V2:543 |
| color | not drawn | var(--fg-faint) | V2:543 |
| cut-gone form | not drawn | "{cut} has left the deck, so this swap cannot be applied." | V2:762 |
| add-already-in form | not drawn | not drawn | spec §9.14 |

---

## Component: ManifestRows

### Manifest list (never run / retired)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| display | flex column | flex column | V2:176 / V2:432 |
| gap | 6px | 6px | V2:176 / V2:432 |
| margin-top | 14px | 14px | V2:176 / V2:432 |

### Row — pending (unchecked)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| min-height | 44px | 38px | V2:183 / V2:434 |
| display | flex | flex | V2:183 / V2:434 |
| align-items | center | center | V2:183 / V2:434 |
| gap | 10px | 10px (DT's 11 superseded) | V2:183 / V2:434 |
| background | var(--surface) | var(--surface) | V2:183 / V2:434 |
| border | 1px solid var(--border) | 1px solid var(--border) | V2:183 / V2:434 |
| border-radius | 8px | 8px | V2:183 / V2:434 |
| padding | 0 12px | 0 12px (DT's 7px 12px superseded) | V2:183 / V2:434 |

### Tick box — pending

| Property | 390 | 1300 | Source |
|---|---|---|---|
| width × height | 18 × 18 | 16 × 16 | V2:184 / V2:435 |
| flex | none | none | V2:184 / V2:435 |
| border-radius | 4px | 4px | V2:184 / V2:435 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) | V2:184 / V2:435 |
| box-sizing | border-box | border-box | V2:184 / V2:435 |
| content | empty | empty | V2:184 / V2:435 |

### Row label

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 12.5px | 13px | V2:185 / V2:436 |
| color | var(--fg-body) | var(--fg-body) | V2:185 / V2:436 |
| flex | 1 | 1 | V2:185 / V2:436 |
| line-height | 1.35 | — | V2:185 |
| padding | 6px 0 | — | V2:185 |

### Row count

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-family | mono | mono | V2:186 / V2:437 |
| font-size | 10px | 11px | V2:186 / V2:437 |
| color | var(--fg-faint) | var(--fg-faint) | V2:186 / V2:437 |

### Row — done (loading, read completed)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | var(--elevated) | var(--elevated) | V2:559, 771 / V2:460, 771 |
| border | 1px solid var(--border) (unchanged) | same | V2:559 / V2:461 |
| tick box border | 1px solid var(--accent) | 1px solid var(--accent) | V2:560 / V2:462 |
| tick box layout | flex, center, center | flex, center, center | V2:560 / V2:462 |
| tick | "✓", 10px, var(--accent) | same | V2:560 / V2:462 |
| label color | var(--fg-body) (DT's --fg superseded) | same | V2:561 / V2:463 |
| label size (loading) | 12.5px, no line-height/padding set | 13px | V2:561 / V2:463 |
| DT's --elevated-hover / --accent-shadow / 12% fill | — | — | spec §9.4 |
| ticks when | that row's read actually completes | same | R:245 |
| motion | opacity only | opacity only | R:426 |

### Rows and counts

| Row | Label | Count | Source |
|---|---|---|---|
| games (marked) | "Your games" | "{n} games" | V2:765 |
| games (unmarked) | "Your games" | "{n} games · no marks" | V2:744 |
| notes | "Notes on your games" | "on {m} of {n} games" | V2:766, 745 |
| list | "This list" (C1) / "This list, against the recommended mix" (E5, D1) | "{n} cards" | V2:767 / V2:746, 777 |
| collection | "What you own, and what a card costs" | "your collection" | V2:768 |
| intent | its own row (label not redrawn in r2; CS form "What you said this deck is for" · "your words") | — | R:88, CS:54-57 |

### Dashed "none logged" row (no games)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| min-height | 44px | 38px | V2:177 / V2:600 |
| display | flex | flex | V2:177 / V2:600 |
| align-items | center | center | V2:177 / V2:600 |
| gap | 10px | 10px | V2:177 / V2:600 |
| background | transparent (unset) | transparent | V2:177 / V2:600 |
| border | 1px dashed var(--border-dashed) | 1px dashed var(--border-dashed) | V2:177 / V2:600 |
| border-radius | 8px | 8px | V2:177 / V2:600 |
| padding | 0 12px | 0 12px | V2:177 / V2:600 |
| position | first row of the list | first row | V2:177 / V2:600 |
| read | the only row shown that was not read | same | V2:660 |

#### Dashed row box

| Property | 390 | 1300 | Source |
|---|---|---|---|
| width × height | 18 × 18 | 16 × 16 | V2:178 / V2:601 |
| flex | none | none | V2:178 / V2:601 |
| border-radius | 4px | 4px | V2:178 / V2:601 |
| border | 1px dashed var(--border-dashed) | 1px dashed var(--border-dashed) | V2:178 / V2:601 |

#### Dashed row label

| Property | 390 | 1300 | Source |
|---|---|---|---|
| layout | column (flex 1, gap 1px): "Your games" over "none logged" | "Your games" (flex 1) then "none logged" as a separate count span | V2:179 / V2:602-603 |
| "Your games" | 12.5px, var(--fg-faint) | 13px, var(--fg-faint) | V2:179 / V2:602 |
| "none logged" | mono 10px, var(--fg-faint) | mono 11px, var(--fg-faint) | V2:179 / V2:603 |

#### "Log a game →"

| Property | 390 | 1300 | Source |
|---|---|---|---|
| font-size | 12.5px | 12.5px | V2:180 / V2:604 |
| font-weight | 600 | 600 | V2:180 / V2:604 |
| color | var(--accent) | var(--accent) | V2:180 / V2:604 |
| padding | 12px 0 (tap target) | — | V2:180 |
| press | `setView('games')` | same | V2:658 |

### Tap floors

| Property | 390 | 1300 | Source |
|---|---|---|---|
| row min-height | 44px | 38px | DT:1388 |

---

## Component: DeckIntentAsk (in-panel) — RETIRED

H35 (deck description, PR 1) removed this component. The description's one door before a first
reading is now the empty-state field above the Analyze press (`DeckDescriptionField`), with the
deck header's pencil (`use-deck-header-edit.ts`) as its second door — neither lives inside this
panel. The property tables this section once carried (ask block, label, pitch, field, action row,
Save/Skip, errors/announce) describe a surface that no longer renders; see
`design/design_handoff_the99_deck_description/STATES-deck-description.md` for the shipped states.

---

## Component: FanShuffle (animated CardFanMark)

### Box

| Property | 390 | 1300 | Source |
|---|---|---|---|
| aria-hidden | true | true | V2:717 |
| position | relative | relative | V2:717 |
| width × height | 96 × 96 | 120 × 120 | V2:750 / V2:749 |
| flex | none | none | V2:717 |
| display | flex | flex | V2:717 |
| align / justify | center / center | center / center | V2:717 |

### Card (each of three)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| position | absolute | absolute | V2:723 |
| width × height | 38 × 58 | 46 × 70 | V2:750 / V2:749 |
| border-radius | 5px (round(38/7)) | 7px (round(46/7)) | V2:723 |
| border-width / style | 1.5px solid | 1.5px solid | V2:723 |
| box-sizing | border-box | border-box | V2:723 |
| display | flex, center, center | flex, center, center | V2:724 |
| --dx | 14px | 17px | V2:750 / V2:749 |

### Card k=0 (back)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | var(--elevated) | var(--elevated) | V2:719 |
| border-color | var(--border-strong) | var(--border-strong) | V2:719 |
| face | none | none | V2:719 |
| static transform | translateX(-14px) rotate(-18deg) | translateX(-17px) rotate(-18deg) | V2:725 |
| animation-delay | 0s | 0s | V2:726 |

### Card k=1

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | var(--surface-raised) | var(--surface-raised) | V2:720 |
| border-color | var(--border-dashed) | var(--border-dashed) | V2:720 |
| face | none | none | V2:720 |
| static transform | none | none | V2:725 |
| animation-delay | -0.8s | -0.8s | V2:726 |

### Card k=2 (front)

| Property | 390 | 1300 | Source |
|---|---|---|---|
| background | color-mix(in srgb, var(--accent) 14%, var(--surface)) | same | V2:721 |
| border-color | var(--accent) | var(--accent) | V2:721 |
| face | "99" | "99" | V2:721 |
| face font-family | display | display | V2:724 |
| face font-weight | 800 | 800 | V2:724 |
| face font-size | 15px | 18px | V2:750 / V2:749 |
| face color | var(--accent) | var(--accent) | V2:724 |
| static transform | translateX(14px) rotate(18deg) | translateX(17px) rotate(18deg) | V2:725 |
| animation-delay | -1.6s | -1.6s | V2:726 |

### Animation `fan-shuffle`

| Property | 390 | 1300 | Source |
|---|---|---|---|
| animation | fan-shuffle 2.4s cubic-bezier(.5,0,.3,1) infinite | same | V2:726 |
| 0%, 24% | translateX(-dx) rotate(-18deg); z-index 1 | same | V2:31 |
| 33%, 57% | translateX(0) rotate(0deg); z-index 2 | same | V2:32 |
| 66%, 88% | translateX(dx) rotate(18deg); z-index 3 | same | V2:33 |
| 94% | translateX(0) translateY(-0.9·dx) rotate(0deg); z-index 0 | same | V2:34 |
| 100% | translateX(-dx) rotate(-18deg); z-index 1 | same | V2:35 |
| prefers-reduced-motion | animation none; static transforms show | same | V2:37 |
| runs | until the last manifest row lands; not a progress figure | same | V2:573 |
| live region | the heading, not the mark | same | V2:573 |

---

## State Coverage — TuningPanel

Field names are the `TuningState` / `TuningItem` shape named in the brief. `gameCount` is the deck's
logged games; `markedCount` stands for games carrying a worked/hurt mark.

| State | Triggering condition | Rendered | Key props / copy required | Frames |
|---|---|---|---|---|
| Not mounted | no reading exists, or `ANALYSIS_TAB_ENABLED` off | nothing | — | RA ruling 6 |
| S-A Never run, games marked | `run == null` (or retired / stopped), `gameCount > 0`, some game marked | heading, `readyLead`, 4 (or 5 with intent) unchecked manifest rows, [intent ask], primary "Suggest changes", credit first-run note | gameCount, axis, marked, allowance.used/limit, reopensAt | C1 (1300); 390 composed from E3 geometry |
| S-B Never run, no games | as S-A with `gameCount == 0` | `noGamesLead`, dashed "none logged" row + 2 rows ("This list, against the recommended mix", collection), primary, first-run note | gameCount = 0, Log a game → setView('games') | D1 (1300), E3 (390) |
| S-C Never run, games unmarked | as S-A with `gameCount > 0` and no game marked | `unmarkedLead`, 4 rows with games count "{n} games · no marks", primary, first-run note | gameCount, markedCount = 0 | E5 (1300), E5b (390) |
| Intent ask shown | RETIRED (H35) — superseded by the empty-state field and header pencil, neither of which is drawn in this panel | — | — | see "Component: DeckIntentAsk (in-panel) — RETIRED" above |
| S-D Loading | `run.status == 'running'` (pending) | accent border, aria-busy, fan + "Shuffling…" heading (role=status) + `loadingLead`, ticking manifest, "Reading…" + "Stop" + progress | per-row done flags, done/total | C2 (1300), C2b (390) |
| Stopped (removed 2026-10-12; an old `cancelled` row draws as never-run) | user pressed Stop | returns to never-run (S-A/B/C), manifest unchecked, no error, no tag; refunded | — | ST:44, R:91 |
| S-E Results (full) | `run.status == 'ok'`, all `items[].verdict == null`, `items.length == 5` | read line, `resultsLead` (1300 only), 5 SuggestionCards, "Suggest again", again note | items[], allowance.used/limit | A1 (1300), A2 (390) |
| S-E Results (fewer) | as above with `items.length < 5` | `fewerLead` (1300; placement relative to resultsLead undrawn), n cards, never padded | items.length, dropped count | V2:754, R:78 |
| S-E Results, no games | as S-E with `gameCount == 0` | read line with "the recommended mix" and "no games logged" (--fg-body); no lead; no games/note chips | gameCount = 0 | D2 (1300); 390 not drawn |
| S-F Part answered | `run.status == 'ok'`, some `items[].verdict` in {applied, rejected}, some null | cards in their slots: applied → Applied row, rejected → Rejected row, open → SuggestionCard; note "{a} of {total} applied · {r} rejected · {again}" | items[].verdict | C3 (1300); 390 not drawn |
| S-G All answered | every `items[].verdict` non-null | `allDoneLead` (parametrised on actual total), no read line, applied rows then rejected rows, "Suggest again", again note | counts by verdict | C4 (1300); 390 not drawn |
| S-H Retired by a commit | `retired` set (a version committed after the run; `{from, to}`) | `retiredLead`, unchecked manifest, "Suggest changes" (gate open), first-run note | retired.from, retired.to | C5 (1300); 390 not drawn |
| S-I Unchanged | gate says unchanged: current fingerprint == `lastOkFingerprint` | read line, unchanged lead, 3 reason rows, tail, "Suggest again anyway", unchanged note; no --danger | lastOkFingerprint, gameCount, axis, intent | OC:785-801 (1300); 390 not drawn |
| S-J 6a Upstream busy | `run.status == 'failed'`, `errorClass == 'upstream_busy'` | failure block (tag, heading 17px, body, kept, Try again, note); prior suggestions stay | errorClass | OC:804-820 |
| S-J 6b Timed out | `errorClass == 'timeout'` | failure block | errorClass | OC:804-820 |
| S-J 6c Unusable | `errorClass == 'malformed'` | failure block | errorClass | OC:804-820 |
| S-J 6d Nothing held up | `errorClass == 'ungrounded'` | failure block | errorClass | OC:804-820 |
| S-J 6e Interrupted | `errorClass == 'interrupted'` | failure block (strings owed; not drawn) | errorClass | not drawn |
| S-K Credits spent | `allowance.used >= allowance.limit` | body kept as held; primary disabled (aria-disabled, --fg-disabled, --border-strong); spent note with 12-hour time; no tag, no --danger, no Try again | allowance.used/limit, reopensAt | C6 (1300), E4 (390) |
| Never run + credits spent | never-run state AND `allowance.used >= allowance.limit` | "Suggest changes" disabled (not drawn) | — | not drawn |
| Stale reading | reading stale | panel unchanged | — | R:40 |

## State Coverage — SuggestionCard

| State | Triggering condition | Rendered | Key props required | Frames |
|---|---|---|---|---|
| Open card | `verdict == null`, `applies == true` | full card: pair, [marks], rationale, [flag], chips, Apply + Reject | cut, add, rationale, rationaleShort, citations[], availability | A1, A2 |
| Open, add free | add owned and unclaimed | green dot only; no label; no marks row at 390 | availability.state = free | V2:273 |
| Open, add soft-claimed | add owned, soft claim | green dot + hollow diamond + `marker.soft(n)` | availability soft count | V2:276 |
| Open, add hard-claimed | add owned, no free copy | green dot + solid diamond + "none free" | availability hard | V2:277 |
| Open, add unowned | add not owned | dashed dot + buy chip with price | price | V2:274, 278 |
| Bracket flag, raises | `bracketAfter != null` and min(bracketAfter) > min(current permits) | flag row: "raises" sentence + BracketChip(bracketAfter) | bracketAfter, current permits | E1, E1b |
| Bracket flag, lowers | min(bracketAfter) < min(current) | "lowers" sentence + chip | same | E1, E1b |
| Bracket flag, changes | equal lowest, different set | "changes" sentence + chip (undrawn copy) | same | R3A note 1 |
| No flag | `bracketAfter == null` or equal to current set | no row, nothing reserved | — | V2:124 |
| Applying | Apply pressed, write pending | "Applying…" non-interactive, Reject disabled, nothing unmounts | pending flag | ST:62 |
| Apply refused | write refused | MutationError under the card's action row | error | R:400 |
| Applied | `verdict == 'applied'` | Applied row (success border, stamp, pair, Undo swap) | cut, add | C3, C4 |
| Put back refused | undo refused | MutationError, `card.undoRefused` | error | DC |
| Rejected | `verdict == 'rejected'` | Rejected row (sunken, "rejected", faint pair, Show it again) | cut, add | C3, C4 |
| No longer applies (cut gone) | `applies == false` because `cutInDeck == false` | row with "no longer applies" + brokenLine; no button; Apply refused server-side | cut name | C5 draft row |
| No longer applies (add already in) | `applies == false` because the add is already in the deck | not drawn | add name | not drawn |
| Retired | run `retired` | cards do not render; panel shows S-H | — | C5 |
| No games | `gameCount == 0` | no games / note citation chips | — | V2:659 |

---

## Deferred to D2

D2 is now tabled in `deck-tuning-d2.md` and verified in `gap-report-deck-tuning-d2.md`. The list below records what this table deferred.

- **Deck-header intent line (E2 / E2b)**: second row in `spine-desktop.tsx` / `spine-mobile.tsx`,
  order name → intent → pips + commander → chips → bar; 14px/1.45 desktop, 12.5px/1.5 phone, dashed
  underline, mono "edit"; seeded chip state (V2:139-165, R3A note 3).
- **Header "edit" opening the intent field** (IW:46; where it opens is not drawn).
- **Games-tab pointer line**: after `GameFindings`, before History, only with a reading and ≥ 1 game;
  "Suggested changes reads these games." + "It is on the Analysis tab →" (V1:236-256), and the
  `note.readBack` amendment.

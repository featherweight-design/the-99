# Design Property Table — About how-it-works (PR B: the appendix)

Sources: `README.md` (README), `STATES-how-it-works-r1.md` (STATES), `READINESS-audit.md` (AUDIT, whose engineering corrections and Hugh's rulings override the README), and `The 99 - About How It Works (R1).dc.html` (canvas). Canvas frames: §1a is the long-form key (:110-131), §2a is the desktop page at 1300 (:179-257), §3a is phone closed (:266-305), §3b is phone landed and open (:307-343), §4a-4f are desktop open rows (:386-421), §5b is desktop landed (:468-532), and the data is at :533-657.

Overrides applied throughout (AUDIT:10-13):
- A fifth method, `published list` (key `list`), is tagged on the Prices row and on the Game Changers sub-row.
- The key heading reads "Five ways an answer is reached".
- The canvas's dashed `no method fits · open 1` placeholder is retired.
- Cadence copy changes are copy, not properties, so they are omitted here.

## Appendix section (`section#how-it-works`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Element / id | `section`, `id="how-it-works"` | same | README:56; canvas:245 |
| Placement | after the chapters map in `about-page.tsx` | same | README:56; AUDIT:41 |
| margin-top | 18px in the §3a frame (see contradictions) | 28px (`mt-28`) | README:58; canvas:195, :272 |
| Top border | 1px `--border` | 1px `--border` | README:58; canvas:195, :272 |
| padding-top | 18px | 18px (`pt-18`) | README:58; canvas:195, :272 |
| Numeral | none | none (no mono numeral) | README:59-60; canvas:245 |

## Appendix heading (`h2`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Text | "How the app reaches its answers" | same | README:59; canvas:196, :273 |
| Font family | `font-display` (`--font-display-face`, per theme) | same | README:59-60; canvas:196 |
| Size / weight | 16px / 700 | 21px / 700 | README:59; canvas:196, :273 |
| Color | `--fg` | `--fg` | canvas:196, :273 |
| Margin | 0 | 0 | canvas:196, :273 |
| Line-height | — | — | — |

## Appendix sub (`p`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Text | "Grouped by what the app decides. Each row says where an answer comes from, how it is decided, how often it refreshes, and what it might miss." | same | README:61-62; canvas:274 |
| Size / line-height | 13px / 1.55 | 13px / 1.55 | README:61; canvas:197, :274 |
| Color | `--fg-muted` | `--fg-muted` | README:61; canvas:197 |
| margin-top | 4px under the heading | 4px | README:61; canvas:197, :274 |
| text-wrap | pretty | pretty | canvas:197 |

## Page intro clause (`aboutCopy.pageIntro`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Clause | `, then how the app reaches its answers` | same | README:63-64 |
| Position | after "Four chapters, in the order you would use them" | same | README:63-64 |

## Method key box

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| margin-top (from sub) | 12px in the canvas; README says 14px | 14px | README:66; canvas:198, :275 |
| Fill | `--surface` | `--surface` | README:68; canvas:198, :275 |
| Border | 1px `--border-strong` | 1px `--border-strong` | README:68; canvas:198 |
| Radius | 10px | 10px | README:68, :206; canvas:198 |
| Padding | 12 / 14 / 12 (T / LR / B) | 12 / 16 / 14 (T / LR / B) | README:68; canvas:198, :275 |

## Method key heading (`h3`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Text | "Five ways an answer is reached" | same (the canvas and README say "Four", overridden) | AUDIT:10-13; README:69; canvas:199 |
| Font | IBM Plex Mono 11px / 500 | IBM Plex Mono 11px / 500 | README:69; canvas:199, :276 |
| Tracking | 0.08em | 0.08em | README:69; canvas:199 |
| Color | `--fg-faint` | `--fg-faint` | README:69; canvas:199 |
| Margin | 0 | 0 | canvas:199 |
| Text transform | none | none | canvas:199 |

## Method key list (`dl`) and items

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| dl margin-top | 6px | 8px | canvas:200, :277 |
| Layout | one column (flex column) | 2-column grid, `repeat(2, minmax(0,1fr))` | README:71-72; canvas:200, :277 |
| Gaps | 0 (items are separated by padding) | 8px row / 24px column | README:71; canvas:200 |
| Item count / order | 5: rules, decks, model, you, list | same | canvas:538-542; AUDIT:10-13 |
| Item hairline | 1px `--border` top | 1px `--border` top | README:73; canvas:202, :279 |
| Item padding | 8px top **and** 8px bottom (`8px 0`) | 8px top only | README:73; canvas:202, :279 |
| Item layout | column; tag above definition, gap 5px | row, `align-items: baseline`, gap 10px | canvas:202, :279 |
| `dt` | holds the tag; `display:flex` | fixed 100px column (`flex:none; width:100px`) holding the tag | README:74; canvas:203, :280 |
| `dd` size / line-height | 13px / 1.5 | 12.5px / 1.5 | README:74-75; canvas:204, :281 |
| `dd` color | `--fg-body` | `--fg-body` | README:75; canvas:204 |
| `dd` margin | 0 | 0 | canvas:204 |
| `dd` text | the `short` form of each definition | same | canvas:204, :539-542 |

## Method key, long form (§1a, reference only)

This form is drawn standalone. The README's page spec above follows §2a and §3a.

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Box padding | — | 14 / 16 / 16 | canvas:113 |
| Grid gap | — | 12px / 24px | canvas:115 |
| Item | — | column, gap 5px, padding-top 10px, 1px `--border` top | canvas:117 |
| Tag | — | 10.5px, padding 3/7 | README:81; canvas:118 |
| `dd` | — | 13px / 1.55 `--fg-body`, the `def` text | canvas:119 |

## `MethodTag` (`ui/`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Keys | `rules` \| `decks` \| `model` \| `you` \| `list` | same | README:79-80; AUDIT:10-13 |
| Labels | `rules text`, `other decks`, `model-written`, `your input`, `published list` | same | README:79-80; canvas:536; AUDIT:10 |
| Font | IBM Plex Mono 10px, line-height 1 | same (10.5 only in the long-form key) | README:81; canvas:203 |
| Padding | 3px / 6px | 3px / 6px | README:82; canvas:203 |
| Radius | 4px | 4px | README:82, :206 |
| Border | 1px `--border-strong` | 1px `--border-strong` | README:82 |
| Text color | `--fg-muted` | `--fg-muted` | README:82 |
| Fill | none | none | README:82 |
| white-space | nowrap | nowrap | README:82; canvas:203 |
| Gap between tags | 5px | 5px | README:83; canvas:214, :292 |
| Tag group wrap | flex-wrap | flex-wrap | canvas:214, :292 |
| Variant styling | none; all five are identical, with no color or shape difference | same | README:84-85 |
| a11y | plain text, read in the head button's accessible name | same | README:159 |

## Row tag assignments (data)

| Row (`id`) | Tags | Verdict | Has `explained in` | Source |
|---|---|---|---|---|
| Brackets (`brackets`) | rules, decks | partial | yes, 2 | canvas:545, :557 |
| Roles and targets (`roles`) | rules, decks | partial | yes, 4 | canvas:558, :564 |
| Card and commander themes (`themes`); retitled from the canvas's "Themes" in copy review, because the row covers two different kinds of theme | decks, rules | exact and partial | yes, 1 | canvas:565-571 |
| Commander recommendations (`recommendations`) | decks, you, plus rules | exact | yes, 4 | canvas:572-578; AUDIT:78-79 |
| Availability and claims (`availability`) | you | exact | yes, 5 | canvas:579-585 |
| Prices (`prices`) | list (was untagged) | exact | yes, 3 | canvas:586-592; AUDIT:10-12 |
| Stand-ins and Find a deck (`stand-ins`) | rules, decks, plus you | partial | yes, 2 | canvas:593-599; AUDIT:78 |
| Written text and credits (`written`) | model | written | no | canvas:600-606 |

The "plus" tags come from AUDIT correction 8. It does not state their order.

## `HowRow` container

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Top hairline | 1px `--border` | 1px `--border` | README:90; canvas:211, :288 |
| Rows list margin-top (under key) | 12px | 16px | canvas:209, :286 |
| Row id | `how-{id}`, e.g. `#how-roles` | same | README:147; canvas:520 |
| Initial state | closed | closed | README:145 |

## `HowRow` head (`button`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Element | `button[aria-expanded][aria-controls]` | same | README:91; STATES:9 |
| `aria-controls` | `how-x-body` (the row's body id) | same | STATES:9; README:158 |
| min-height | 52px | 44px | README:91; canvas:212, :289 |
| Padding | 9px / 8px | 6px / 10px | README:91; canvas:212, :289 |
| Bleed | `-mx-8` (margin 0 -8px) | `-mx-10` (margin 0 -10px) | README:92-93; canvas:212, :289 |
| Radius | 6px | 6px | README:91, :206 |
| Layout | flex, `align-items:center`, gap 10px; left column (title, then tags line), then the disclosure | flex, `align-items:center`, `flex-wrap:wrap`, gap 6px row / 10px column: title, tags, spacer (`flex:1`), verdict, chevron | canvas:212-218, :289-295 |
| Left column | `flex:1; min-width:0`; column, gap 6px (the second line sits 6px under the title) | — | README:99; canvas:290 |
| Background | transparent; `--elevated` when landed | transparent; `--elevated` when landed | README:150; canvas:610 |

## `HowRow` title (`h3`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Font | IBM Plex Sans 14.5px / 600 | IBM Plex Sans 14px / 600 | README:95; canvas:213, :291 |
| Line-height | 1.35 | — | canvas:291 |
| Color | `--fg` | `--fg` | README:95 |
| Margin | 0 | 0 | canvas:213 |
| tabindex | -1 | -1 | README:95; STATES:11 |

## `HowRow` verdict

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Values | `exact`, `partial`, `exact and partial`, `written` | same | README:101 |
| Font | IBM Plex Mono 10.5px | IBM Plex Mono 10.5px | README:97; canvas:216, :292 |
| Color | `--fg-faint`, never colored per verdict | same | README:97, :101 |
| Position | on the second line after the tags, margin-left 4px | pushed right by a `flex:1` spacer | README:97-99; canvas:215-216, :292 |

## `HowRow` disclosure (▾ / ▴)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Glyph | ▾ closed, ▴ open | same | README:98; canvas:403, :611 |
| Font | IBM Plex Mono 11px | IBM Plex Mono 10px | README:97-98; canvas:217, :294 |
| Color | `--fg-faint` | `--fg-faint` | README:98 |
| Box | 44x44, `flex:none`, content justified to the end (right) | width 14px, text right-aligned | README:99; canvas:217, :294 |

## `HowRow` open body (`dl`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| id | `how-x-body` | same | STATES:9 |
| margin-top | 6px | 4px | canvas:323, :405, :489 |
| Layout | flex column; each field is a column with gap 3px | grid, `128px minmax(0,1fr)` | README:104, :109; canvas:323-325, :405 |
| Gaps | 12px between fields | 9px row / 16px column | README:104, :109-110; canvas:323, :405 |
| padding-bottom | 16px | 14px | README:104; canvas:323, :405 |
| Field order | comes from, decided by, refreshes, exact or partial, then explained in when the row has entries | same | README:107-108; canvas:537 |

## `HowRow` label (`dt`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Font | IBM Plex Mono 10.5px | IBM Plex Mono 10.5px | README:105; canvas:326, :407 |
| Color | `--fg-faint` | `--fg-faint` | README:105 |
| padding-top | — (3px gap above the sentence) | 2px | README:105, :109; canvas:407 |

## `HowRow` sentence (`dd`)

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Size / line-height | 13.5px / 1.55 | 13px / 1.55 | README:106, :110; canvas:327, :408 |
| Color | `--fg-body` | `--fg-body` | README:106 |
| Margin | 0 | 0 | canvas:408 |
| text-wrap | pretty | pretty | canvas:327, :408 |
| Exact row's last field | one short statement ("Exact.") | same | README:118-119 |

## Brackets last field: sub-rows

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Lead text | "Partial, count by count:" | same | README:111; canvas:550 |
| Sub-rows | Game Changers, Mass land denial, Extra turns, Two-card infinites, Tutors | same | README:112-113; canvas:551-555 |
| Source keys | `deckAnalysisCopy.detection`, whose keys are `landDenial` and `combos` | same | README:113-114; AUDIT:59-60 |
| Hairline | 1px `--border` top | 1px `--border` top | README:112; canvas:408 |
| Spacing | — | margin-top 7px, padding-top 7px | canvas:408 |
| Label | 12.5px / 600 `--fg` | 12.5px / 600 `--fg` | README:112; canvas:408 |
| Sentence | block, margin-top 2px (inherits the `dd` type) | block, margin-top 2px | canvas:408 |
| Game Changers tag | `published list` | same | AUDIT:10-12 |
| Tutors text | The decisions sheet's Tutors row, read from the same keys as the other four: `detection.tutors.from` then `detection.tutors.misses`. Brief §5.5 measured it (`TUTOR_DETECTION`), replacing the canvas's "Not measured yet." placeholder | same | README:224-225; AUDIT:67-68; brief §5.5 |

## `explained in` field

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Drawn when | the row has entries; otherwise no pair | same | README:107-108; STATES:13 |
| `dt` | mono 10.5px `--fg-faint`, label "explained in" | same, padding-top 2px | canvas:331, :411 |
| `dd` layout | flex column; one link per row | flex, wrap, gaps 4px row / 14px column | README:115-117; canvas:332, :412 |
| Link size | 13.5px | 13px / 1.55 | README:116; canvas:332, :412 |
| Link color | `--accent` | `--accent` (canvas global `a` rule) | README:116; canvas:18, :332 |
| Link underline | none (`border-bottom:none`) | 1px solid accent at 35% alpha, a canvas global rule that the README does not state | canvas:18, :332 |
| Link hover | — | canvas: a lighter accent, #FF62A9, with a matching border | canvas:19 |
| Link height | min-height 44px, flex, `align-items:center` | — | README:117; canvas:332 |
| Target | the entry's anchor, pointing back up the page | same | README:18; canvas:495 |
| Entry absent (switch off) | omitted from the list | same | STATES:21 |

## Hash landing

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Trigger | `location.hash` names a row (`#how-roles`) | same | README:147; STATES:33 |
| Order | open the row **before** scrolling, so the landing measures the open height | same | README:147-148; AUDIT:77 |
| Scroll margin | 20px (`scroll-mt-[20px]`) | 20px | README:149 |
| Wash | head background `--elevated` | same | README:150; STATES:11; canvas:610 |
| Focus | moves to the row's `h3` (tabindex -1) | same | README:151; STATES:11 |
| Wash clears | when the row leaves the upper 30% band (`rootMargin: "0px 0px -70% 0px"`) | same | README:152-153 |
| Other open rows | stay open | stay open | canvas:520 |
| Animation | none beyond R6's existing wash | none | README:156 |

## Interactions

| Property | Mobile (390) | Desktop (1300) | Source |
|---|---|---|---|
| Toggle | a press toggles the row | same | README:145 |
| Single-open | no; any number of rows can be open | no | README:145 |
| Persistence | the row stays open for the visit; nothing is persisted | same | README:145-146; STATES:34 |
| State | `openRows: Set<string>`, seeded from the hash | same | README:164; STATES:33 |
| `aria-expanded` | false when closed, true when open | same | STATES:9-10 |

## State coverage

| State | Head | Body | Mobile notes | Desktop notes | Source |
|---|---|---|---|---|---|
| Closed | title, tags, verdict, ▾ | none | two lines; 44px disclosure at the right; ≥52px | one line, verdict pushed right; ≥44px | STATES:9; canvas:210-218 (2a), :287-297 (3a) |
| Open | same, with ▴ | four `dt/dd` pairs, then `explained in` when it has entries | labels stacked, 3px / 12px | 128px grid | STATES:10; canvas:323-334, :398-414 |
| Hash-landed / washed | head on `--elevated` | open | focus on `h3`; 20px from the top | same | STATES:11; canvas:315, :481 |
| Exact row (Availability) | verdict `exact` | last field "Exact." | — | — | README:118; canvas:584 |
| Partial row (Brackets, Roles, Stand-ins) | verdict `partial` | last field names what it misses; Brackets has sub-rows | — | — | README:111-119; canvas:550, :563, :598 |
| Mixed row (Themes) | verdict `exact and partial` | last field splits the two | — | — | canvas:565-571 |
| Written row | verdict `written`, tag `model-written` | last field "Neither. It is written, not measured."; no `explained in` | — | — | canvas:600-606 |
| Row with no entries (Written) | as open | no `explained in` pair | — | — | STATES:13; canvas:524 |
| Prices, open-1 (retired) | tag `published list` | as open | — | — | AUDIT:10-12, superseding STATES:12 |

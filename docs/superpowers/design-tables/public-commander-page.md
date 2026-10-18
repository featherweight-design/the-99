# Design Property Table — Public commander page (F3 PR 3)

Source: `design/design_handoff_the99_public_pages/` at origin/main. Boards: B1 `cmd-full-{1300,390}`, B2 `cmd-noprose-*`,
B3 `cmd-absent-*`, B4 `cmd-degraded-*`, C4 `fragments.dc.html` (commander half). Comparison boards for the shared shell:
A1 `Main.dc.html` (1300) and `card-single-390.dc.html`.

Token map (`:root`, default theme Low Sun): `--bg #14110E`, `--surface #1E1A15`, `--surface-raised #211D18`,
`--surface-rail #1A1611`, `--surface-sunken #18140F`, `--elevated #29241F`, `--elevated-hover #201C17`, `--border #2B241B`,
`--border-strong #3A3229`, `--border-dashed #494037`, `--fg #EDE6D8`, `--fg-body #C0B8A6`, `--fg-muted #A59C89`,
`--fg-faint #8B8270`, `--fg-locked #6E6654`, `--accent #CF8745`, `--accent-hover #DE9757`, `--warning #DEAA29`,
`--bracket-1..5`, `--w/u/b/r/g`. Fonts: `--display` Cinzel, `--sans` IBM Plex Sans, `--mono` IBM Plex Mono.
Raw values with no token: the mark's `#CF8745` (= `--accent`) and `#EDE6D8` (= `--fg`) fills; the 390 wash gradient
`rgba(20,17,14,…)` (= `--bg` at alpha); the Scryfall underline `rgba(222,151,87,.45)` (= `--accent-hover` at 45%).

Errata applied from READINESS-audit: #3 (no prose in `degraded`, build as drawn), #2 (similar always resolve), #9 (the
absent note's em dash is routed to copy review; the canvas value is recorded as drawn, the build string is copy review's),
#10 (DEFAULT_THEME). None changes a drawn value.

Hover: the canvases set only a global `a{color:#DE9757} a:hover{color:#EDE6D8}` rule. Every commander-page link carries an
inline `color`, which beats that rule, so **no hover or focus state is drawn for any commander-page element** (—). Record
any hover in the build as unspecified by design, not as a mismatch.

Copy keys (structure only): `COMMANDER_PAGE.{kicker, cardLink, why, onEdhrec, figuresFrom, rank, decks, themes, themesSub,
brackets, bracketsSub(n), mostPlayed(short), mostPlayedSub(short), similar, similarSub, absentTitle(short), absentBody,
degradedTitle, degradedBody}`, `BRACKET_NAMES[1..5]`, `PUBLIC_SHELL.*`, `SIGNED_OUT_BLOCK.*`. No key exists for the identity
name label (`Simic`, `Blue`, `Red`, `Golgari`).

---

## Component: Shared shell (differences from the card page only)

### B-01 Top bar
| Property | Mobile | Desktop |
|---|---|---|
| Identical to card page (A1 / card-single-390) | yes: 56px, padding 0 8px 0 16px, 30px mark, `The 99`, `Search Scryfall ↗` 13.5px | yes: 64px, padding 0 40px, 34px mark, `The Ninety-Nine`, `Find another card on Scryfall ↗` 14px |
| Differences | — | — |

### B-02 Page frame / main
| Property | Mobile | Desktop |
|---|---|---|
| main padding | 20px 16px 36px (card page: 22px 16px 36px) | 44px 40px 80px (card page: 52px 40px 80px) |
| grid | — (single column, no grid) | max-width 1120px (card page 1104px); margin 0 auto; grid-template-columns 384px minmax(0,1fr); gap 64px; align-items start (same as card) |
| left column | — | flex column; gap 14px; NO align-items (card page: gap 18px, align-items center); the card is centred by `align-self: center` on its wrapper |
| right column | — | min-width 0; flex column; gap 40px; padding-top 6px; NO max-width on the column (card page: max-width 640px, padding-top 8px). Each section sets its own max-width (640 or 680) |
| footer stub | padding 20px 16px 28px; 116px dashed stub (same) | padding 26px 40px 32px; 68px dashed stub (same) |

### B-03 Card image
| Property | Mobile | Desktop |
|---|---|---|
| placement | inside the art wash band above `<main>` (same pattern as card page) | first item of left column, wrapper `align-self: center` |
| size | 248×346px (card page 272×380) | 344×481px (card page 336×469) |
| border-radius | 13px (card page 14px) | 14px (same) |
| transform / shadow / bg | perspective(1000px) rotateX(2.5deg) rotateY(-4deg); shadow `0 0 0 1px rgba(0,0,0,.3) inset, 0 24px 50px rgba(0,0,0,.55)`; bg `--elevated`; overflow hidden (same) | same |
| img | object-fit cover, alt = commander name | same |
| printing caption (`SOC · 8`) | — (absent; card page has one) | — (absent; card page has one) |
| flip control | not drawn on any commander board | not drawn |

### B-04 Art wash band (390 only)
| Property | Mobile | Desktop |
|---|---|---|
| container | position relative; overflow hidden; padding 26px 0 24px (card page 28px 0 22px); display flex; justify-content center (card page: flex-direction column, align-items center); bg `--surface-sunken` | — |
| blurred art | absolute inset 0; object-fit cover; filter blur(28px); scale(1.25); opacity .55; alt "" aria-hidden (same) | — |
| gradient | linear-gradient(180deg, rgba(20,17,14,0) 40%, rgba(20,17,14,.92) 100%) (same) | — |

### B-05 Signed-out block
| Property | Mobile | Desktop |
|---|---|---|
| block internals | identical to card page (section aria-label `About The 99`, radius 12, border 1px `--border`, bg `--surface-rail`, padding 18px 16px / 20px 22px, 30px mark, title Cinzel 600 16px, body 13.5/1.6 `--fg-body`, Sign in 44px, fine print mono 11px) | identical |
| position | after the last section, wrapper margin-top 36px (card page 32px) | last in left column, after the card link; wrapper margin-top 12px (card page 22px, `align-self: stretch`) |
| B3/B4 | same position (after the note), margin-top 36px | same position |

---

## Component: Heading block

Position: **1300: in the LEFT column under the card** (card page puts its h1 in the right column). **390: top of `<main>`**.
No mana cost is drawn on any commander board (the card page draws `ManaCost`).

### B-06 Kicker `Commander`
| Property | Mobile | Desktop |
|---|---|---|
| font | var(--mono) 10.5px | var(--mono) 10.5px |
| letter-spacing / transform | .14em / uppercase | .14em / uppercase |
| color | --fg-faint | --fg-faint |
| wrapper | — (direct child of main) | wrapper div: margin-top 10px; flex column; gap 4px (holds kicker, h1, type line) |

### B-07 Name `<h1>`
| Property | Mobile | Desktop |
|---|---|---|
| font | var(--display) 700 24px / 1.15 | var(--display) 700 24px / 1.15 |
| color | --fg | --fg |
| margin | 6px 0 0 | 2px 0 0 (+ wrapper gap 4px) |
| text-wrap | — | — |

### B-08 Type line
| Property | Mobile | Desktop |
|---|---|---|
| font | sans 13px (no line-height set) | sans 13px |
| color | --fg-body (card page uses --fg-muted, 14/15px) | --fg-body |
| margin | margin-top 6px | — (wrapper gap 4px) |

### B-09 Identity row (pips + name)
| Property | Mobile | Desktop |
|---|---|---|
| wrapper | margin-top 10px div → flex, align-items center, gap 5px | flex, align-items center, gap 5px (left-column gap 14px above) |
| pip | 14×14px circle, radius 50%, bg `--{w,u,b,r,g}` per identity color, box-shadow inset 0 0 0 1px rgba(0,0,0,.4), inline-block | 16×16px, same otherwise |
| pip order | as listed: Zimone G then U; Dina B then G | same |
| label | margin-left 4px; mono 12px; --fg-faint; text = color-pair/guild name (`Simic`, `Blue`, `Red`, `Golgari`) | same |
| colorless | not drawn | not drawn |

### B-10 Card-page link `The card, its text and printings →`
| Property | Mobile | Desktop |
|---|---|---|
| wrapper | margin-top 10px; border-top AND border-bottom 1px --border | border-top 1px --border; padding-top 4px; no bottom border |
| link | inline-flex; align-items center; gap 8px; min-height 44px; sans 14px 600; color --accent; no underline | same |
| arrow | `→` (U+2192) span aria-hidden, inherits color | same |
| href | the card page | same |
| rendered in | every state (B1–B4) | every state |

---

## Component: Right-column sections (390: one flex column, gap 32px, margin-top 28px; 1300: right column gap 40px)

Section order: **Why this commander → On EDHREC → Themes → Brackets → Most played with {short} → Similar commanders**.
In B3/B4 the column holds ONLY the note.

### B-11 Section heading `<h2>` (Themes, Brackets, Most played, Similar)
| Property | Mobile | Desktop |
|---|---|---|
| font | var(--display) 600 18px / 1.25 | var(--display) 600 20px / 1.25 |
| color / margin | --fg / 0 | --fg / 0 |

### B-12 Section sub-line (mono caption under each h2)
| Property | Mobile | Desktop |
|---|---|---|
| font | var(--mono) 11.5px / 1.5 | same |
| color | --fg-faint | --fg-faint |
| margin | margin-top 4px | same |
| keys | themesSub, bracketsSub(n), mostPlayedSub(short), similarSub | same |

### B-13 `Why this commander` section
| Property | Mobile | Desktop |
|---|---|---|
| element | section aria-labelledby="why", max-width 640px | same |
| h2 | id why; display 600 18px; NO line-height set; --fg; margin 0 | display 600 20px; no line-height; --fg; margin 0 |
| p | margin 10px 0 0; sans 16px / 1.6; --fg-body; text-wrap pretty | margin 10px 0 0; sans 17.5px / 1.6; --fg-body; text-wrap pretty |
| render | only when `prose` non-null (B2/B3/B4 unmount the whole section, heading included) | same |

### B-14 On EDHREC card — container
| Property | Mobile | Desktop |
|---|---|---|
| element | section aria-label="On EDHREC" | same |
| radius / border / bg | 14px / 1px solid --border / --surface-rail | same |
| padding | 18px 16px | 22px 24px |
| max-width / box-sizing | 640px / border-box | same |
| position | first section when prose is null (B2) | same |

### B-15 On EDHREC card — head row
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex; justify-content space-between; align-items baseline; gap 12px | same |
| left label `On EDHREC` | mono 11px; letter-spacing .14em; uppercase; --fg-faint | same |
| right `figures from EDHREC` | mono 11px; --fg-faint; no transform | same |

### B-16 On EDHREC card — figures row
| Property | Mobile | Desktop |
|---|---|---|
| row | flex; gap 36px; margin-top 14px | flex; gap 56px; margin-top 14px |
| each stat | flex column; gap 6px | same |
| figure | mono 600 34px / .95; --fg | mono 600 44px / .95; --fg |
| rank format | `#203` (hash prefix, no thousands sep needed) | same |
| decks format | `11,687` (thousands separator) | same |
| label | sans 13px; --fg-body; `Rank` / `Decks` | same |
| rank blank (C4) | Rank stat drops; Decks stands alone (same row, first position) | same (drawn at 1300 only) |
| both blank (C4) | whole card unmounts; Themes moves up; never `—` | same |

### B-17 Themes — section and chip list
| Property | Mobile | Desktop |
|---|---|---|
| section max-width | 680px | 680px |
| list | flex; flex-wrap wrap; gap 8px; margin-top 14px | same |
| chip | inline-flex; align-items center; gap 7px; height 34px; padding 0 12px; border-box; radius 8px; border 1px --border; bg --surface | same |
| chip label | sans 13.5px; --fg-body | same |
| chip count | mono 11px; --fg-faint; thousands sep (`1,213`) | same |
| interactive | no (span, not a link) | same |
| count shown | B1: 8 chips; B2: 6 chips (no cap stated) | same |
| order | descending by count | same |

### B-18 Brackets — section and rows
| Property | Mobile | Desktop |
|---|---|---|
| section max-width | 640px | 640px |
| sub-line n | sum of all bracketCounts, thousands sep (`2,111` = 8+851+1141+102+9) | same |
| list | flex column; gap 4px; margin-top 12px | same |
| row | grid; columns 26px 82px minmax(0,1fr) 52px; align-items center; gap 12px; min-height 36px | grid; columns 26px **92px** minmax(0,1fr) 52px; same otherwise |
| rows shown | all five, 1→5, in order (including small counts) | same |
| mark | BracketMark at 26: span relative inline-flex 26×26, color --bracket-N; svg 26×26 viewBox 0 0 40 40 aria-hidden; numeral absolute inset 0 centred, display 700 10px / 1 | same |
| name | sans 13.5px; --fg-body; BRACKET_NAMES[N] | same |
| bar track | height 8px; radius 99px; bg --elevated; overflow hidden; block | same |
| bar fill | height 100%; radius 99px; bg --bracket-N; width = count / MAX(count) (largest = 100.0%; e.g. 8/1141 = 0.7%) | same |
| count | mono 12px; --fg; text-align right; thousands sep | same |
| zero-count bracket | not drawn | not drawn |

### B-19 Most played with {short} — section and list
| Property | Mobile | Desktop |
|---|---|---|
| section max-width | 640px | 640px |
| h2 / sub | uses the commander's short name (`Zimone`, `Sai`) | same |
| list wrapper | margin-top 12px; border-bottom 1px --border | same |
| row (a) | grid; columns minmax(0,1fr) auto 18px; align-items center; gap 14px; min-height 46px; border-top 1px --border; no underline; href = that card's public page | same |
| name | sans 14.5px; --fg | same |
| figure | mono 12px; --fg-muted; `inclusion` as whole percent (`96%`) | same |
| arrow | `→` aria-hidden; --accent | same |
| image | — (no thumbnail; imageUri unused) | — |
| synergy | — (not shown) | — |
| items shown | 6 (both B1 and B2); loader cap SIGNATURE_LIMIT 12 | 6 |
| order | descending inclusion | same |

### B-20 Similar commanders — section and tiles
| Property | Mobile | Desktop |
|---|---|---|
| section max-width | 680px | 680px |
| grid | grid; repeat(1, minmax(0,1fr)); gap 8px; margin-top 14px | grid; repeat(2, minmax(0,1fr)); gap 8px; margin-top 14px |
| tile (a) | flex; align-items center; justify-content space-between; gap 10px; min-height 46px; padding 0 14px; radius 8px; border 1px --border; bg --surface; no underline; href = that commander's public page | same |
| name | sans 14px; --fg; nowrap; overflow hidden; text-overflow ellipsis | same |
| arrow | `→` aria-hidden; --accent | same |
| image | — (imageUri unused) | — |
| figure | — | — |
| items shown | 6 (B1, B2); loader cap SIMILAR_LIMIT 12 | 6 |
| order | loader order (EDHREC, closest first) | same |

---

## Component: State notes (B3 / B4) — sole content of the right column (1300) / the sections column (390)

### B-21 Absent note (B3)
| Property | Mobile | Desktop |
|---|---|---|
| element | div role="note" | same |
| max-width | 640px | 640px |
| radius / bg | 8px / --elevated-hover | same |
| border | 1px solid --border-strong; border-left 2px solid --fg-faint | same |
| padding | 13px 16px | same |
| layout | flex; gap 10px | same |
| glyph | `⚠` (U+26A0) span aria-hidden; 13px; --fg-faint; line-height 1.6 | same |
| p | margin 0; sans 13.5px / 1.6; --fg-muted | same |
| title (b) | 600; --fg-body; `absentTitle(short)` | same |
| body | `absentBody`, follows the bold title inline (drawn with an em dash; see audit #9) | same |

### B-22 Degraded note (B4)
| Property | Mobile | Desktop |
|---|---|---|
| element | div role="note" | same |
| max-width | 640px | 640px |
| radius / bg | **9px** / --surface-sunken | same |
| border | 1px solid --border; border-left **3px** solid --warning | same |
| padding | 13px 16px | same |
| layout | — (no flex, no gap) | same |
| glyph | — (none) | — |
| p / title / body | p margin 0; 13.5/1.6; --fg-muted; b 600 --fg-body `degradedTitle`; then `degradedBody` | same |
| Retry | — (explicitly none) | — |

---

## State Coverage

Loader: `PublicCommander` (`src/lib/public/commander.ts`). When `state !== "ok"` the loader already nulls `rank`, `deckCount`,
`prose`, `engine` and empties `tags`, `bracketCounts`, `budgetCounts`, `similar`, `signature`.

| State | Board | Condition | Heading + card link + block | Why | On EDHREC | Themes | Brackets | Most played | Similar | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 full | cmd-full | state "ok", prose non-null, rank & deckCount non-null | yes | yes | Rank + Decks | 8 chips (label + count) | 5 bar rows | 6 rows, inclusion % | 6 tiles (2 col / 1 col) | — |
| B2 no prose | cmd-noprose | state "ok", prose null | yes | unmounted (heading too) | leads the column | 6 chips | 5 rows | 6 rows | 6 tiles | — |
| B3 absent | cmd-absent | state "absent" | yes | — | — | — | — | — | — | grey note (B-21) only |
| B4 degraded | cmd-degraded | state "degraded" (prose null per loader; audit #3) | yes | — | — | — | — | — | — | warning note (B-22) only |
| Rank blank | fragments | state "ok", rank null, deckCount non-null | yes | per prose | Decks only | per data | per data | per data | per data | — |
| Both blank | fragments | state "ok", rank null AND deckCount null | yes | per prose | unmounted; Themes moves up | per data | per data | per data | per data | — |

Not drawn (build must decide or omit): `tags` empty, `bracketCounts` empty, `signature` empty or `similar` empty while state
is "ok"; a single similar item at 1300 (odd count in the 2-col grid); `deckCount` blank with `rank` present; a theme cap.
Fields never rendered: `engine`, `budgetCounts` (README call 3), `synergy`, `imageUri` of list items, `manaCost`,
`oracleText`, `artCropUri` (link preview only, C2).

Shapes: Themes = wrap list of non-interactive chips (label + mono count). Brackets = five-row bar chart (mark, name, bar
scaled to the largest count, mono count), sub-line total = sum. Most played = divided link rows with inclusion %. Similar =
bordered name tiles, 2-col grid at 1300, 1-col at 390.

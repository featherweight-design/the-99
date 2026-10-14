# Upcoming precons and the Home banner: states matrix (R1)

Fixtures: `trc` Star Trek Commander (2026-11-13, 15 cards from 16 printings, Chapel at 78 and 300), `mdc` Darkhold
Destiny Commander (2027-04-09, Gargantos, B G). "Today" is 2026-10-14 UTC unless a row says otherwise.

## T · Precons page, tiles (`R1 - Precons-Tiles.dc.html`)

| # | State | 900 | 390 |
|---|---|---|---|
| T1 | **No upcoming sets** | As shipped. No heading, no empty group. | Same. |
| T2 | **One set, none revealed** | Dashed block: name, `MDC · Apr 9, 2027 · in 6 months · no commanders revealed yet`, one `none revealed yet` plate (84 × 117). | Date and code lines split; plate 76 × 106. |
| T3 | **One set, one revealed** | Block full width, one card at its left, not stretched. | Same. |
| T4 | **One set, fifteen revealed** | Two rows, nine then six. `new` tag beside the name (unseen at load). | One row scrolling sideways, the fifth card cut at the edge. |
| T5 | **Two sets** (live) | Star Trek then Darkhold, soonest first. Heading `Announced · 2 sets`. | Same order. |
| T6 | **Search or color on** | `chapel`: Star Trek with one card, `1 of 15 revealed matches`. Darkhold leaves. Result `0 of 197 decklists · 1 announced set`. No no-match state. | Same. |
| T7 | **Most owned** | Group hidden (not drawn). | Same. |
| T8 | **Empty collection** | The empty band stays above the group, as shipped (not drawn). | Same. |
| T9 | **Read failed** | As T1. Nothing is said. | Same. |

## R · Precons page, rows (`R1 - Precons-Rows.dc.html`)

| # | State | 900 | 390 |
|---|---|---|---|
| R1 | **Two sets** | One dashed row per set: name (display 16) + `in 30 days` (mono 12, `--fg-body`) on line 1; names joined ` · ` (mono 11, `--fg-muted`), wrapping; `TRC · releases Nov 13, 2026 · 15 commanders revealed` (mono 10.5, `--fg-faint`). No art. | Name 14.5, `when` 11. Names wrap to about five lines. |
| R2 | **None revealed** | Names line: `No commanders revealed yet`. | Same. |
| R3 | **No upcoming sets** | As shipped. | Same. |

## L · From announced to precons (`R1 - Precons-Landing.dc.html`)

| # | State | What changes |
|---|---|---|
| L1 | **Release day, lists not listed** (2026-11-13) | Star Trek stays first. Meta reads `out Nov 13, 2026 · decklists not listed yet`. Needs G3. |
| L2 | **Some lists listed, set not out** | Block stays and adds the jump `2 decklists listed ↓` (to the year group). Listed precons are tiles in 2026 with `new ·` in the meta. Revealed commanders aren't matched to decks. |
| L3 | **Lists landed, set out** | Block leaves; `Announced · 1 set` (Darkhold). Star Trek's precons lead 2026 with `new ·`, for 14 days from each precon's own arrival. |
| L4 | **14 days later** | Tiles read as shipped (not drawn). |

## H · Home banner (`R1 - Home-Banner.dc.html`)

| # | State | Desktop (1280) | 390 |
|---|---|---|---|
| H1 | **No banner** (nothing in 30 days, all seen, or read failed) | Home as shipped, no slot held. | Same. |
| H2 | **One arrival: set announced** | One band, 46px min: mark, sentence, `See it in Precons` inline after it, ✕ 32 × 32 at the end. | Sentence wraps; link on its own line; ✕ 44 × 44 top right. |
| H3 | **One arrival: lists listed** | `Star Trek Commander: 4 decklists listed.` · `See them in Precons` (to the year group). | Same shape as H2. |
| H4 | **Several (five)** | Heading `5 new in Commander precons` with the link and ✕ on the heading line; three lines two across, then `and 2 more`. | Lines stack; link last on its own 44px line. |
| H5 | **Beside the About sheet** | Banner in the page, sheet beside the rail. Both up. | Banner in the page, sheet as the foot card above the tab bar. Both up. |
| H6 | **Seen** (after ✕, or after opening Precons) | As H1. | As H1. |
| H7 | **First-run account** | Checklist page, no banner, nothing marked. | Same. |
| H8 | **Focus** | Link focused: 2px `--accent` ring, 2px offset. | ✕ focused, the same ring. |

## Rules the matrix comes from

1. **An announced set is never a precon.** It has no tile shell, figure, link or Start. Its block is dashed.
2. **Every commander is named in text,** under its art, or in the names line in rows.
3. **One card per card.** Printings merge by oracle id; the lowest collector number draws.
4. **The date leads, the countdown follows,** both on the UTC day.
5. **An arrival is told once.** The banner shows until ✕ or a Precons visit; each set is one line however many lists
   it brings; an announced-then-listed set the reader never saw is one line, not two.
6. **Shown is not seen.** Only ✕ or opening Precons writes the marker.
7. **The banner is in the page.** It never overlays, never yields to the About sheet and never makes it yield.
8. **Nothing is said about a failure.** A failed read draws the shipped page and no banner.

## R2 · Collapsible group and quiet rows (`R2 - Precons.dc.html`)

| # | State | What changes |
|---|---|---|
| C1 | **Closed (default)** | Heading row only: `Announced · 2 sets · next Nov 13 ▸`. Decklists start one row lower than shipped. |
| C2 | **Open by itself** | A set unseen at load (`new`), or arrived by `#announced`. Blocks as R1 T5. |
| C3 | **Focus on the heading** | 2px `--accent` ring around the heading button. |
| Q1 | **Rows, closed** | As C1. |
| Q2 | **Rows, open** | One precon-shaped dashed row per set: a thumb, name + countdown, first commander `and N more`, then dots + code and date. |
| Q3 | **Rows, a set opened** | The row's cards under a dashed rule; wraps at 900 and scrolls at 390. |

Rule 9 (R2): **the group never pushes the decklists down unasked.** It's closed unless it holds news.

## R2 · About in the banner, proposal (`R2 - Home-About.dc.html`)

| # | State | What it shows |
|---|---|---|
| A1 | **About bump only** | `2 new in About: {titles}.` · `Show me`. ✕ marks it seen. |
| A2 | **About + arrival** | Heading `New in the app` + ✕; About's line first, each line with its own link. |
| A3 | **First-run** | On the checklist page: `What The 99 does: … on one page.` · `Show me`. No precons lines. |

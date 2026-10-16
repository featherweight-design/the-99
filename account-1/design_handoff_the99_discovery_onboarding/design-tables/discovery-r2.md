# Discovery R2 · property tables

Amonkhet values; every color is a theme token, so other themes follow. Copy is in `discovery-r2 · copy strings.ts`.

## The ? in the chrome

| Property | 1280 rail | 390 header |
|---|---|---|
| Place | Rail foot, above the account button, 6px gap | Header right, 6px left of the account button |
| Box | 38×38, radius 10 (a nav item) | 44×44, radius 12 |
| Glyph | `?`, IBM Plex Mono 16 / 500 | `?`, IBM Plex Mono 17 / 500 |
| Rest | transparent, `--fg-faint` | transparent, `--fg-muted` |
| Open | `--elevated`, `--fg`; `aria-expanded="true"` | the same |
| Name | `About this screen` | the same |

## The ? panel and sheet (`HelpSheet`)

| Property | 1280 panel | 390 sheet |
|---|---|---|
| Frame | 400 wide, full height, right edge; `--surface-rail`; 1px `--border-strong` on its left; shadow `-24 0 60 / 50%` | 390 × 684, bottom; radius 18 18 0 0; grabber 40×4 `--border-dashed`; scrim `rgba(10,8,6,.62)` |
| Modal | No: the page stays usable | Yes |
| Eyebrow | `ABOUT THIS SCREEN`, Plex Mono 11, .12em, `--fg-faint` | the same |
| Title | Cinzel 20 / 600 `--fg`: `A deck · Shopping` | the same |
| Close | bare ✕, 44 hit, `--fg-muted` | the same |
| Search | 44 tall, radius 10, `--surface-sunken`, 1px `--border-strong` (`--accent` while it holds text) | the same |
| Section head | Plex Mono 11, .12em, `--fg-muted`; count right, `--fg-faint` | the same |
| Row | title Plex Sans 14.5 / 500 `--fg`; first sentence 13 / 1.45 `--fg-muted`; 12px padding; 1px `--border` under | the same |
| Open row | `--surface`, radius 10, inset 12; paragraph 13.5 / 1.55 `--fg-body`; keys with an `--accent` dot | the same |
| Show me | 30 tall pill, 1px `--border-strong`, Plex Mono 11.5 `--accent` | the same |
| Elsewhere chips | 34 tall pills, `--surface`, 1px `--border-strong`, label 13 `--fg-body`, count Plex Mono 11 `--fg-faint` | the same |
| Result | screen Plex Mono 11 `--fg-faint`; title 14.5 / 500; match `--accent-dim` fill, `--fg` | the same |
| Footer | `--surface-rail`, 1px `--border` top; `Tools ›` `--fg-muted`, `All of About ›` `--accent`, Plex Mono 12.5 | 22px bottom padding |

## A tool card (`ToolCard`)

| Property | Value |
|---|---|
| Size | 354 × 530 in the 1280 grid (3 columns, 22 gap); 300 × 460 in the 390 row (12 gap, 16 inset, next card peeking) |
| Frame | `--surface`, 1px `--border`, radius 14, clip |
| Picture | 3:2, `--bg` behind, 1px `--border` under; the capture at 390, 2x |
| Halo | radius 9; `0 0 0 2px accent/75%, 0 0 0 6px accent/20%`, plus `0 0 0 2000px bg/28%` dimming the rest |
| Name | Plex Sans 16 / 600 `--fg` |
| Cost chip | Plex Mono 11 `--fg-muted`, 1px `--border-strong`, pill |
| Line | Plex Sans 14 / 1.5 `--fg-body` |
| Try it | at least 44 tall, 1px `--accent`, radius 10, Plex Sans 14.5 / 600 `--accent`, centered, wraps to two lines |
| None fits | 1px dashed `--border-dashed`, radius 10; Plex Mono 12 / 1.5 `--fg-muted`; door Plex Sans 14 / 600 `--accent` |
| More / How it works | Plex Mono 12; `--fg-muted` / `--fg-faint` |

## About's tabs, and the Reference

| Property | Value |
|---|---|
| Title | Cinzel 34 / 600 at 1280, 27 at 390 |
| Tabs | Plex Sans 16; selected 600 `--fg` with a 2px `--accent` underline; count Plex Mono 12 (`--accent` when selected) |
| Group head (Tools) | Cinzel 21 (19 at 390) and a Plex Mono 12 `--fg-faint` sub |
| Screen head (Reference) | Cinzel 19, route and count Plex Mono 11.5 `--fg-faint`, 1px `--border-strong` under |
| Entry row (1280) | grid 300 / 1fr / 56 / 16; title 14.5 / 500; first sentence 13 `--fg-faint`, one line; `in Tools` Plex Mono 10.5 `--accent`; ⌄ |
| Screen row (390) | 50 tall; Cinzel 16 / 600; count and ⌄ Plex Mono 11.5 |
| Open entry | picture 330 wide at 1280 (beside), full width at 390 (above); caption 14 / 1.6 `--fg-body`; numbered keys |
| What's new | 1px `--accent-dim`, `--surface`, radius 12; eyebrow Plex Mono 11 `--accent`; entries as 36-tall pills |
| Screens index (1280) | 230 wide; rows 30 tall, 13.5; the current group `--fg` / 500 |
| How it works | the last section; rows 44 tall with › |

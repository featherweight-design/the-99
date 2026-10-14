# Design table sections: the read (R1)

These sections replace or add to `docs/superpowers/design-tables/help-me-choose-deeper.md`. Mobile = 390, desktop = 900, from `md` up.
Values not listed are as shipped (`deeper-look.tsx`, `read-as-bar.tsx`, `choose-row.tsx`, `intake-form.tsx`).

## Rulings that beat the old table

| # | Ruling | Effect |
|---|---|---|
| T1 | Text is never turned into chips (brief ruling 2) | Deeper chip, `deeper` tag, Not used / Still not used: **removed** |
| T2 | No separate Look deeper step | DeeperLook has no `offer` phase. It mounts in `looking` |
| T3 | Old R6 (do best fits dim?) | **Yes.** Best fits and rows both dim to 0.45 while reading |

## Component: Anything else? (form field, replaces the words field)

| Property | Mobile | Desktop |
|---|---|---|
| position | last field, after Bracket and a 1px `--border` rule | same |
| label | `extra.label`, mono 10 / .14em uppercase `--fg-faint` | same |
| tag | `extra.optional`, mono 9.5 / .06em `--fg-locked`, baseline-aligned after the label | same |
| textarea | as shipped: min-h 96 / 84, 16 / 14px, `--surface-sunken`, radius 9 | same |
| border | empty `--border-strong` · filled `--accent` · filled with no credit `--border-strong` | same |
| caption | `extra.caption` / `captionFilled` / `captionSpent`, 12 / 1.5 `--fg-faint` (spent: `--fg-muted`) | same |
| count | filled only: mono 10 `--fg-faint`, right of the caption, `{n} / 800` | same |

## Component: Find commanders (with the read)

| Property | Mobile (dock) | Desktop (panel foot) |
|---|---|---|
| button | as shipped: h 48 full width / h 44, radius 10, `--accent`, 15 / 600 | same |
| padding with pill | 0 24 0 8 | same |
| pill (box filled, credit free) | `read.cost`, inline-flex, h 32 / 30, 0 10px, radius 7, mono 11 / 600, bg `color-mix(--bg 22%)`, color `--bg` | same |
| line | mono 10, centred, under the button | mono 10.5, max-w 380, beside it, gap 18 |
| line copy | `creditsCopy.first` · `extra.spentLine` · paused / ownerShare | same |
| aria, with pill | `read.pressAria` (*1 credit. Find commanders and read what you wrote.*) | same |

## Component: Read panel (DeeperLook, re-keyed)

The geometry is the shipped table's (panel, title, tag, lead, button, pill, Stop, line), with these changes:

| Property | Value |
|---|---|
| titles | `read.pendingTitle` · `read.title` (stopped, failed, done) · `read.emptyTitle` (nothing fits) · `read.unreadTitle` |
| tags | `done` accent · `didn’t finish` danger · `stopped` **`--fg-muted` on 12% mix** (new) · none on nothing fits / unread |
| steps (looking only) | `ol`, gap 5, margin-top 4. Row: 7px dot, 12.5 text, mono 9.5 `--fg-locked` when-tag. Current: dot `--accent`, text `--fg`. Next: 1px `--border-dashed` ring, text `--fg-faint` |
| widen link (nothing fits) | 12.5 `--fg-muted`. *Change answers* in `--accent` with a 1px 50% underline |
| action column | max-w 300 on desktop |
| button labels | `read.retry` (stopped, failed) · `read.readIt` (unread, disabled) · `read.actionPending` (looking) |

## Component: Your answers (ReadAsBar, revised)

| Property | Value |
|---|---|
| label | `readAs.yourAnswers` |
| none | `readAs.noneAll` (*No answers given: every commander you haven’t built*), 13 `--fg-muted` |
| chips | as shipped, solid edge only |
| You wrote block | column, gap 4, padding-top 10, border-top 1px `--border`. Label mono 9.5 / .1em `--fg-locked` uppercase. Text 14 / 1.5 `--fg`, in curly quotes, wraps |
| removed | `notUsed`, `afterDeeper`, `chip.deeper`, `readAs.deeperMark`, `readAs.stillNotUsed` |

## Component: Reason line (ChooseRow, best fit)

| Property | Mobile | Desktop |
|---|---|---|
| renders | rows 1–10 of a read's result | same |
| place | row: after the name line, before the figure (mobile) / ownership line (desktop) · best fit: after the name, before the figures | same |
| font | 12.5 / 1.5 | 13 / 1.5 |
| color | `--fg-body`; a deck's commander span 600 `--fg` | same |
| wrap | `text-wrap: pretty`, never truncated, ≤ 3 lines | ≤ 2 lines in a row, ≤ 4 in a best-fit card |
| length | ≤ 140 characters (validated; refused over) | same |
| must not | contain a digit, `%`, a rank word or a card label | same |

## Component: Best fit (art and rank, changed)

| Property | Mobile | Desktop |
|---|---|---|
| art | 88 wide, stretches to the card's height, `cover`, centred | full width, **`aspect-ratio: 626 / 457`** (the art crop's own), no fixed height, so the commander is never cut off |
| rank | **off the art**: 20px ring, mono 10.5 / 600 `--accent`, 1px 50% accent border, first in the name line, gap 8 | over the art as shipped (26px, top-left 10) |

## Component: The rest of your results (divider)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, gap 12, margin-top 8 | same |
| label | `results.restHead`, mono 10 / .14em uppercase `--fg-faint` | same |
| rule | flex 1, 1px `--border` | same |
| tail | — | `results.restTail`, mono 10.5 `--fg-faint` |

## State coverage

See `STATES-the-read.md` rows 7a to 7n.

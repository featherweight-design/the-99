# STATES — /about, R6: the sheet, the index, the jump, the contents and its search

Brief: `docs/superpowers/design-briefs/2026-09-25-about-rethink.md` (branch `docs/about-rethink`, PR #957).
Canvas: `The 99 - About Page (R6).dc.html`. Frames are 1300×820 and 390×844.

`STATES-about.md`, `-r2`, `-r3` and `-r4` still govern the figures, the grammar, the mark and the menu
row. R6 **supersedes them wherever they disagree.** The rulings it overturns and keeps are listed in §R7.

"Wide" is ≥1000px, the About page's breakpoint. The shell's rail and tab bar switch at `md` (768px) as
they do today.

---

## §N The sheet

| # | State | Draws | Must not |
|---|---|---|---|
| N1 | Reader behind, 1–4 new | A 28px tile (radius 8, `--accent` at 16% fill and 45% hairline) holding a 9px solid `--accent` diamond, `aria-hidden`, 10px before `N new in About` (display 17/700). The diamond is the same accent diamond the account menu's About row carries (A1), so the notice and the place it points to share a mark. Every new title in page order, 13.5px (14px on a phone), with a `--border` hairline above each. **Show me** (primary), **Later** (ghost). Then the mono faint line `Always in your account menu, under About The 99.` | Make a title a link. Draw a ✕: Later is the dismiss. Draw a caption, figure, route or chapter numeral |
| N2 | Reader behind, 5 or more new | The first three titles, then mono `and N more` (N ≥ 2) | Print `and 1 more`: at four, list all four. Scroll inside the card |
| N3 | First run, `seen` 0 | The same tile, then `What The 99 does`, then one line: `One page that explains every mark, figure and status in the app, and where each one lives.` Same buttons, same last line | Print a count or list titles, since nothing is new at 0 (§6) |
| N4 | Container, wide | A 340px card on `--surface-rail`, `--border-strong`, radius 14, the sheet's shadow. It sits `left: rail + 20px; bottom: 20px`, beside the account avatar | Use a scrim. Take focus. Lock scroll. Be `aria-modal`. Sit on the rail, the avatar or the menu (H1) |
| N5 | Container, phone | Full width, 12px each side, `bottom: calc(var(--tabbar-h) + 10px)`. Both buttons are 44px and split the row. While it is open the page reserves its height at the foot | Cover any part of the tab bar. Draw a drag handle |
| N6 | Show me | Navigates to `/about` with no hash, so the page opens on the index (§O) | Deep-link into an entry |
| N7 | Later, or Escape while focus is inside | The card closes and nothing is recorded (§4.0). `seen` stays behind | Write `seen`. Show a toast |
| N8 | Ignored | It stays through client-side navigation until it is answered. A reload or a new tab doesn't bring it back: the cookie means "sheet shown for N" | Return in this browser for this version |
| N9 | Where it never draws | On `/about`, signed out, and on any route the gate exempts (`gate.ts:81-91`) | — |
| N10 | Accessibility | A region labelled `New in About` (first run: `About The 99`), announced once through a polite live region. It is the shell's last child, so it is reached in tab order after the page | Move focus into it on arrival |
| N11 | Motion | The shared `anim-sheet-in` rise, 180ms; none under reduced motion | Animate the list |

`Sheet` (`ui/sheet.tsx`) is **not** reused. It is modal, with a scrim and `aria-modal`, and this card
may be neither. The visual vocabulary is shared; the component is new (`WhatsNewCard` or similar;
the plan names it).

## §O The what's-new index

| # | State | Draws | Must not |
|---|---|---|---|
| O1 | Reader arrived behind | After the lede and before chapter 01 (on a phone, before the contents list): a `nav` labelled with the heading. It is on `--surface`, with a `--border-strong` hairline and radius 10. Its `h2` is mono 11 accent, `N new since you were last here`. One row per new entry in page order: title (14.5/500 `--fg`), then route (mono 11.5 accent). Rows are 40px on desktop, and stacked at 48px or more on a phone | Draw a caption, figure, key or chapter numeral (S1). Put a limit on the index. Link the route inside the row, which would nest a link |
| O2 | A row pressed | Hash navigation to `#entry-id`, then §P | Move the entry. Open a sheet |
| O3 | Current reader, `seen` 0, or a reload after the visit | No index and nothing in its place. The lede runs into the contents on a phone and into chapter 01 on desktop | Say "you're up to date". Draw an empty index |
| O4 | Build | The page builds the index from `seen` as it stood before this visit, then calls `markAboutSeen` (ruling 3, §7) | Build from the post-write value |

**The eyebrow retires.** Its sentence is now O1's heading.

## §P The jumped-to entry

**§P0, a new entry (amends M1's placement):** the NEW pill moves **before** the title (mono 10/600, padding 2px 7px, 8px gap). A new entry's top hairline becomes **2px `--accent`** at both widths; on a phone that rule is drawn only on new entries. It runs across the column and is not an accent left edge, which stays the decklist's pending mark. Only the visual order changes: in the DOM, the pill's `sr-only` text still follows the title.

| # | State | Draws | Must not |
|---|---|---|---|
| P1 | Landed | The entry's top sits 20px under the viewport top. **Its title line takes `--elevated`**, radius 6, spilling 10px (8px on a phone) into the gutter. Focus moves to its `h3` (`tabindex=-1`). The contents row for that entry takes the same fill | Use an accent edge: on this page that is a decklist specimen's pending-change mark. Tint the figure. Ring the whole entry |
| P2 | Landed, the entry is new | The wash plus §P0's pill and rule | Drop the pill because the wash is there |
| P3 | Landed, the entry is not new (contents or search) | The wash only | — |
| P4 | Duration | It holds while the entry is in the upper 30% band (`rootMargin: 0 0 -70% 0`, the band `useCurrentChapter` already watches). It clears when the entry leaves that band or another jump lands | Time out. Fade. Use `:target`, which would redraw it on reload |
| P5 | Next visit or reload | Nothing. The state is client-only and never written (M1 stands) | Persist it |
| P6 | Back | Returns to where the jump started: the index or the contents, with any query intact | Replace history |

## §Q The contents, expanded

| # | State | Draws | Must not |
|---|---|---|---|
| Q1 | Wide rail | `Contents` label, then the search field (34px, doesn't scroll), then a list that scrolls inside the 216px sticky rail. **Every chapter is open.** Chapter rows are 13px, with a mono numeral and a figure slot. Entry rows are 12.5/1.35 `--fg-muted`, padded 30px on the left, and **wrap** | Truncate an entry title. Collapse a chapter in the rail. Let the field scroll away |
| Q2 | Wide, figure slot | `N new` in accent when the chapter holds new entries, otherwise empty. It is a match count while searching | Print `N entries`: the rows are listed under it now |
| Q3 | Wide, tracking | `aria-current` and the `--elevated` fill go to the entry row once an entry is in the band. Before that, the chapter row carries them. The list scrolls itself to keep the current row in view | Track two rows at once |
| Q4 | Phone list | `Contents` label, a 44px search field, then four 44px chapter rows. The title is the chapter link. The trailing figure and chevron are a 44px disclosure `button` with `aria-expanded` | Start open: with every chapter open, the list runs about three screens before chapter 01. Stick or float |
| Q5 | Phone, chapter opened | Its entry rows follow: 44px minimum, 13.5px `--fg-body`, indented 26px. Opening one doesn't close another | Accordion them |
| Q6 | New entries | `new` in mono accent, trailing, on the entry row, at both widths. Phone chapter rows swap the count for `N new`, as C2 did | Use the plate at contents size (W5) |
| Q7 | Behind reader, phone | Chapters start collapsed, because the index above already carries what's new | Auto-open the chapters that hold new entries |

## §R The search

| # | State | Draws | Must not |
|---|---|---|---|
| R1 | Rest | `⌕ Find an entry` (`SearchField`), accessible name `Find an entry by title` | Search captions, keys or routes |
| R2 | Matches | Rows filter to titles containing the query, ignoring case. Chapters with none drop **from the list**. The matched run is `--fg`/600 and the rest of the title is `--fg-faint`. The trailing slot shows `4 of 39` and a clear ✕. Chapter figures become match counts. On a phone every chapter with a match opens and the disclosures go quiet. The count is a polite live region | Hide, dim, collapse or reorder **any part of the page** (ruling 4). Spend accent on the match |
| R3 | None | `Nothing titled "mulligan".`, then mono faint `The search reads entry titles only. The page is unchanged.`, then `Clear search` (44px on a phone) | Suggest near matches. Hide the field |
| R4 | A match pressed | It jumps like O2 and lands as P1 or P3. The pressed row takes the current fill. The query and results stay | Clear the query on a jump |
| R5 | Keyboard | Enter jumps to the first match. ↓ moves into the list. Escape clears the query | Trap focus |
| R6 | Cleared | The full list returns. A phone restores whichever chapters were open before | — |

**Ruling 4 held without help.** Nothing in R1–R6 needed a page chapter hidden, so nothing goes back to
Hugh.

## §R7 Rulings touched

- **Overturned (§3):** S3 (reached by redirect), H2's "Appear on any other route" (the sheet is on
  other routes, and only as the notice; the mark stays on `/about`), and H4/G1 (no auto-write on render).
  The whole of `STATES-about.md` §4 (the dismiss) and §6 G1–G3 (the gate's `next`) retire with Got it.
- **Also superseded:** C2 (`2 NEW` plate on a contents row) becomes mono `N new`. W4's "draw a fifth
  row" ban is lifted, since entries are rows now. D6 (the redirect does not repeat) no longer applies,
  because there is no redirect.
- **Kept:** S1 (the index is titles and routes, and the sheet is titles only), S2 (every account is
  shown once), H1 (nothing on the menu, rail, tab bar or Home), H3 (entries stay in their chapters, and
  no page chapter is collapsed, paginated or reordered), M1 (no mark persists across visits), M2
  (`seen` 0 marks nothing).
- **`aboutMenuCopy`'s comment** ("the redirect is the notification") becomes "the sheet is the
  notification". Copy, not design.

## §R8 Copy

```
sheet.heading(n)        `${n} new in About`
sheet.more(n)           `and ${n} more`            // n >= 2
sheet.firstRunHeading   'What The 99 does'          // = aboutCopy.pageTitle
sheet.firstRunLine      'One page that explains every mark, figure and status in the app, and where each one lives.'
sheet.show              'Show me'
sheet.later             'Later'
sheet.where             'Always in your account menu, under About The 99.'
index.heading(n)        = aboutCopy.newSinceEyebrow(n)   // moved, not rewritten
contents.searchPlaceholder 'Find an entry'
contents.searchLabel    'Find an entry by title'
contents.count(m, n)    `${m} of ${n}`
contents.none(q)        `Nothing titled “${q}”.`
contents.noneNote       'The search reads entry titles only. The page is unchanged.'
contents.clear          'Clear search'
contents.newRow         'new'
retire: dismiss, dismissDestination, dismissDestinationHome, entriesInChapter (desktop only; phone keeps it as the bare count)
```

## §R9 Open, for the audit

1. **Rail length at 39 entries.** This is drawn from the §1.2 projection, not a measurement. If
   engineering's measurement (§7) shows the scrolling rail is under about 60% visible at 1300×820,
   the fallback is for the rail to open only the current chapter. That collapses the list, not the
   page, and is still inside ruling 4.
2. **Analysis launch.** Its two batched entries are titled by that round. On version 9 the sheet reads
   `2 new in About` and lists both (N1).

# Design property table: Invites PR 6a (/admin M1, M2, M3)

Source: `design/design_handoff_the99_invites/` (`README.md` decision 10, `STATES-invites-r1.md` §/admin,
`R1 - Admin-Desktop.dc.html` frames M1 to M3, `R1 - Admin-Phone.dc.html` frames M1 to M3). M4 (the Invites tab
tree) is out of scope. Board hex values are mapped to the kamigawa theme tokens in `src/app/globals.css`
(the board is drawn in kamigawa): `#0E0F14` `--bg`, `#12141B` `--surface-rail`, `#101219` `--surface-sunken`,
`#181C26` `--border`, `#262A35` `--border-strong`, `#343843` `--border-dashed`, `#E6E8F0` `--fg`, `#B1B6C7`
`--fg-body`, `#959AAD` `--fg-muted`, `#6F7486` `--fg-faint`, `#7D8294` `--fg-placeholder`, `#FF4D9A` `--accent`,
`#E0913C` `--warning`, `#C6533F` `--danger`. Fonts: IBM Plex Mono `--font-mono`, IBM Plex Sans `--font-sans`,
Chakra Petch `--font-display`.

Ignored per brief: the board's "new" highlights (`th.new` accent header ink, `.tile.new` `--accent-shadow`
border and accent label, the Invites tab's `new` badge). Copy strings are not enumerated; the copy element is
named.

**Borrowed, not specified by this board** (the board says "the shipped head, tables and fields"): the admin head
(eyebrow, env pill, back link, title, sub, tab strip: `AdminHead`, `admin-head.tsx`), the Accounts table and phone
stacked rows (`AccountsList`, `accounts-list.tsx`), the account tiles (`Tiles` in `account-page.tsx`), the
section card, number field, help line, amber pending sentence, Save/Undo and history line ("the group
allowance's controls, borrowed for a stock": `GroupEditor` / `Field`, `group-editor.tsx`), and the group page's
Daily credits section (`group-page.tsx`). Where the board's CSS for a borrowed piece is given below, it is the
board's drawing of the shipped piece; the shipped component is the reference if they differ.

## Components

1. Admin head (borrowed, context only)
2. M1 Accounts table: Invites and Invited by columns (desktop)
3. M1 Accounts stacked row meta line (phone)
4. M2 Invites tile
5. M2 Invites section card
6. M2 Invites field (label, input, Save, Undo)
7. M2 Help line
8. M2 Pending sentence
9. M2 Invited-by row
10. M2 Invited row (with Open)
11. M2 Waiting row (with Revoke)
12. M2 History line
13. M3 Top up invites section (card, field, Top up, Undo, help, pending, history)

---

### 1. Admin head (borrowed)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Source | shipped `AdminHead` | shipped `AdminHead` |
| Back link | M2 `‹ Accounts`, M3 `‹ Groups`; right of env pill (`margin-left:auto`), 13px `--accent` | same |
| Title | M1 `Accounts`, M2 account name, M3 group name; display 400 23px `--fg` | display 400 28px `--fg`; beside it a mono 11.5px `--fg-muted` subtitle (M2 email · Clerk id; M3 member count), `gap:10px`, baseline |
| Sub paragraph | not drawn | 13.5px/1.6 `--fg-body`, max-width 720px (M1 count line, M2 group + daily credits, M3 group description) |
| Tabs | 13px, gap 15px, `overflow:hidden`, nowrap, scrolling strip; active `--fg` + 2px `--accent` bottom border; inactive `--fg-muted` | 13.5px, gap 24px; same active rule |
| Active tab | M1/M2 Accounts, M3 Groups | same |
| Tab set | six tabs drawn (Costs, Switches, Groups, Accounts, Models, Invites); the Invites tab belongs to M4 | same |
| Body padding | 16px all sides | 22px 28px |

### 2. M1 Accounts table columns (desktop only)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | no (see 3) | yes |
| Position | — | two new columns after `Credits now`: `Invites`, then `Invited by` (last two columns) |
| Header cell | — | shipped `th`: left, mono 10.5px, weight 500, letter-spacing .12em, uppercase, `--fg-faint`, padding 0 10px 10px, border-bottom 1px `--border-strong` |
| Body cell | — | shipped `td`: padding 12px 10px, border-bottom 1px `--border`, `--fg-body`, vertical-align middle |
| Invites figure | — | `.num`: mono 12.5px `--fg` (the stock) |
| Waiting suffix | — | `<i>` inside `.num`: `· N waiting`, non-italic, `--fg-muted`; only when the account has waiting invites |
| Zero, none waiting | — | `.num.z`: whole cell `--fg-faint` (e.g. Peter `0`) |
| Zero with waiting | — | figure `--fg` (not `.z`), suffix `--fg-muted` (Max `0 · 1 waiting`) |
| Invited by | — | `.num` mono 12.5px `--fg`, the inviter's name |
| Invited by, founder | — | copy element `founder` in `.num.z` (`--fg-faint`) |
| Sort | — | both columns sort like the others (M1 note) |
| Table | — | width 100%, border-collapse, 13.5px (shipped) |

### 3. M1 Accounts stacked row (phone only)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | yes, shipped stacked rows | no |
| Row | flex column, gap 3px, padding 12px 0, border-bottom 1px `--border` | — |
| Top line | flex, baseline, space-between: name (14.5px 500 `--fg`) left, group (mono 11px `--fg-faint`) right | — |
| Meta line | flex, gap 12px, mono 11.5px `--fg-body`; three spans in order: credits, invites, invited by | — |
| Invites span | figure in `<i>`: non-italic, `--accent`; followed by copy element `invites` when nothing waits, or `· N waiting` when one does (the word `invites` is dropped then) | — |
| Invited-by span | copy element `by <name>`, or `founder` | — |
| Zero | the figure stays `--accent` (Peter, Max): no faint treatment on phone | — |

### 4. M2 Invites tile

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | beside the shipped tiles, in the tiles grid above the Invites section (not in frame: frame is scrolled to the section) | fourth tile, after Credits now, Spent in <month>, Runs |
| Grid | 2 columns `minmax(0,1fr)`, gap 8px | 4 columns `minmax(0,1fr)`, gap 12px |
| Tile | border 1px `--border-strong`, radius 10px, bg `--surface-rail`, padding 10px 12px, flex column gap 3px | same border/radius/bg, padding 12px 14px, gap 4px |
| Label | mono 10px, letter-spacing .1em, uppercase, `--fg-faint` (`Invites`) | mono 10.5px, same |
| Value | mono 600 18px `--fg` (stock left) | mono 600 20px `--fg` |
| Sub | mono 10.5px `--fg-muted` (`N waiting · N spent`) | mono 11px `--fg-muted` |
| Highlight | none (the board's `.tile.new` is ignored) | none |

### 5. M2 Invites section card

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `section` `aria-labelledby` its h2 | same |
| Margin top | 14px (drawn 0 because the frame starts at it) | 22px below the tiles |
| Card | border 1px `--border-strong`, radius 12px, bg `--surface-rail`, padding 14px, flex column, gap 10px | same border/radius/bg, padding 18px 20px, gap 12px |
| Heading | h2 `Invites`, display 400 18px `--fg`, margin 0 | display 400 19px `--fg` |
| Child order | h2, label, input, help, pending, buttons row, invited-by, invited rows, waiting rows (no history drawn) | h2, field row (label+input, Save, Undo), help, pending, invited-by, invited rows, waiting rows, history |

### 6. M2 Invites field

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Label | separate `label for=` above the input: 13px 600 `--fg` (`Invites left`) | label wraps the input: flex column, gap 6px, 13px 600 `--fg` |
| Field row | stacked (label, input, then help/pending, then buttons at the end) | `.fld`: flex, align-items flex-end, gap 10px; Save and Undo right of the input |
| Input size | full width, height 44px | width 120px, height 38px |
| Input box | radius 8px, border 1px, bg `--surface-sunken`, padding 0 12px, flex center | radius 6px, same border/bg/padding |
| Input text | mono 16px `--fg` | mono 14px `--fg` |
| Input border | `--accent` (drawn edited / focused); idle state not drawn at phone, desktop rule holds | edited: `--accent`; idle (`.in.idle`, as on Daily credits): `--border-strong` |
| Range | 0 to 100 (M2 note) | same |
| Button order | Undo left, Save right ("as the shipped phone editor orders them") | Save then Undo |
| Buttons row | flex, gap 8px, each `flex:1` | inline in `.fld` |
| Save | height 44px, radius 8px, no border, bg `--accent`, ink `--bg`, sans 600 14px | height 38px, padding 0 16px, radius 6px, bg `--accent`, ink `--bg`, sans 600 13px |
| Undo | height 44px, radius 8px, border 1px `--border-strong`, transparent, `--fg-body`, sans 400 14px | height 38px, padding 0 14px, radius 6px, border 1px `--border-strong`, transparent, `--fg-body`, sans 13px |
| Hover/focus | not drawn: the shipped group editor's states | same |

### 7. M2 Help line

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Copy element | help line (how many the account holds; only a new account spends one) | same |
| Type | mono 11px/1.5 `--fg-faint` | same |
| Position | under the input, above pending | under the field row |

### 8. M2 Pending sentence

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Copy element | pending sentence (from N to M; the waiting stay waiting) | same |
| Type | mono 11.5px/1.5 `--warning` | mono 12px `--warning` (no line-height set) |
| Position | under help, above the buttons | under help |
| Conditional | drawn while the draft differs from the saved stock (borrowed pending behaviour) | same |

### 9. M2 Invited-by row

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Row | flex, align center, gap 10px, min-height 44px, border-top 1px `--border`, 13px `--fg-body` | same, min-height 40px, 13.5px |
| Face | 26x26, radius 7px, overflow hidden, border 1px `--border-strong`; img cover | 28x28, same |
| Text | copy `Invited by <name>`; name in `b` 500 `--fg` | same |
| Date | not drawn | `small` mono 11px `--fg-faint` (`joined <date>`) after the text, gap 10px |
| Press | none | none |
| Founder | not drawn (no inviter row specified for a founder) | not drawn |

### 10. M2 Invited row

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Row, face, text | as 9; copy `Invited <name>` | as 9; plus `small` `joined <date>` |
| One per account invited | yes | yes |
| Right group | `.r` margin-left auto | `.r` margin-left auto, flex, align center, gap 14px |
| Open press | link `Open ›`: min-height 44px, padding 0 4px, no border, transparent, `--accent`, sans 500 13px | same, min-height 32px |
| Behaviour | opens that account's page | same |

### 11. M2 Waiting row

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Row | as 9 | as 9 |
| Face | 26x26, radius 7px, border 1.5px dashed `--border-dashed`, no image, `aria-hidden` | 28x28, border 1.5px dashed `--border-dashed`, bg transparent, `aria-hidden` |
| Text | copy `Waiting · <address>` (address in plain text; no `by email`) | copy `Waiting · <how sent> · <address>`, address in `b` 500 `--fg` |
| Dates | not drawn | `small` mono 11px `--fg-faint` (`sent <date> · returns <date>`) |
| Revoke | `button` `Revoke`, the `.tl` style of 10 (min-height 44px, `--accent`, sans 500 13px), in `.r` margin-left auto | same, min-height 32px, in `.r` gap 14px |
| One per waiting invite | yes | yes |

### 12. M2 History line

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | not drawn in the phone frame | yes, last child of the section |
| Type | — (desktop rule holds) | mono 11.5px/1.7 `--fg-muted`; one entry per line (`<br>`), newest first |
| Line shape | — | groups' history line shape: `<date time> · <event>: <from> → <to>` |

### 13. M3 Top up invites section

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | below the shipped Daily credits section (scrolls above it; frame starts at the Top up card, drawn margin-top 0) | own section under Daily credits, margin-top 22px |
| Card | as 5 (padding 14px, gap 10px) | as 5 (padding 18px 20px, gap 12px) |
| Heading | h2 `Top up invites`, display 400 18px `--fg` | display 400 19px |
| Label | separate, 13px 600 `--fg` (`Top up each member to`) | wraps input, flex col gap 6px, 13px 600 |
| Input | as 6 phone (full width, 44px, mono 16px, `--accent` border drawn) | as 6 desktop (120x38, mono 14px, `--accent` border drawn) |
| Primary press | copy `Top up`, Save style; right of Undo | copy `Top up`, Save style; left of Undo |
| Undo | Undo style | Undo style |
| Help | mono 11px/1.5 `--fg-faint` (shorter copy variant at phone) | same type, longer copy |
| Pending | mono 11.5px/1.5 `--warning`: names who rises (with their current count) and who is left alone | mono 12px `--warning` |
| History | not drawn | mono 11.5px/1.7 `--fg-muted` (`<date> · <admin> topped up <group> to N: K raised`) |
| After the press | field clears (M3 note) | same |
| Group count | none stored; no current-value display | same |

---

## State Coverage

| State | Trigger | Rendered | Inputs |
|---|---|---|---|
| M1 invites, nothing waiting | account has stock N, no waiting invites | desktop `.num` N in `--fg`; phone `<i>N</i> invites` | stock, waiting count = 0 |
| M1 invites with waiting | account has waiting invites | desktop `N · K waiting` (suffix `--fg-muted`); phone `<i>N</i> · K waiting` | stock, waiting count |
| M1 zero, nothing waiting | stock 0, no waiting | desktop cell `--fg-faint` (`.z`); phone figure still `--accent` + `invites` | stock = 0, waiting = 0 |
| M1 zero with waiting | stock 0, waiting > 0 | desktop figure `--fg` + muted suffix; phone `<i>0</i> · K waiting` | stock = 0, waiting > 0 |
| M1 invited by an account | account joined on an invite | desktop name in `.num` `--fg`; phone `by <name>` | inviter name |
| M1 founder | account from before launch | desktop `founder` in `--fg-faint`; phone `founder` | no inviter |
| M1 sorted by Invites / Invited by | column header press | shipped sort | sort key |
| M2 tile | account page loads | Invites tile: stock, `N waiting · N spent` sub | stock, waiting, spent |
| M2 field idle | draft equals saved | input `--border-strong` border (desktop `.in.idle`; phone not drawn, rule holds); no pending sentence (borrowed rule, not drawn) | saved stock |
| M2 field edited | admin changes the number | input `--accent` border; pending sentence in `--warning`; Save + Undo | draft, saved stock, waiting count |
| M2 Undo | press Undo | draft returns to saved (borrowed) | saved stock |
| M2 Save | press Save | stock set to draft; history gains a `set` line | draft 0..100 |
| M2 invited by | account has an inviter | invited-by row (desktop with joined date) | inviter face, name, join date |
| M2 founder (no inviter) | founder account | not drawn | — |
| M2 invited rows | account invited others | one row each with `Open ›` | invitee face, name, join date |
| M2 none invited | account invited nobody | not drawn (no rows) | — |
| M2 waiting rows | account has waiting invites | dashed-face row with Revoke (desktop: how sent, sent and return dates) | address, method, sent, returns |
| M2 Revoke | press Revoke | the invite returns at once (G3); row leaves | invite id |
| M2 history | events exist | desktop history lines, newest first; phone not drawn | events (sent, joined, set) |
| M3 top-up edited | admin enters N | `--accent` input; pending names who rises and who already holds; Top up + Undo | N, members' stocks |
| M3 top up | press Top up | raises members below N, lowers none; history line `K raised`; field clears | N, group id |
| M3 history | earlier top-ups | desktop history line; phone not drawn | events |
| M3 nobody to raise | every member holds N or more | not drawn | — |

States not drawn (so no visual spec): field validation error, saving/pending press state, write failure, M2/M3
empty history, M1 empty list.

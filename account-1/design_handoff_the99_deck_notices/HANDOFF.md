# Deck notices — handoff package (R1)

**Canvas:** `The 99 - Deck Notices.dc.html` (pan/zoom; `theme` in Tweaks). It mounts `Deck Page 1300.dc.html`,
`Deck Page 390.dc.html` (one `state` prop each), `Deck Tile.dc.html` (`state`, `w`) and `Notices Sheet.dc.html`
(`variant`, `phone`).
**Brief:** `docs/superpowers/design-briefs/2026-09-23-deck-notices.md` on `docs/deck-notices-brief` (PR #898).
§2 and §5 are taken as locked; this package answers §4's seven questions.
**Frame:** `design_handoff_the99_analysis_tab/HANDOFF.md`. Nothing in it changes except where §5 below says so.

Read with `STATES-deck-notices.md`, `deck-notices · copy strings.ts`, `ABOUT-entry.md`, `READINESS.md`.

---

## 1 · The notice (§3.1, §4.1)

**One tag, one place per surface: immediately after the bracket chip in the chips row, or in the chip's slot
after the status pill when there is no chip.** Deck header at both widths (`spine-desktop.tsx`,
`spine-mobile.tsx`), and the tile's chip row (`deck-card.tsx`, see §1a).

| | |
|---|---|
| Height | 24 from `md`, 22 below (the chip's) · radius 6 |
| Ground | **no plate**. 1px hairline of the ink at 55% (legality 70%). On the phone header's art band it takes `--bg` behind it, as the pill does |
| Content | 6px dot in the ink (unread only) · gap 6 · mono 11 / 10 in the ink · padding `0 9 0 8` (`0 8 0 7`) |
| Data face | `{n} notices` / `1 notice` in `--fact` |
| Legality face | `Not legal` in `--danger`, whenever any legality entry stands. The more serious face wins; never two tags |
| Read (data) | no dot, `--fg-locked` on `--border`. Page only; the tile draws nothing |
| Target | on the header, a button, 44px hit area by the chip's `after:` inset method, opens Notices. On the tile, presentation inside the tile's link |

A deck with no analysis can only carry legality (data notices qualify an analysis), so the chip-less case is
always `Not legal` in the chip's slot.

### 1a · The tile footer (r2)

The footer's `chip bar count` grid is replaced by three fixed rows, so the bar never changes length with the
chips and every tile on /decks is the same height (248 band + **92** footer):

| Row | Height | Content |
|---|---|---|
| chips | 22, `flex:none`, `flex-nowrap`, gap 8 | status pill · `BracketChip` · notice. **Never wraps.** |
| bar | 14, `flex:none` | track `flex:1` + count in a **fixed 52px** tabular slot, right-aligned |
| detail | 14, `flex:none`, always drawn | detail figure left (truncates) · last played right. Empty when neither exists |

Padding 11 13 13, row gap 9: 24 + 50 + 18 = 92. Replaces the four grid-area maps and the detail row's phone/desktop split.

**On the tile the notice is condensed:** `● 3` for data (padding 0 7, gap 5), `● Not legal` for legality.
The tile link's accessible name carries the words (`tag.aria`).

**One yield when the chips row is full:** a range chip drops its name and keeps its plate and both marks
(the Home addendum's form, padding 0 2). Only range + *Not legal* reaches it: whole, the row needs ~340px (pill 73 at 0.06em tracking, chip 168,
tag 83, gaps 16), a 366px cell. Engineering: `@container` at 366 on the tile, `BracketChip face={false}` below it when both
apply. Below the 330 band floor (the narrow three-up the grid already mis-sizes) every range draws marks only.

**Why not on the chip:** `BracketChip` is one component with two mounts and one meaning; a dot on it would
change Home and the tile too.

## 2 · Notices (§3.2, §4.2, §4.5, §4.7)

A **fifth `ModalChrome` body**, width **560**, no `mark`, title *Notices*, aside *since analyzed {date}* (the
deck's name when it has never been analyzed). `backLabel` defaults to the title. Phone: the sheet from 52, 43
header, as every body.

**Groups, in order; absent when empty:**

1. Not legal in Commander · 2. Outside the commander's colors — heads in `--danger`, no glyph
3. Game changers · 4. Two-card combos · 5. Mass land denial · 6. Extra turns — the findings' own labels and
   glyphs (16px, `--fact`), in the findings row's order
7. Bracket rules — no glyph

Group head: glyph + mono 10 uppercase 0.16em `--fg-faint`. Groups divided by `--border`; padding 14 18 12
(12 16 10).

**Entry row** (flex, min-height 36, 7px vertical):
- **direction** — 64px (56) mono 10.5 `--fg-muted`: `added` / `removed` for every card-scoped kind; `moved` for a
  rule. Legality rows have no direction column. **Never + / −, never `--success` / `--warning`**: those are the
  pending banner's marks for the player's own edits.
- **body** — card names in the Overview's form (bold `--fg` 600, dotted `--accent` underline,
  `CardDetailTrigger`), stacking `CardModal` on the sheet. A combo: both names joined by a faint ` + `, then
  `Spellbook: {result}.` at 12.5 `--fg-muted`. A rules entry: the rule's name at 13.5 / 600, then what it says now
  at 13 `--fg-body`, and no cards. A legality entry: the name, then its reason line (§4).
- **date** — mono 10.5 `--fg-faint`, right: the day the change published (`21 Sept`, `formatDeckDate`'s
  form). Data entries only.

**Foot**, on `--surface-rail` under a `--border` rule:
- not dirty: *Your bracket holds until you re-analyze. Nothing here moves it on its own.* + **Re-analyze**
  (outlined; 36 desktop, full-width 44 phone). The list is unchanged, so per `CREDITS-overview.md` the press
  returns the saved overview and draws **no credit note**.
- dirty: the sentence ends *Your own edits are waiting too: the Re-analyze on the Analysis tab reads both.* and
  the control is **Analysis tab →**, which closes the sheet onto the banner. No second Re-analyze.
- legality only, no analysis: no foot. The legality groups carry their own: *These stay until the cards leave
  the deck. Reading them does not clear them.*

## 3 · Acknowledgement (§3.3, §4.3)

| Kind | Opening Notices | Re-analyze | Card leaves |
|---|---|---|---|
| Data | marks every entry read: dot off, tag quiet on the page, gone from the tile | clears (the mark advances) | — |
| Legality | dot off; tag stays `Not legal` on page **and** tile | does not clear | clears |

A new entry after a read brings the dot back. Reading, not only re-analysis, quiets data notices because a
changed-list re-analysis spends a credit, and dismissing news should not cost one.

## 4 · Legality entries (§3.4)

- **Not legal in Commander.** — the reason line the app can state from `commander_legal`. If engineering keeps
  Scryfall's `legalities.commander`, a banned card reads **Banned in Commander.**; nothing else moves.
- **{Colors}, outside {Commander}'s colors ({identity}).** — pips (10px) for the offending colors, then words.
  A pair uses both names (*outside Ishai and Bruse Tarl's colors*).
- No date, no direction, no remove action. A notice never edits and never blocks an edit.

## 5 · Beside the Re-analyze banner (§3.5, §4.4)

| | Banner (dirty) | Notice |
|---|---|---|
| Who | the player | Scryfall, Spellbook, the rules |
| Where | top of the Analysis tab only | header chips row (every tab), tile |
| Form | rail card, sentence, bone button | hairline tag, no plate, no button |
| Ink | neutral, bone | `--fact` / `--danger` |
| Words | *Your deck has changes since…* | *3 notices*, *Not legal*; never *change(d)* on the face |
| Goes away | re-analyze | read (quiet) / re-analyze (clear); legality: card leaves |

**Inside the Analysis tab nothing is added**; the banner and its sentence are unchanged, and it stays the only
thing that talks about the reading's age. The single amendment to `analysis_tab/HANDOFF.md` §2's rule *"re-analysis
is offered only by the banner"*: **Notices' foot also offers it, and only when there is no banner.**

## 6 · The check before the synopsis (§3.6, §4.6)

**Withheld, not warned.** While any legality entry stands:
- Analyze (empty state) and Re-analyze (banner) run the bracket, and **the credit note's slot** reads
  *Reads the bracket only. The overview waits until every card is legal in Commander.* + **See which →** (opens
  Notices). Same placement and form as the credit note (1300: after the button, mono 11; 390: centered under it,
  mono 9.5). No credit is spent; no confirm step.
- After the read, the Overview reads *No overview while this deck holds cards that are not legal in
  Commander.*, **Write one** in the disabled form, **See which →**.

## 7 · What engineering builds

1. `DeckNotice` (tag) in the chips row of both spines and `deck-card.tsx`'s chip cell.
2. `NoticesBody` in `ModalChrome` (560), groups and rows as §2; the foot's two forms.
3. Read state per deck: a `notices_read_seq` beside the analysis's high-water mark; opening the sheet sets it to
   the latest entry.
4. `/decks` payload: `notice: "none" | "unread" | "notLegal"` per deck (the brief's boolean, widened).
5. The legality gate on the overview write, and its note in the credit-note slot.

## 8 · Most likely to break in build

1. **Reusing the pending banner's +/− or green/amber** in the list. Direction is a word.
2. **A second Re-analyze while the banner is up.** The dirty foot points; it does not press.
3. **Clearing legality on read or on re-analyze.** Only the card leaving clears it.
4. **The tag in two places on one surface** (e.g. also in the bracket box). One place per surface.

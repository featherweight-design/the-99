# The 99 — Home parity (design handoff, R1)

File: `The 99 - Home Parity (R1).dc.html` (canvas — pan/zoom). Read `STATES-home.md` for the
blocks, their empty cases and the sort; `home · copy strings.ts` for production-final copy
including **the strings this change deletes**; `READINESS.md` for what blocks a green.

Reference for existing geometry: the shipped home at desktop and 390px (screenshots supplied in
review). The Ready-to-build card and the resume row are drawn **at shipped occupancy** — this
handoff changes *which blocks exist and how they are sorted*, not how a card or a row looks.

---

## The gap

Desktop and mobile home had drifted into two different pages.

| | Desktop | Mobile |
|---|---|---|
| `Update collection` / `New deck` | ✓ | ✓ |
| Ready to build | 2 | 2 |
| Pick up where you left off | 2 | **absent** |
| Your decks | 4 rows, no art | 3 rows, with art |
| Commitments | ✓ | **absent** |

Two blocks existed on one width only, and the block that existed on both drew its rows two
different ways. **The fix is not a redesign — it is one page, drawn twice.**

---

## The four changes

### 1. `Your decks` is dropped from both widths

It was a second, worse Decks page one tap from the real one: four or five rows of seventeen, in
`/decks`' sort, with a footer link to the page that does the job properly. The rail and the tab bar
both carry **Decks**.

**What it was actually doing for the player is a different job** — getting them back into a deck
they were working in — and that is the resume block's job, done better, because `/decks`' sort has
no idea what you touched last. So the block does not move: it is **deleted, and the resume block
grows to take the whole job**.

**The count survives.** `Your decks · 17` carried the only place on home that said how many decks
exist. It now reads as the resume block's footer: `13 more decks` / `All 17 decks`. Same number,
same one tap, no second list.

### 2. The resume block sorts by **last touched**, not `/decks`' order

`/decks` sorts by its own rule and the block inherited it, which is why the two blocks on shipped
desktop were the same four decks in the same order — the resume block was a shorter copy of the
list above it.

**Touched means the last edit, commit, or logged game.** Not *opened*: an open is a glance, and a
sort keyed on glances fills the block with whatever you were looking at rather than what you were
doing. Ties break on deck name, ascending, so the order is stable between renders.

**And because the order is now a claim, each row prints its evidence** — one mono stamp, `edited 2h
ago` / `played yesterday` / `committed 3d ago`. It is the only element this handoff adds to a
shipped row, it lands in a slot the row already has (under the count on desktop, beside the status
chip at 390px), and **no row grows a line at either width**.

### 3. Four rows, not two

Two was right when `Your decks` sat beside it with four more. It is the only route back into a deck
now, so it carries four. **2×2 on desktop** — a single column of four would push Commitments off
the fold and leave the right rail long and empty; **stacked on mobile**.

### 4. `Commitments` comes to mobile

Same three figures, same `Review commitments`, **last on the page**. It is the block you read, not
the one you act on, and the two CTAs and the buildable commanders are both above it on desktop too,
so the order matches rather than being invented.

On desktop it is now **the whole right rail**, since the deck list that sat above it has left.

---

## Consistency with the shipped components — corrected in review

R1's first pass drew both blocks short, and that was the one thing wrong with it.

- **The Ready-to-build card's crop was 222px against a shipped ~300px.** The card reads as a piece
  of art with the name on it; at 222 it read as a header with a thumbnail. Corrected to 300, with
  the scrim starting lower (44% rather than 30%) so more art survives above the type. The name,
  type line and fit chip stay **inside** the crop; the fit line and `See the pool` stay on the
  panel beneath it.
- **The resume row was a padded thumbnail beside two stacked lines.** The shipped row bleeds its
  art flush to the left edge, full row height, and carries **one** meta line: status chip,
  commander name, count right-aligned. Corrected on both widths, and mobile gains the bleed it
  did not have — so there is now **one resume row, drawn at two widths**, rather than a desktop row
  and a phone row.

Art blocks stand in for the commander crops throughout. Everything else — hexes, radii, chip
geometry, the 44px phone targets — is the brand sheet's, unchanged.

---

## Decisions log

### 1. Delete `Your decks` rather than fix its sort

Giving it the same last-touched sort would have produced **two blocks with the same rows in the
same order**, which is what shipped desktop already looks like and the reason the section reads as
filler. One of them had to go, and the one to keep is the one with a reason to exist: the resume
block knows why it is showing you a deck.

### 2. The footer link, not a heading count

`All 17 decks` prints the total inside the control that goes there, so the number is a destination
rather than a label. `13 more decks` beside it is the same construction the commanders block above
already uses (`7 more scored 68 or better`), so the block ends the way its neighbour does.

### 3. The stamp is a row element, not a sort control

No dropdown, no `Sort · last touched` control. **The block has one order and always has.** The
header prints `last touched` as a caption — mono 10px, the same weight as the section label beside
it — and the rows carry the stamps. A sort control here would imply the block is a list, and a list
of four is the thing this handoff just deleted.

### 4. Relative stamps, not absolute

`edited 2h ago` over `14:22`. The figure answers *how stale is this*, which is relative by nature,
and it is what makes the order legible at a glance. Absolute timestamps belong in history, where
the question is *which version*. **Flagged as the one copy decision worth ratifying** — see
READINESS.

### 5. Four rows at 2×2, with the art bleed kept at both widths

The bleed is what makes a 64px row identifiable at a glance, and it is free — it replaces padding,
not content. The desktop frame is drawn at **1580** — the reference viewport — which is what
gives the Ready-to-build cards their ~550px and each 2×2 resume row ~290px of name column, where
`Tovolar, Dire Overlord // Tovolar, the Midn…` truncates exactly as it does today. Drawn narrower,
both blocks lose their single lines, which is the defect review caught.

### 6. Commitments last on the phone, and no new block order

CTAs → Ready to build → resume → Commitments, at both widths. The desktop rail's one block folds
in at the end, which is the only place it can go without putting a read-only figure block above
something actionable.

---

## Component notes

**No new atom, no new token, no new hex, no new motion class.** Two blocks deleted, one block
grown, one mono line added to a shipped row.

| Component | Spec |
|---|---|
| **Resume row** | Shipped geometry. Flex row, radius 12, `--surface-raised` on `1px --border`, **3px status rule on the left edge**, art bleeding flush left (74px desktop, 62px at 390px) at full row height, min-height 64px desktop / 72px phone. Content: deck name (Cinzel 600, 15.5px) over one meta line — status chip, commander name (mono 11px, truncating), count right-aligned. |
| **Touched stamp** | **The one addition.** Mono 10px `--fg-locked`. Desktop: under the count, right-aligned. Phone: beside the status chip. Never wraps, never its own line. |
| **Ready-to-build card** | Shipped geometry, restored. 300px crop (270px at 390px), scrim from 44%, name + pips + type line + fit chip inside the crop, fit line and `See the pool` on the panel beneath. |
| **`Your decks` block** | **Deleted at both widths**, with its rows, its heading, its count and its `All decks` footer. |
| **Commitments** | Shipped panel, unchanged, now also mounted on the phone as the last block. |

## Notes for engineering

- **The resume query is new.** `decks` ordered by `greatest(last_edited_at, last_committed_at,
  last_game_logged_at) desc, name asc`, limit 4 — not `/decks`' ordering, and **not `last_opened_at`**
  (which this handoff assumes is not written; if it is, it must not be in the sort key).
- **The stamp needs to know *which* event was the most recent**, not just the timestamp, since the
  verb changes with it (`edited` / `played` / `committed`). Return the winning column's name with
  the date or the copy cannot be built.
- **`13 more decks` is `deckCount − shown`**, and both figures come from the same count the deleted
  block used. Absent at nought (see `STATES-home.md`).
- **Nothing on home reads `/decks`' sort preference any more.** If that preference was shared
  state, home is no longer a consumer of it.
- **The deleted block's route is the only thing it contributed** that needs re-homing, and it has
  been: `All 17 decks` goes where `All decks` went.
- Phone Commitments is the same component as desktop's, at phone metrics (44px control). No new
  props.

## Gap report

1. **`played yesterday` assumes a logged game counts as touching a deck.** It is the right answer
   for "what was I last doing with this deck", but a game log is not an edit, and a player who
   logged four games last night gets a resume block of four decks they did not change. Named
   rather than resolved: dropping game logs from the sort key is a one-line change if review
   disagrees.
2. **Four rows and 17 decks means 13 are one tap away at all times, and the block never says
   which 13.** That is the same bet `Your decks` made at 4-of-17; it is just made once now
   instead of twice.
3. **The stamp is the only place on home with a relative time**, and the header's `read last week`
   is the only place with a vague one. They are two registers of the same idea on one page.
4. **Nothing was measured before deleting `Your decks`.** If its rows out-click the resume rows on
   the shipped page, this handoff is wrong about which block was doing the work — and the
   instrumentation to know that is not named anywhere.
5. **The empty resume block is an assumption, not a ruling.** See READINESS.

## Files
- `The 99 - Home Parity (R1).dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `STATES-home.md` — the blocks, the sort, the empty cases.
- `home · copy strings.ts` — production-final copy, plus the strings this change deletes.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.

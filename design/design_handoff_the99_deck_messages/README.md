# The 99 — deck page messages (design handoff)

`design/design_handoff_the99_deck_messages/` · 2026-10-22 · drawn by account 2 · **approved by Hugh 2026-10-22**

Brief: `docs/superpowers/design-briefs/2026-10-21-deck-messages.md` (the A1 to A18 numbering below is the brief's).
Canvas: https://claude.ai/artifact/CKv1LdWeXgSdqikozFPNe2. Open the `.dc.html` files from disk (they need `support.js`
beside them). Theme: Low Sun (amonkhet), the theme of Hugh's phone captures. Copy is placeholder for `/copy-review`.

**The one-line summary:** everything the deck is waiting on lives in **one to-do card** under the header. Each thing
is one row with one press. One row is the **next step**, and its press is the only filled one. How the deck stands is
the card's foot. What just happened is a receipt band above the card.

## Read in this order

| File | What it is | Status |
|---|---|---|
| `To-do Card.dc.html` | The to-do card on Stacks 1, 2 and 3 at 390, Stack 3 at 1300; how the next step is picked | **Build this** |
| `Next Steps.dc.html` | Every next step (fill failed, unresolved, over, the last N, ran out, pending, first run); the shorter precon band; the foot's provenance opened | **Build the left column** ("as a row"). The right column ("in the head") was **rejected** (too loud) |
| `Pass Sheet.dc.html` | Show these N and "N in other drafts too" open a sheet of the deck's own rows; a row opens the card | **Build this** |
| `R1 System.dc.html`, `R1 Stack 1–3`, `R1 Quiet and First Run`, `R1 Elements 1–2` | Round 1: the levels, the receipt band, the toast, the mix's phone parity, dismissal | Still the spec for the **receipt band, A1 toast, mix and dismissal**. Its action card, warning band and status strip are **superseded** by the to-do card |
| `Explored A.dc.html`, `Explored B.dc.html` | The two divergent alternatives Hugh asked for; A was picked and became the to-do card | Record only |

## The page, top to bottom

**Header · receipt band · to-do card · recommended mix · tabs.** The same order at both widths.

1. **Header.** Unchanged, except that the proxy line (A3) and the over line with Proposed cuts → (A4) leave it for the
   card. The notice tag (A2) stays. **Commit as v1 (A5) stays the header's primary button** (Hugh's call 1): it never
   co-occurs with a to-do row.
2. **Receipt band** (A10, A12, A13, A11). R1's arrival band (`ArrivalBandShell`), above the card, the only thing on the
   page with a ✕ (Hugh's call 3: receipt above). One at a time; A11 shows only when no other receipt does.
   - **The precon receipt is shorter** (Next Steps §2): `Started from the {precon} precon` and `You own {n} of its 99`
     with `History`. The "{n} you don't are in Shopping" line and the set/printings line go.
   - A receipt lasts the visit it arrived with: the page reads `?from=precon`, `?imported=1`, `?updated=` once and
     strips them (as `StripAddedParam` does); ✕ hides it for the visit; nothing stored. `arrivalDismissKey` retires.
   - **A11's ✕ is remembered on the account** (`user_prefs`, like `moments_spent`, per deck and precon) (Hugh's call 2).
3. **The to-do card.** See below. Absent when the deck has nothing to do: the foot then stands alone as the quiet
   status strip (R1's "v3 · committed 2 Oct 2026").
4. **Recommended mix** (A16). Unchanged, plus R1's phone parity: the source line and the draft note join the phone's
   label row.
5. **The remove failure** (A1) leaves the column for the deck toast (`ToastFrame placement="deck"`, as
   `TokenRefusalToast`): the shipped sentence as the title, the card name as the detail, `role="alert"`, no press.
   Drawn in `R1 Elements 2`.

## The to-do card

- **Head.** Eyebrow `Before {deck} is {complete|legal|ready|built}` on the left, `{n} to do` on the right (new copy).
  First run: `Step 3 of 3 · Build your first deck`.
- **Rows.** Each: a 30px mark tile (warnings `--danger` on a danger tint, actions `--accent` on an accent tint), a
  title, one line of body, and **one press**: the verb and `›`, 96px at 390 and 132px at 1300, outlined, all in one
  column on the right. The whole row is the hit area on the phone. Warning titles are `--avail-over-fg`.
- **The next step.** The first present of **fill failed › unresolved › over the 99 › the last N › pending changes**.
  It is the first row, carries a `Next step` label (mono, `--accent`), an accent tint and a 3px inset `--accent`
  edge, and **its press is the only filled one** (`--fg` on `--bg`). Hugh's call 4 (the last N leads pending) holds.
- **Spoken for twice is never the next step**: it is fixed by buying or by changing another deck. It sits right after
  the next step, in red.
- **Order of the rest:** warnings (over the 99, spoken for twice), then actions in the precedence above.
- **Foot.** The status line: version · proxies · `Where these N cards came from ▾` · `N in other drafts too ▾`. Plain
  facts are not presses.
  - Provenance ▾ opens **inside the card, under the foot**: the shipped ledger lines (the seed, each top-off, Clear all
    auto's note). One disclosure open at a time; open for the visit only.
  - `Show these N` (in the ledger) and `N in other drafts too` open the **pass sheet** (below).
- **Moments.** M1 anchors to the last N's press, M3 to the over row's press (one anchor at both widths, gap G2 of R1),
  M4 to the Land cell. Unchanged otherwise.

| Row | Title | Press (visible / accessible name) | Notes |
|---|---|---|---|
| A9 fill failed | `The deck is here, the cards aren’t.` | `Try again` / `Try filling again` | |
| A15 unresolved | `{n} lines unresolved` (new label) | `Look` / `Take a look` | the shipped sentence as the body |
| A4 over the 99 | `{Word} over the ninety-nine` led by `+N` | `Cuts` / `Proposed cuts` | absent press with the switch off |
| A6 spoken for twice | `{card} is spoken for twice` / `{n} cards here are spoken for twice` | `Shopping` / `See them in Shopping` | never the next step |
| A8 the last N | `Choose the last {n}` | `Choose` / `Choose the last {n}` | the door note shortens to the body |
| A8 ran out | `{n} short, and your collection ran out` | `Consider` (see READINESS) | today's plate has no press |
| A14 pending | `{n} changes since v{k}` with `+a / −b` | `Review` / `Review {n} changes` | **Commit and Discard live in Review** |
| A17 first run | `Choose the last 99` | `Choose` | the guided banner's step and crumbs head the card |

## The pass sheet

- `Show these N` opens the shipped `ModalChrome` sheet (phone) / modal (desktop): eyebrow = the pass (`1st top-off`),
  title `{n} cards`, the pass's ledger sentence, the pass's live cards, then `Undo these N` and `Done`.
- `N in other drafts too` opens the same sheet: the cards grouped under each draft, with the list's own group heading.
- **Its rows are `DecklistRow` in the All view, mounted unchanged** inside the deck page's providers: ownership slot,
  name, auto tag, bare `$`, fact marks, the 72px pip track, the ✕, `FOLD` by the row's own width, preview on hover.
  Never a copy, never a trimmed row (Hugh, 2026-10-22: card rows have drifted before).
- **A row's press opens the shipped card detail**, stacked on the sheet through `registerSheet`, so its close reads
  `← 1st top-off` at both widths and closing it lands back on the sheet.
- The ✕ removes the card from the deck as it does in the list; the row leaves the sheet and the count drops.
- **The accent-edge PassMark retires** (`pass-mark.tsx`): it was the passive half.
- **Guard:** an inventory `docs/superpowers/inventories/pass-sheet.json` whose `shares.module` names `DecklistRow` for
  the deck list and the sheet, so `pnpm check:shared` fails if the sheet imports anything else, and the contact sheet
  photographs both at 390 and 1300.

## Hugh's rulings (2026-10-22)

1. Commit as v1 stays the header's primary. 2. A11's ✕ on the account. 3. Receipt above. 4. The last N leads pending.
5. Alternative A (one to-do card) over R1 and B. 6. Receipt back to a band on top (a toast clashed). 7. One press per
row, one next step. 8. The next step as a row, not as the card's head (too loud). 9. Precon band: which precon, how
many owned, History. 10. Show these opens a sheet; its rows are the shipped card row and open card details.

See `READINESS.md` for what is open, `STATES-deck-messages.md` for every element.

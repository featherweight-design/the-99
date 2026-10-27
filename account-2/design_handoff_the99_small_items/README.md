# The 99 · Three small items (R1, account 2, 2026-10-27)

A light addendum of three unrelated items, each drawn over the shipped surface it changes.
Canvas: https://claude.ai/artifact/M6sfvrUxLdd3TWELr19b4x (Main, Cuts-Alternatives, Draft-Note-Phone, Spare-Answer-Sheet).
Status: R1, awaiting Hugh's audit. Goes to main only on approval, as addenda to the handoffs each item builds on.

## 1 · Proposed cuts offers alternatives (`Cuts-Alternatives`)

Hugh's rule (2026-10-27): give the player a choice and never lock them in.

- Each **pending** cut row (`CutRow` in `cuts-panel.tsx`) gains one strip under its figures: **Or cut one of these instead**, then up to **three** card tiles.
  - Phone: three tiles across the row, each a 72 × 100 card image (the card's own shape) with its name under it (two lines max).
  - Desktop: the strip sits on the reason's 96px indent; kicker on the left (118px), then three 228px tiles in a row: 40 × 56 card, name, type line. Hover shows the shipped card preview (`usePreviewRow`).
- **A tile is one press: it swaps.** The tile's card becomes the row's suggestion with **its own** reason and cite chips; the card it replaced takes the tile's slot (accent dashed outline; desktop sub-line `named first`), so switching back is one press. A changed row carries a 3px accent inset edge. Motion: the picked card flips into the row's thumbnail.
- **Cut** and **Keep** are unchanged and still the only writes to the list. Cut takes the card the row shows; the answered row is the shipped one and its strip leaves with it. Undo brings the row back as it was left (the picked card included).
- **How many: three.** Three card-size tiles fit the phone row without scrolling. Fewer when the run can't back three; none and the strip is absent (the row is as shipped).
- Never offered: a locked card, a Key card, the commander, a card named on another row of the run.
- Kept rows: unchanged (`Show it again` brings the row back with its strip). History re-review: strips show too; a pick re-checks the card as Cut does there.

### For engineering
- G1. The same Look deeper run names up to three runners-up per cut, each with a reason and cites held to the same rules and validator (no extra credit). Prompt and schema change.
- G2. A pick is a light write on the item (`chosenOracleId` or similar), so a reload and History show the chosen card. Cut on a picked row cuts that card.
- G3. A tile whose card has left the list or been locked since is dropped from the strip.
- G4. Copy for /copy-review: the kicker `Or cut one of these instead`, desktop sub-line `named first`.

## 2 · The deck toolbar's draft note on a phone (`Draft-Note-Phone`)

**Call: leave it off the phone. No change to ship.** `group-toggle.tsx` keeps `hidden md:inline`.

On a phone the draft is already said four times before the first row: (1) the to-do card's Review row (`6 changes since v3 +4 / −2`, next version named), (2) the mix strip's `· reading pending changes` (and `was n`), (3) the list caption directly under the toolbar (`the brass rule marks the 6 rows you have changed`), (4) each group heading's `n changed, not yet committed` and the brass rules. The note would repeat the caption's count a line above it; the toolbar's three phone rows are full, so any spot costs a line or crowds Lock cards and the view well.

Suggested: a test pinning the phone's caption and group notes while a draft exists.

## 3 · An answered spare request, opened over Home (`Spare-Answer-Sheet`)

**Engineering's proposal is ratified**, details drawn:
- `ModalChrome` width **560**; phone `fit` (hugs its row, 18px top radius). Title **Your request**; the sheet's ✕ closes.
- Body: the shipped Your requests row (`your-requests.tsx`) for this one request, with no ✕. Its clear becomes **Clear**, a plain text button (--fg-muted, no border) at the start of the row's text column, under the detail: 44px tall on a phone, 32 on desktop. Accessible name: the shipped `clearAria`.
- Foot: **All your requests ›** to /friends at Your requests. Phone: left, in a pinned foot. Desktop: right.
- Opening marks the answer seen (the diamond goes). Clear removes the request for good, closes the sheet and takes the Home item with it; focus goes to the next feed item's ✕ (shipped dismiss). A failed Clear keeps the sheet and shows the shared toast.
- Answered rows have no Ask instead. Declined shows the shipped `othersHave` line; asking another friend happens in Shopping.
- The Home item's press label becomes **Your request ›** (was `Your requests ›`), for /copy-review. The item's own ✕ still only hides the item.

## Files
- `Main.dc.html`, `Cuts-Alternatives.dc.html`, `Draft-Note-Phone.dc.html`, `Spare-Answer-Sheet.dc.html`: the canvas artboards (images as `/_blob/` urls). `canvas.json`: the canvas index.
- `art/`: the images uploaded to the canvas (card images cut from Hugh's captures, reused from the strategy-focus, deck-messages and spare-requests rounds).
- `scratch-gen/`: the generators. `cuts/` (strategy-focus kit + `ci.py`), `draft/` (deck-messages kit + `dn.py`), `spare/` (spare-requests kit + `ss.py`, `main.py`). Each `b.py` writes to `../out`; `render.py <names>` measures boards and flags broken images; `toblob.py` swaps `art/` for the canvas's `/_blob/` urls.

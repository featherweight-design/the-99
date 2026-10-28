# The 99 · Small items (R1b, account 2, 2026-10-27; item 6 2026-10-28)

A light addendum of six unrelated items, each drawn over the shipped surface it changes. R1b folds in Hugh's feedback on items 1 and 3 (2026-10-27 23:39) and adds items 4 and 5; item 6 (2026-10-28) follows Hugh's call on /friends.
Canvas: https://claude.ai/artifact/M6sfvrUxLdd3TWELr19b4x (Main, Cuts-Alternatives, Draft-Note-Phone, Spare-Answer-Sheet, Dismiss-X, Eng-Rulings, Precon-Overview, Friends-Desktop).
Status: R1b, awaiting Hugh's audit. Goes to main only on approval, as addenda to the handoffs each item builds on.

## 1 · Proposed cuts names more than the deck needs (`Cuts-Alternatives`, R1b)

Hugh's rule (2026-10-27): give the player a choice and never lock them in. R1's alternatives strip is withdrawn (Hugh: "just over shoot by 2-3 ... this is really just about engineering providing more responses with reasoning").

- The Look deeper run names **three more cuts than the deck needs** (102 cards: three over, six named). Every row is the shipped `CutRow`; nothing new is drawn on it.
- The result block's head says how many there are to choose from (`Six to choose from`); the lead says how many to cut (`Three over the ninety-nine. Six named; cut any three.`); the foot `6 named for 3 cuts · …`.
- Once enough are cut (`Three cut. Back at 99. The other three stay here, so you can Undo one and cut another instead.`), the rest stay open. A fourth Cut is allowed; the lead then says the deck is under, as the count does.
- Fewer rows when the run can't back that many with checked figures. Never a locked card, a Key card or the commander.

### For engineering
- G1. Same run, same one credit: return **over + 3** cut rows, each with its reason and cite chips under the same rules and validator. Prompt and schema change only; no pick state, no new control.
- G2. Open: a cap for a deck far over (suggest at most 20 rows).
- G3. Copy for /copy-review: the head, the lead lines, the foot.

## 2 · The deck toolbar's draft note on a phone (`Draft-Note-Phone`)

**Call: leave it off the phone. No change to ship.** `group-toggle.tsx` keeps `hidden md:inline`.

On a phone the draft is already said four times before the first row: (1) the to-do card's Review row (`6 changes since v3 +4 / −2`, next version named), (2) the mix strip's `· reading pending changes` (and `was n`), (3) the list caption directly under the toolbar (`the brass rule marks the 6 rows you have changed`), (4) each group heading's `n changed, not yet committed` and the brass rules. The note would repeat the caption's count a line above it; the toolbar's three phone rows are full, so any spot costs a line or crowds Lock cards and the view well.

Suggested: a test pinning the phone's caption and group notes while a draft exists.

## 3 · An answered spare request, opened over Home (`Spare-Answer-Sheet`)

**Engineering's proposal is ratified**, details drawn:
- `ModalChrome` width **560**; phone `fit` (hugs its row, 18px top radius). Title **Your request**; the sheet's ✕ closes.
- Body: the shipped Your requests row (`your-requests.tsx`) for this one request, with no ✕. **R1b:** the accepted line becomes `The handover is between you. Once it’s yours, press buy on it in Shopping or add it to your collection.` (`acceptedDetail`, so /friends' Your requests says it too; for /copy-review). Its clear becomes **Clear**, a plain text button (--fg-muted, no border) at the start of the row's text column, under the detail: 44px tall on a phone, 32 on desktop. Accessible name: the shipped `clearAria`.
- Foot: **All your requests ›** to /friends at Your requests. Phone: left, in a pinned foot. Desktop: right.
- Opening marks the answer seen (the diamond goes). Clear removes the request for good, closes the sheet and takes the Home item with it; focus goes to the next feed item's ✕ (shipped dismiss). A failed Clear keeps the sheet and shows the shared toast.
- Answered rows have no Ask instead. Declined shows the shipped `othersHave` line; asking another friend happens in Shopping.
- The Home item's press label becomes **Your request ›** (was `Your requests ›`), for /copy-review. The item's own ✕ still only hides the item.

## 4 · The dismiss ✕, and three eng rulings (`Dismiss-X`, `Eng-Rulings`)

**The ✕ ends the action line** on What's new rows, the lead story and Waiting on you (redraws #2285's top-right placement):
- Phone: a 44 × 44 box at the right end of the press's line (Yes, No and the days left on an ask row; the lead's button line inside the band). The time stays on the kicker line; the text column loses its 30px reserve.
- Desktop: a 32 × 32 box after the press (Yes, No, the days left, then ✕ on an ask row; the lead's ✕ at the band's right edge on its button line). Coarse pointer keeps the 44px hit.
- **R1b (Hugh, 2026-10-28): the time moves into the kicker, after the kind, at both widths** (`Trade match · 6h ago`, a `·` between, same mono 10.5px). It no longer sits before the press on desktop or squeezed into the phone row's top-right corner. Applies to What's new rows, Waiting on you, the lead story, Your requests and the answer sheet's row.
- **R1b: Your requests' card and owner preview is centred vertically on its row** (`items-center` on the row; in the answer sheet the preview spans the text and Clear, centred).
- A row with no press keeps the action line for the ✕ alone. Disabled while an answer is out (rows), absent (lead) or none (receipts), as shipped.
- Engineering: `DismissButton` renders in the flow of the action line, not `absolute top-[6px] right-[4px]`; drop the `pr-[30px]`/`md:pr-[34px]` reserves (`FeedItemRow`, `TradeRow`, `AskRow`) and the lead's `pr-[28px]`/`md:pr-[20px]`; AnswerPresses wraps in its own box with the ✕ at `ml-auto`. `useFeedDismiss`, focus, aria and toast unchanged. Your requests keeps its own ✕.

**Rulings:**
- #2284 (desktop: time and press share one line on the right): **amended in R1b**. The right-hand line keeps the press, then the ✕; the time goes to the kicker (above).
- #2280 (one folded mark shows itself, not `+1`): ratified. The 16px mark costs ~3px of the name, which truncates; the right-hand columns never move.
- #2288 (a trade match's Ask opens the spares sheet over the page): ratified as built (Friends with a spare, `on your wishlist`, that friend first; the press reads Requested or Accepted after).

## 5 · A precon's Overview, carried into the deck (`Precon-Overview`)

- **Precon page** (`/decks/precons/[file]`, `open-precon-view.tsx`): a new Overview block in the header, under the "You own" box and above the list-note line: label `Overview`, aside `written for this precon’s list`, the paragraph (desktop max 760px), and `View full overview →` opening the shipped Overview modal. No credit, no write press; no Overview yet means no block.
- **Started from the precon** (Start with this precon, with or without I own this precon; either edition): the new deck's bracket reading and Overview are copies of the precon's. The verdict's date line reads `Analysis from the precon list · 27 Oct`; the Overview label's aside `from the precon list`. Nothing to press, nothing spent. The header chip shows the bracket at once.
- **First edit**: stale exactly as any deck's. The shipped staleness banner with Re-analyze leads the tab; the date line gains `, before your changes`; the Overview stays whole with no write control. After Re-analyze the reading is the deck's own (`analyzed 28 Oct`) and the Overview shows the shipped `This overview was written before your latest changes.` with Write a new overview.
- Engineering: one Overview and one reading per precon list, written ahead (a batch, like the prose) and re-written when the list or method changes; the deck's copy is judged fresh by the same list key as any reading, so no new staleness rule. Re-analyze costs what it costs today. Importing a list that happens to match a precon carries nothing.
- Fixture: Turtle Power! (Heroes in a Half Shell); the Overview text and the Core verdict are stand-ins.

## 6 · /friends on desktop, in two columns (`Friends-Desktop`)

Hugh asked whether /friends needs sub-nav tabs; the call (accepted 2026-10-28) is **no tabs yet, use the width**. Shipped, the page is a 720px column in a wide window, so Pods starts under the fold.
- From **1180px** (Home's two-column breakpoint) the container widens to 1160px. `FriendsHead` spans the top; below it a grid `minmax(0,1fr) 420px`, gap 44.
- **Left:** Waiting on you, Your requests, then Friends (the rows keep the width they were drawn for; #2284's one-line right edge and item 4's ✕ fit). **Right:** Pods (the shipped pod card, seats three to a row as on a phone), then Open links.
- Nothing waiting: the inbox sections stay absent as shipped, Friends moves up, neither column is empty.
- DOM order stays phone order (head, inbox, friends, pods, links). Under 1180 and on a phone: unchanged.
- Not now: tabs. Revisit with several pods or a dozen-plus friends (Friends | Pods tabs under the inbox, never around it).

## Files
- `Main.dc.html`, `Cuts-Alternatives.dc.html`, `Draft-Note-Phone.dc.html`, `Spare-Answer-Sheet.dc.html`, `Dismiss-X.dc.html`, `Eng-Rulings.dc.html`, `Precon-Overview.dc.html`, `Friends-Desktop.dc.html`: the canvas artboards (images as `/_blob/` urls). `canvas.json`: the canvas index.
- `art/`: the images uploaded to the canvas (card images cut from Hugh's captures, reused from the strategy-focus, deck-messages and spare-requests rounds).
- `scratch-gen/`: the generators. `cuts/` (strategy-focus kit + `ci.py`, `pv.py` via `bp.py`), `draft/` (deck-messages kit + `dn.py`), `spare/` (spare-requests kit + `ss.py`, `main.py` via `bm2.py`, `w4.py` via `b4.py`, `f6.py` via `b6.py`). Each `b.py` writes to `../out`; `render.py <names>` measures boards and flags broken images; `toblob.py` swaps `art/` for the canvas's `/_blob/` urls.

# The 99 — spare requests (design handoff)

Account 2, 2026-10-22. Brief: Hugh's prompt in the project chat (workshop rulings of 10-21, closed).
Canvas: https://claude.ai/artifact/9tqvZMRP6gmD5wenUKpA3P

**Status: R2 APPROVED by Hugh, 2026-10-22.** Every string is a placeholder for `/copy-review`. Orange dashed outlines mark what is new
against the shipped page. Builds on `design_handoff_the99_menu_home` (friend page, Waiting on you: shipped #2186/#2193),
Settings' spares (#2180) and Social R2's spare marker and modal (#1858, #1875).

## Workshop rulings held

- A friend's spare of a card you need is shown, never notified.
- Ask is a deliberate press per card, never automatic. The friend gets the "a friend wants your spare" notice (opt-in, on by default).
- The friend answers Yes or No and the asker is told. A Yes changes nothing else in the app.
- An unanswered ask expires after 14 days; the asker can ask again. After a No, that friend is held back 14 days for that card; the next friend can be asked at once.
- The spare threshold and per-card Keep decide what counts as a spare.

## Calls

1. **Ask lives where the spares already show.** No new surface. The shipped Shopping row press (⇄ and the spare glyph) opens the shipped modal, **Before you buy** or **Friends with a spare**, and each friend row in its **Friends with a spare** section gains one **Ask** where “view only” sat. The all-decks cart gains a third view, **By friend**, with Ask on the line. **All draws no request marks** (Hugh, R2: the one-line All row has no room).
2. **Several friends, one row, one request.** The row keeps **one** marker however many friends hold the card. The modal lists them most spares first (shipped order), each with its own Ask. **One open request per card**: once you ask Colin, Max’s row reads **Ask instead**, which withdraws Colin’s request and sends Max one in one press. Colin is not told; the row leaves his Waiting on you and his badge drops.
3. **One press, no note** (agreed with Hugh). The request already says the card, how many and which deck it is for: *“Peter wants 1 for Dragons of Tarkir.”*
4. **The row says where the request is.** The spare glyph takes two marks: **requested** (an accent dot) and **accepted** (green, with a tick), each in the key only while a row draws it. The key is the shipped Shopping key grid; the three friend marks sit next to each other at its end. A decline, an expiry or a withdrawn request puts the plain glyph back.
5. **A yes changes nothing else.** The row keeps its buy tag. The handover happens between you, and the card joins your collection the way it always does: **press buy on the row** (I got it) or update your collection. When the card stops being one you need, an open request closes by itself.
6. **The friend row in the modal** is one line of status: face, name, one sub line (“2 spares · Thursday pod”, or “12 days left”), and ONE thing on the right: Ask, Ask instead, Ask again, or one word (Requested, Accepted, Declined). The old foot copy is a tooltip behind an ⓘ on the section head: “Copies none of their decks use. Ask, and they answer yes or no. The trade (or the goat) is between you.”
7. **Your requests, on /friends.** A section under Waiting on you, in the shipped feed rows: Requested (days left), Accepted, Declined, No answer (Ask again), No longer spare. A bare ✕ withdraws an open request or clears an answered one.
8. **The friend answers where they wait.** The request is a **Waiting on you** row with **Yes** and **No** and the days left, on /friends and as Home’s lead story when it is the newest thing waiting. An answer turns the row into a receipt for the visit (“You’re sparing Lathliss for Peter” / “You’re keeping Lathliss”), then it leaves.
9. **The notice: on by default.** Settings’ **Friends asking for your spares** starts checked. Off, a request still lands in Waiting on you and the Friends badge (the only place to answer it), but makes no Home item.
10. **The asker is told.** Your requests and the Friends badge carry every answer. The board also draws a Home What’s new item for an answer (**Your request**: “Colin can spare Jace”, “Chris is keeping Dina”); see READINESS, For Hugh 1.
11. **Words.** Marks and statuses: Requested, Accepted, Declined (never Rejected). Feed lines speak in people: “can spare”, “is keeping”.

## Gaps for engineering

The store, rules and badge shipped in plan `2026-10-22-spare-requests.md` PRs 1 and 2 (`spare_requests`, `spare-request-rules.ts`, `src/lib/social/spare-requests.ts`). What this handoff adds:

- **G1 · Withdraw.** ✕ on an open request and **Ask instead** need a withdrawn state (a `withdrawn` status, or a delete). Ask instead is ONE transaction: withdraw the open request, then `askForSpare` to the new friend; a failure leaves the first request open. Withdrawing tells nobody.
- **G2 · Copies and deck.** The friend’s line names the copies and the deck (“wants 1 for Dragons of Tarkir”); `spare_requests` holds neither. Add `copies` (what the deck needs, capped at the friend’s spare count) and a nullable `deck_id` (null from the cart), or drop the clause from the line.
- **G3 · No longer spare.** Derived at read: an open request whose friend no longer offers a spare of the card (`loadFriendSpares`) reads as No longer spare on the asker’s side and leaves the friend’s Waiting on you. A card that leaves the asker’s buy lists closes silently.
- **G4 · Feed default.** `spare-request` starts ON for an account with no stored choice.
- **G5 · Failed writes.** Ask, Ask instead, Yes, No and ✕ use the shared toast on failure (“We couldn’t send that. Try again.”) and leave the row as it was.

## Boards

| File | What |
| --- | --- |
| `Main.dc.html` | The flow, calls, gaps |
| `Shopping.dc.html` | A deck's Shopping rows with every mark; the modal at Ask, Requested and Ask instead (390, 1300) |
| `Cart-By-Friend.dc.html` | Shopping for all decks, third view By friend, with Ask |
| `Asker-States.dc.html` | The friend row's five states (tooltip open on A); the row marks; Your requests on /friends; the answer on Home; the failed-write toast |
| `Friend-Side.dc.html` | Waiting on you with Yes and No; the receipt; Home's lead story; the badge; Settings' notice line |

`scratch-gen/` (on the `design-assets` branch, `account-2/design_handoff_the99_spare_requests/`) builds the boards (`python3 build.py` for local art, `python3 build.py blob <dir>` for the canvas;
`render.py <names>` measures each board and flags broken images and clipped frames). It imports the menu-and-Home kit
(`kit.py`, `parts.py`, copied unchanged) and adds `sr.py`.

## R2 changes (Hugh's audit, 2026-10-22)

- **Friend rows fixed at every width.** The R1 row borrowed a class name the shell already used (boxed rows) and packed a chip and a two-line status into a phone row. Now: face, name, one sub line (“2 spares · Thursday pod”, or days left), and ONE thing on the right: Ask, or a one-line status (Requested, Accepted, Declined); a friend waiting their turn reads Ask instead. No stacked timestamp.
- **The foot copy is a tooltip.** An ⓘ beside “Friends with a spare · N” opens: “Copies none of their decks use. Ask, and they answer yes or no. The trade (or the goat) is between you.” Only a state line stays under the rows, one sentence.
- **Key.** The shipped Shopping key grid, unchanged (two columns on the phone, a wrapping row from lg). The three friend marks sit next to each other at the end: friend has a spare, requested, accepted. No divider.
- **Vocabulary.** Marks and statuses: Requested / Accepted / Declined. The feed speaks in people: “Colin can spare Jace”, “Chris is keeping Dina”; the friend’s receipt: “You’re sparing Lathliss for Peter” / “You’re keeping Lathliss”. “Rejected” is not used anywhere.
- **By friend.** Each friend is its own panel with a header band (face, name, pods, spare count); line statuses are one word.
- **No note:** agreed; the Note board is gone.
- **Ask instead** (Hugh asked how to cancel and move on): while one request is open, other friends’ rows read **Ask instead**, which withdraws the open request and sends a new one in one press. The withdrawn friend is not told: their Waiting on you row and badge simply drop. ✕ in Your requests still withdraws without asking anyone else. Same press on the By friend cart line.
- **All draws no request marks** (Hugh): the one-line All row has no room for them, so the Deck-List board is retired. A request is made and read in Shopping and the By friend cart only.

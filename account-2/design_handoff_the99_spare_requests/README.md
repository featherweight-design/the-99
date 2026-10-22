# The 99 — spare requests (design handoff · R2)

Account 2, 2026-10-22. Brief: Hugh's prompt in the project chat (workshop rulings of 10-21, closed).
Canvas: https://claude.ai/artifact/9tqvZMRP6gmD5wenUKpA3P

**Status: R2, awaiting Hugh's audit.** Every string is a placeholder for `/copy-review`. Orange dashed outlines mark what is new
against the shipped page. Builds on `design_handoff_the99_menu_home` (friend page, Waiting on you: shipped #2186/#2193),
Settings' spares (#2180) and Social R2's spare marker and modal (#1858, #1875).

## Workshop rulings held

- A friend's spare of a card you need is shown, never notified (Shopping, the deck list).
- Ask is a deliberate press per card, never automatic. The friend gets the "a friend wants your spare" notice (opt-in, on by default).
- The friend answers Yes or No and the asker is told. A Yes changes nothing else in the app.
- An unanswered ask expires after 14 days; the asker can ask again.
- The spare threshold and per-card Keep decide what counts as a spare.

## Calls

1. **Ask lives where the spares already show.** No new surface. The shipped row press (⇄ and the spare glyph) opens the shipped modal, **Before you buy** or **Friends with a spare**, and each friend row in its **Friends with a spare** section gains one **Ask** press where “view only” sat. Same in Shopping, in the deck list and in the all-decks cart.
2. **Several friends, one row, one ask.** The row keeps **one** marker however many friends hold the card. The modal lists them most spares first (shipped order), each with its own Ask. **One open ask per card**: once you ask Colin, Max’s Ask steps aside until Colin says no or 14 days pass, so nobody hands over a card you no longer need.
3. **One press, no note (agreed with Hugh in R2).** Ask is one deliberate press. The request already says the card, how many and which deck it is for, so the friend reads *“Peter wants 1 for Dragons of Tarkir.”*
4. **The row says where the request is.** The spare glyph takes two marks, each in the key only while a row draws it: **requested** (an accent dot) and **accepted** (green, with a tick). The key keeps the three friend marks together after the buy marks. A decline, an expiry or a withdrawn request puts the plain glyph back.
5. **A yes changes nothing else.** Yes tells you; the row keeps its buy tag. The handover happens between you, and the card joins your collection the way it always does: **press buy on the row** (I got it) or update your collection. When the card stops being one you need, any open ask closes by itself.
6. **Your requests, on /friends.** A **Your requests** section under Waiting on you, in the same feed rows: Requested (days left), Accepted, Declined, No answer (Ask again), No longer spare. A bare ✕ withdraws an open request or clears an answered one.
7. **The friend answers where they wait.** The request is a **Waiting on you** row with **Yes** and **No** (and days left), on /friends and as Home’s lead story when it is the newest thing waiting. The Friends badge counts unanswered requests. An answer turns the row into a receipt for the visit, then it leaves.
8. **The notice: on by default.** Settings’ **Friends asking for your spares** is the one kind that starts checked (workshop ruling). Off, a request still lands in Waiting on you (so it can be answered or expire), but it makes no Home item and no badge.
9. **The asker is told on Home.** An answer is a What’s new item for the asker (**Your request**: “Colin can spare Jace”, “Chris is keeping Dina”), always on because they asked. An expiry is not news: it only shows in Your requests.

## Open for Design: answered

- **A note on the ask:** no note (agreed in R2). The Note board is retired.
- **Several friends on one row:** one marker on the row; the modal lists every friend most spares first, each with Ask; one open ask per card (call 2).

## Gaps for engineering

- **G1 · Ask store.** `spare_asks`: asker, friend, oracle_id, copies, deck_id (null from the cart), created_at, answered_at, answer (yes | no), withdrawn_at, closed_reason. A unique partial index holds one OPEN ask per (asker, oracle_id), which is call 2.
- **G2 · Expiry at read.** Open and created_at older than 14 days reads as **no answer**; no job. Waiting on you drops it at the same moment, so the two sides never disagree.
- **G3 · Closing on its own.** The ask closes as **no longer spare** when the spares read stops returning that friend for that card (used in a deck, kept back, threshold, share off, unfriended), and closes silently when the card leaves the asker’s buy lists (bought, cut, I got it). Both at read, from the existing spares read (`lib/social/spares.ts`).
- **G4 · Feed kinds.** `spare-request` exists; its default flips to ON for every account (write the pref on read when unset). New stored kind `spare-answer`, written on Yes or No for the asker, outside `feed_kinds` (no checkbox) and outside `WAITING_KINDS`.
- **G5 · Badge.** The Friends badge counts open requests to the reader newer than `friends_seen_at`, as shipped; answering removes the row and so the count.
- **G6 · Failed writes.** Ask, Yes, No and ✕ use the shared toast on failure (“We couldn’t send that. Try again.”) and leave the row as it was.

## Boards

| File | What |
| --- | --- |
| `Main.dc.html` | The flow, calls, gaps |
| `Shopping.dc.html` | A deck's Shopping rows with every mark; the modal at Ask and Asked (390, 1300) |
| ~~`Deck-List.dc.html`~~ (retired R2) | The All view's spare mark on cards you don't own; the same sheet |
| `Cart-By-Friend.dc.html` | Shopping for all decks, third view By friend, with Ask |
| `Asker-States.dc.html` | The friend row's five states; the row marks; Your requests on /friends; the answer on Home; the failed-write toast |
| `Friend-Side.dc.html` | Waiting on you with Yes and No; the receipt; Home's lead story; the badge; Settings' notice line |

`scratch-gen/` builds the boards (`python3 build.py` for local art, `python3 build.py blob <dir>` for the canvas;
`render.py <names>` measures each board and flags broken images and clipped frames). It imports the menu-and-Home kit
(`kit.py`, `parts.py`, copied unchanged) and adds `sr.py`.

## R2 changes (Hugh's audit, 2026-10-22)

- **Friend rows fixed at every width.** The R1 row borrowed a class name the shell already used (boxed rows) and packed a chip and a two-line status into a phone row. Now: face, name, one sub line (“2 spares · Thursday pod”, or days left), and ONE thing on the right: Ask, or a one-line status (Requested, Accepted, Declined; “after Colin” for a friend waiting their turn). No stacked timestamp.
- **The foot copy is a tooltip.** An ⓘ beside “Friends with a spare · N” opens: “Copies none of their decks use. Ask, and they answer yes or no. The trade (or the goat) is between you.” Only a state line stays under the rows, one sentence.
- **Key.** The shipped Shopping key grid, unchanged (two columns on the phone, a wrapping row from lg). The three friend marks sit next to each other at the end: friend has a spare, requested, accepted. No divider.
- **Vocabulary.** Marks and statuses: Requested / Accepted / Declined. The feed speaks in people: “Colin can spare Jace”, “Chris is keeping Dina”; the friend’s receipt: “You’re sparing Lathliss for Peter” / “You’re keeping Lathliss”. “Rejected” is not used anywhere.
- **By friend.** Each friend is its own panel with a header band (face, name, pods, spare count); line statuses are one word.
- **No note:** agreed; the Note board is gone.
- **Ask instead** (Hugh asked how to cancel and move on): while one request is open, other friends’ rows read **Ask instead**, which withdraws the open request and sends a new one in one press. The withdrawn friend is not told: their Waiting on you row and badge simply drop. ✕ in Your requests still withdraws without asking anyone else. Same press on the By friend cart line.
- **All draws no request marks** (Hugh): the one-line All row has no room for them, so the Deck-List board is retired. A request is made and read in Shopping and the By friend cart only.

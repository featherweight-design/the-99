# The 99 — Help me choose (design handoff · R1 · approved 2026-09-24)

> **Start with `HANDOFF.md`.** This file gives the short reasons.

**It's a submission, not a filter** (R1.1, after Hugh's review). Set your answers, press **Find commanders**, get
suggestions, then **Change answers** or **Start over**. The form shows no commanders and no counts before you
submit. A live list beside it read as a filter, and a catalog count repeated Discover. Every input is still
optional. A blank submit still reads **Find commanders**, and suggestions always reach past what you own.

**The form doesn't interpret; the results do.** The words box is plain text. On submit, a free match reads it, and
the results open with **We read this as**. The top three are drawn as **best fits**. For a closer fit, one panel
offers **1 credit · Look deeper**, framed as more depth rather than a correction. The UI never says AI or model.

**Fit is a sentence, not a score.** Every figure reads `91% of its decks are Dinosaurs`. With several answers, a
commander ranks by the one it fits least, so it has to fit everything you asked. The limiting figure is tagged
**SETS RANK**.

**Existing screens match today.** The pre-filled door, the deck page, the intent line, the fill ledger and the
fill-failed banner are drawn from `main` and Hugh's screenshots. The only changes are the ones listed.

## Tried and dropped

- **R1.1: chips and the credit offer in the form, live as you type.** They were busy and clunky, and asked for
  a spend before the player had seen a single result. Now the reading shows on results, and a re-read is offered
  when the results miss.
- **R1: results beside the form, updating live, with a `Show N commanders` dock.** It read as a filter, and the
  blank state printed 3,301, which Discover already does. Replaced by submit → results.
- **Steps (colors → theme → budget → bracket → words).** They made every input feel required, and hid the
  one thing that shows more detail helps: the list changing.
- **A credit count in the page header.** It says credits matter before any exist to spend.
- **A confirm dialog before the read.** The stub already names the cost. A second press would be friction
  on a choice the player has just made.
- **Bars for fit.** Bars side by side read as a score, and ruling 5 says no score.
- **Loosening in place ("showing 31 without Exactly")**. That is a silent loosen with a caption on it.
- **R1.2: a one-time arrival strip on the new deck and a custom empty-deck fallback.** Neither matched today's deck
  page. Replaced by the seeded intent line and the shipped FillFailedBanner.
- **R1.2: "Read it properly" as a stubbed ticket.** It implied the first read was wrong. Replaced by *Look deeper*.

## Files

- `The 99 - Help Me Choose.dc.html`: the canvas. §1 the doors, §2 the intake, §3 the deeper look (7 states)
  with the chip key, §4 the results (6 orders), §5 too narrow and loading, §6 the hand-off. Each frame is
  drawn at 1300 and 390.
- `Help Me Choose.dc.html` (`scene`, `phone`, `screen`), `Hand-off.dc.html` (`state`, `phone`),
  `Doors.dc.html` (`door`, `phone`): the frames. `theme` on all of them.
- `HANDOFF.md`, `STATES-help-me-choose.md`, `help-me-choose · copy strings.ts`, `READINESS.md`.
- `brand/`, `support.js`.

No About entry this round (brief §7).

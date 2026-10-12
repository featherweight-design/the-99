# STATES: Find a deck for it, with a read (R2)

Every frame is drawn at 900 (the 820 × 620 dialog) and 390 (the sheet from 0). All copy is placeholder for /copy-review. Off (`FIND_A_DECK_READ_ENABLED` false), the picker is today’s, stacked, with no band, fold or read (lock 7). Frame ids are the canvas’s.

| Id | Frame | State | What draws |
|---|---|---|---|
| D1 | details 900 · 390 | card details, door as shipped | `Find a deck for it →` in the footer. Press → the details pane gives way to the view (180ms, 16px slide + fade; a plain swap under reduced motion); focus to the view heading |
| D2 | (no frame) | back to details | `← {card}` (in the ✕’s slot, top-right; R2), Escape or hardware Back → details, focus on the door, scroll kept. One press, one layer |
| D3 | (no frame) | closing from the view | no ✕ in the view (R2). Escape twice, or the scrim on desktop |
| D4 | (no frame) | a card opened from the view | a mark in a sentence or a cut opens that card stacked over the dialog, as today; its pill reads `← Find a deck for it` |
| D5 | (no frame) | stand-ins | unchanged: stacks over the card, shipped geometry |
| P1 | view | press offered, no read | head (`Find a deck for it` left, `← {card}` in the ✕’s slot right, no ✕ (R2); identity · copies under it); band: lead, filled `Which deck needs it most? │ ◆ 1 credit`, standing line; the free list open, today’s rows and order |
| P1a | (no frame) | one candidate | lead is `offerLeadOne`; band and press as P1 |
| P1b | (no frame) | allHold / noneByColors | no band (lock 8); today’s sentence and holds group |
| P1c | (no frame) | paused / owner share | press disabled, segment gone; the line is `creditsCopy.paused` / `ownerShare` |
| P2 | view | running | band in `--accent` border: dot, `Reading {n} decks for {card}`, `{runningSub} · 0:12`, three still skeleton rows, `runningKeep`; free list open and live below. No Stop |
| P2a | (no frame) | double press / reopened mid-run | the run in flight is shown (lock 5), never a second charge; the clock counts from the run’s start |
| P2b | (no frame) | reader went back to details mid-run | under the door, mono `reading your decks…`; returning shows P2 or the result |
| P2c | (no frame) | an Add from the free list mid-run | the add lands; when the read arrives, that deck reads as changed (P10) |
| P3 | view | result, 3–5 rows | `Where it helps most` · `read just now · {shown} of {n} decks`; rows: deck, commander · plan source, sentence with card marks, CUT line, `Swap in`; foot `Used a credit · {standing}`; the free list folded |
| P3-act | every read row (R2) | the two actions | `Swap in` (accent outline) and `Add only` (quiet outline); select/unselect; pressing one disables the other on that row |
| P3a | P3 row 1 | a row swapped in | button filled `Swapped in` (aria-pressed), row border `--accent`, cut struck, cut note `cutNoteSwapped`; head copies `×1 · none free` |
| P3b | P3 rows 2–3 | no free copy left | `Swap in to buy` / `Add only, to buy` |
| P3h | P3 row 2 (R2) | added without a cut | `Added, to buy` filled `--fg-body`; `Swap in` off; cut note `still in · cut it or anything else`; line `In the draft, which is now at 100. Cut a card of your choice from {deck}.` |
| P3i | (no frame) | Added pressed again | the add is undone; both buttons back |
| P3c | (no frame) | Swapped in pressed again | the swap is undone; button back to `Swap in`; copies re-read |
| P3d | (no frame) | swap refused | MutationError under the row: `swapRefused`; nothing moved |
| P3e | (no frame) | fold opened | today’s rows, `could take it` + `combos first, then themes`, Add / Add to buy, then `already holds it` |
| P4 | view | fewer than asked, thin (credit back) | the rows that held up, then the dashed note `thin(kept)` · `thinSub · {standing}` |
| P5 | view | fewer than asked, complete (credit spent) | one or two rows; one candidate adds the foot `onlyOne(deck, card) · used a credit · {standing}` |
| P3f | view (addendum) | three plan sources | commander line ends `from its overview` / `from an older overview` / `from commander and themes`; older adds `Read from an overview written the older way.` + `Update it on the deck page →`; none adds `No overview yet, so this read went on {commander} and the deck’s top themes.` + `Write one on the deck page →`; v2 adds nothing |
| P3f-link | (no frame) | the deck-page link pressed | the dialog closes; the deck opens on Analysis at the Overview. Nothing runs from the picker |
| P3g | view (addendum) | a stored read after an overview was written | stale note `{deck} has a new overview since this read on {when}. Read again to use it.` + `Read again │ ◆ 1 credit`; that row tagged `new overview`, actions off, source note gone; others live |
| P3g-v2 | (no frame) | an older overview replaced by v2, or none → older | same as P3g; after Read again the row’s source line reads the new source |
| P6 | view | no fit | box `noFitHead` / `noFitBody`, foot `read just now · kept until your decks change, so there’s nothing to press again`; the fold open beneath; no press |
| P6b | view (R2) | no fit, reopened | the stored no fit, `noFitBodyStored`, foot `read {when} · kept until your decks change`; no press; free list open |
| P6c | view (R2) | no fit, a candidate changed since | the old no fit at 0.72; dashed note `{deck} has changed since this read on {when}, so it’s worth asking again.` + `Read again │ ◆ 1 credit` + `Uses a credit. {standing}.` |
| P7 | view | failure | band: FailMark, `failedHead`, `failedBody`, outline `Try again │ ◆ 1 credit`, standing; the free list open |
| P8 | view | no credit left | P1’s band, button disabled at 50%, segment gone; line `0 of 3 left · reset at 2:20 AM · What uses credits?`, the link to About `credits` (Hugh, R2: never list the features) |
| P9 | view | stored read, current | P3 without the swaps: sub `read {when} · {shown} of {n} decks`, foot `resultFootStored`; no press |
| P9a | (no frame) | stored no-fit, current | P6, dated `read {when}` |
| P10 | view | stored read, a deck changed | dashed note `staleOne` with outline `Read again │ ◆ 1 credit` and `again(standing)`; sub `read {when} · out of date`; the changed deck’s row at 0.72, tag `changed since`, swap disabled, cut note `cutNoteChanged`; others live |
| P10a | (no frame) | several changed / set changed | note `staleMany` / `staleSet`; with a set change no row is tagged |
| P10b | (no frame) | changed deck no longer a candidate | its row drops; `staleSet` |
| Must-not | — | — | a ✕ and a back pill together; a credit line that lists features; a press on a current no fit; the picker running an Overview; a tick anywhere in the read; a digit, percentage or score word in the read’s sentence; a deck the read didn’t validate; a re-order of the free list; the free list hidden without a fold; a second charge on a double press; the read shown as current over changed inputs; the picker stacked over details while the switch is on |

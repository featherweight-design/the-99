# Friend trades R1: Hugh's feedback (2026-11-27), for R2

R1 is in this folder as drawn. Hugh reviewed it on 2026-11-27 and asked for this PR to carry R1 plus his feedback,
so an agent on another account can draw R2. Canvas (account 2, private): https://claude.ai/artifact/An3LAJziyAdcGsTuc2oj1G.
The boards here (`*.dc.html`, `art/`) are that canvas as exported.

## Decided

- **Q1 to Q4 approved as recommended** (README § Questions):
  - Ask back sits on the holder's Yes receipt, not on `answer-sheet.tsx`.
  - Each pair of friends has one live trade at a time.
  - A card goes into a trade only once in v1.
  - After an accept, Call it off lets either side end the trade, and the other person sees Withdrawn.

## To change in R2

1. **Drop "You're sparing…".**
   - The wording is awkward. Use something like "You're giving {card} to {friend}".
   - The string is shipped receipt copy: `src/lib/copy/social.ts` `sparing` / `sparingDetail` (about line 503). It shows on boards A1 and A2 (the Yes receipt).
   - Change it everywhere it appears, in a copy-review pass, not only on trade surfaces.
2. **Make T2's trigger clear.**
   - Hugh asked how T2 (Ask Peter back) is reached when Peter asked for a card and Hugh already said Yes.
   - The intended path: after you say Yes to a friend's spare request, the receipt offers to ask that friend for a spare in return. That opens a trade with your yes card already on your side.
   - R2 must draw that path end to end: the Yes, then the receipt with the entry, then T2. It must also make clear why the yes card sits in the trade, or rethink it. One option: T2 only proposes what you'd like back, and the yes stands on its own.
3. **Rename "Ask back".**
   - The label is clunky. Find clearer copy for asking the friend for a spare in return, for example "Ask for one back" or "Trade for it". Propose two or three options.
4. **Put Counter in the Yes/No row.**
   - On T3, T5 and T10, Counter sits beside Yes and No, in the same `AnswerPresses` row. It no longer sits apart in the foot.
5. **Use "No longer available"**, not "No longer spare".
   - This applies to the card tag (`tradeCopy.gone`) and the needs-a-look lines (`lookLine`, `lookLineYours`, `row.look`).
6. **Cap the Trades list (L1).**
   - Eleven rows push Friends and Pods below the fold on mobile.
   - Show the 5 most recent and send the rest to Request history (or similar).
   - When more than 5 wait on you, the list must say so, with a count and a link (for example "3 more waiting · See all in Request history"), so the extra trades aren't buried. Draw it with 5 rows plus the overflow line, at phone and desktop.
   - This makes README gap G5 (trades in Request history) part of R2.
7. **Draw the whole existing page around every addition.** Hugh has asked this before; it is a standing rule.
   - Friends: the full Friends page with the Requests box's new Trades tab in place, with Friends and Pods below it.
   - Home: the full Home page with the Ask back receipt and the trade feed rows in flow.
   - The friend page: the full page with the Trade tab.
   - Settings: the full Notifications section.
   - Cropped boxes alone don't show how it looks in flow. Render the full shipped pages with the scratch-gen recipe (README § Files) at phone and desktop, changing only what is new.

## Still open (unchanged from R1)

- The README gaps for engineering: G1 to G4 and G6. G5 moves into R2 (item 6).
- The draft build prompt lives outside the repo at `build-prompts/friend-trades.md` (project files). It needs updating after R2.

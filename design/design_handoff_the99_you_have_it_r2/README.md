# You have it · R2 · the missing surfaces

Account 1, 2026-11-23. Status: **R2 APPROVED by Hugh, 2026-11-23 (Q1 and Q2 as drawn).** An addendum to `design_handoff_the99_you_have_it` (#3216, approved R3,
shipped), not a new feature. Canvas (Design type): https://claude.ai/artifact/D8CYR9tHazpPPbu3WoZtmd (Main, History, Sheet, Threshold).

Read with: `design_handoff_the99_you_have_it` (the offer, the tile press, the call-out, the sheet), `design_handoff_the99_request_history`
(the history page and row), `design_handoff_the99_small_items` item 3 (`Spare-Answer-Sheet`, the ask's answer over Home),
`design_handoff_the99_spare_requests` (Friend-Side, Asker-States). Source of truth for what shipped: main 7563036 and
`docs/agents/social.md` § Offers. Note: the brief points at README §History and §AnswerPresses in the R1 folder; main's README has
neither section, so this round reads the shipped code (`request-history.tsx`, `answer-sheet.tsx`, `spare-answer.tsx`,
`friend-wishlist-have.tsx`) and social.md instead.

Closed (the brief): a Yes is an accepted request on both sides; offers already show in Waiting on you, on Home and in push;
the offerer sees "said yes/no" on Home as an item. Every frame is rendered from main with the shipped components and the
proposal applied (`scratch-gen/proposal.diff`).

## Calls

1. **Offers in Request history, for both people** (board `History`).
   - **The tabs split by who started it**: `You asked · Asked of you` becomes `From you · To you`. An offer you made sits
     with your asks; an offer made to you sits with the asks of you. The other person always answers the rows of a tab, so
     every kicker keeps its meaning (Q1 has the alternative).
   - **The row is the shipped row** (card at card shape, the friend's face, kicker, title, line), no new mark. Same kickers
     and inks; an open offer's kicker is `Offered` where an ask's is `Requested`. The **title's verb** and the **line** tell an
     offer from an ask: `You offered Lathliss, Dragon Queen to Colin` / `You asked Peter for Zimone`; a closed offer's line is
     `Offered Nov 16` where an ask's is `For Thopter Works · asked Nov 9`.
   - From you: `Offered` (`13 days left. Withdraw it from Colin’s Wishlist tab.`: an open row says where to act, history call 5),
     `Accepted` (`Colin said yes to Jace`), `Declined` (`Max passed on Tam`), `No answer` (`Peter didn’t answer about Giada`),
     `Withdrawn` (`You withdrew your offer of The Wise Mothman to Colin`). The yes and no titles are the Home item's and push's own.
   - To you: `Waiting on you` (`Max offered you Lathliss`, `14 days left. Answer it under Waiting on you.`), `Accepted`
     (`You said yes. The handover is between you.`), `Declined` (`You said no.`), `No answer`. **A withdrawn offer never shows
     on the wanter's side**, as a withdrawn ask never shows on the holder's (history call 6).
   - Two or more copies: `You offered 2 Tam to Max` / `Peter offered you 2 Tam`, as `Colin asked you for 2 …` does.
   - History still only shows. No Yes or No here: `AnswerPresses` stay on Waiting on you. The whole row opens card details.
   - Copy follows: the page line, both empty states and the ex-friends foot line name offers.
2. **The offerer's answer sheet** (board `Sheet`).
   - The offerer's What's new item gains the press **`Your offer ›`**, as the ask's answer has `Your request ›`. Its kicker
     becomes `Your offer`: shipped, it reads `Your request` (`feed-item.tsx` takes `answerKicker` for any item with an answer).
   - The press opens **Your offer** over Home: the ask's answer sheet shell (`ModalChrome` 560, phone `fit`), its body the
     **request-history row** for that offer in the sheet's inset box, the foot `Request history ›` to `/friends/requests`
     (From you is the default tab). Phone: foot left; desktop: right, as the ask's sheet.
   - Accepted: kicker `Accepted` · age, `Colin said yes to Jace, Multiverse Architect`, `Hand it over when you meet; your
     collection stays as it is until you change it.` Declined: `Max passed on Tam, the Possibility`, `Nothing else changes.`
     Under either, mono: `Offered Nov 16 · 1 copy`.
   - **No Clear, no AnswerPresses.** The offerer has no Your requests row to clear and nothing to answer; the item's own ✕
     still only hides the item.
   - Opening takes the item's diamond for the visit. A refused or failed open goes to `/friends/requests`. Close returns focus
     to the press, as the ask's sheet does.
3. **Spares under your Offer threshold** (board `Threshold`; Hugh's addendum, 2026-11-23). Today a card you hold spare copies
   of, but fewer than Settings' `Offer a card only when I have N or more spare copies.`, draws nothing on a friend's wishlist,
   so the feature looks absent (T0: threshold 2, one spare).
   - **The tile says so with the shipped press**: same 26px box, the spare glyph in `--fg-faint` with no mark, the box
     **dashed** (`--border-dashed`). Its name: `You have a spare Polyraptor, under your threshold of 2`. No new control.
   - The key adds `under your threshold` (faint glyph) when one is drawn. The filter's `You can spare · N` counts only cards
     you can offer, and a below-threshold card is not in it.
   - **The call-out appears even when every spare is under the threshold**: `You have 1 spare under your threshold` /
     `Polyraptor. You offer a card from 2 spare copies; change it in Settings › Spares.`, and no filter. With offerable spares
     too, the shipped body ends `2 more are under your threshold.`
   - **The press opens You have this**: the row `1 spare` / `under your threshold of 2`, no Offer, and the foot `You offer a
     card only when you have 2 or more spare copies.` then the link `Change it in Settings ›` (to `/settings#spares`).
   - **Settings needs the pointer.** "Offer" in the threshold sentence predates the Offer press and now names both, so under
     it: `This also decides which cards you can offer from a friend’s wishlist.`
   - Kept back cards still draw nothing: that is a per-card choice the player made, where the threshold is a blanket rule
     that is easy to forget. A card every deck uses still draws nothing (R2's spares-only call).
4. **Phone and desktop:** one design.

## Settled (Hugh, 2026-11-23: approved as drawn)

- **Q1 · Tabs by who started it, or by which way the card goes?** Drawn: who started it. By the card's way, an offer you made
  would sit with the asks made of you (your card goes out in both), so that tab would mix rows you answer with rows they
  answer.
- **Q2 · Should a below-threshold spare be offerable from the sheet?** Drawn: no; the sheet explains and links to Settings, and
  the Offer write's re-check stays as shipped. The alternative keeps Offer on the row (the threshold governs what friends
  browse, not what you choose to hand over), which changes the write's rule and needs the Settings sentence reworded.

## Gap report (READINESS.md has the detail)

- G1 Request history reads offers (direction by who started it; withdrawn hidden from the non-starter).
- G2 An open action for the offer answer sheet.
- G3 The offerer's answer item kicker (`Your request` today).
- G4 `loadHaveIt` returns below-threshold cards with the threshold.
- G5 Copy review of every new string (`copy strings.ts`).

## Files

| File | What |
|---|---|
| `Main.dc.html` | The three calls, Q1 and Q2, the gaps |
| `History.dc.html` | H1 to H4 phone, D1 and D2 desktop: From you, To you, both empty |
| `Sheet.dc.html` | S0 to S2 phone, D0 to D2 desktop: the Home item, Accepted, Declined |
| `Threshold.dc.html` | T0 to T3 and G1 phone, D0 to D4 desktop: today, only under, mixed, the sheet, Settings |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the verdict and gaps |
| `art/yr2-*.webp` | The frames (2x), rendered from main 7563036 |
| `scratch-gen/` | `proposal.diff` (the change against main), how the frames were made (`HOW.md`). Reference only; never import. |

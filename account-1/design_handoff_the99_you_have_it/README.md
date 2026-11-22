# You have a card a friend wants · R1

Account 1, 2026-11-22. Status: **R1, for Hugh's review. No PR until he approves.**
Canvas (Design type): https://claude.ai/artifact/3px7adGsuhz7LDqFqHCMtS (Main, Wishlist, Sheet, Friend side, Ideas).

The mirror of Find a friend's spares (#3202). There, your Wishlist tile shows a friend's spare and opens Ask. Here, a
**friend's Wishlist tab** marks the cards on it that you have, and the press opens your copies with **Offer**, an ask
turned around. Hugh's brief: on another player's wishlist page; nothing on your own collection.

Read with: `design_handoff_the99_spares_search` (#3202, the tile press), `design_handoff_the99_spare_requests` (Ask, Yes/No,
Waiting on you), `design_handoff_the99_social_r2` (a friend's wishlist), `design_handoff_the99_wishlist_printing` (#3179).
Unchanged: Wishlist stays separate from Shopping; your own Collection and Wishlist draw nothing new.

## Calls

1. **A friend's wishlist marks the cards you have.**
   - The #3202 press on the friend's tile: outlined 26px box over the caption's lower right (6px in on the phone, 8px from
     `md`), `TOUCH_HIT` to 44px on a coarse pointer, the tile press's **sibling** (a button holds no button). The caption
     makes room (34px phone, 40px `md`) only on a tile with a press. Nothing of yours: nothing, no slot.
   - **You can spare it:** the spare glyph (`MarkedSpareGlyph`) in `--fact`. A spare by YOUR rule (`owned − hard − soft`,
     Settings › Spares' threshold and Keep), whether or not your spares are shared with that friend's pods.
   - **It's in your decks:** the shipped committed `OwnershipDot` (`--avail-hard-fg`): every copy is in a deck or draft, or kept back.
   - Marks on the glyph, the spare request ones: accent dot while an ask or offer between you for the card is open
     (`asked you` / `offered`), green tick once agreed (`sparing`). Declined, expired or withdrawn: the plain glyph.
   - A key line under the head names only the items drawn: `you can spare` · `in your decks` · `asked you` · `offered` · `sparing`.
   - Loading: the tab draws as shipped; one read of your copies for the list's cards lands after it; presses and key fade
     in (160ms, none under reduced motion). A failed read draws nothing.
2. **The press opens your copies** (`You have this`): the shipped spares modal's shell (`ModalChrome`, 640 on desktop, the
   sheet on the phone). Card box kicker `on Colin’s wishlist · wants 2`, the card (card details trigger), no buy tag.
   `Your copies · N`: a spare row (glyph, `1 spare`, `not in a deck or draft`, **Offer**), then one row per deck holding a
   copy (its commander's art, its name linking to the deck, the committed dot and `1 copy`). States: Offer → `Offered`
   (days left) → `Sparing` (green) or `Declined`. If the friend already asked you: no Offer; the row is their ask with
   `AnswerPresses` (Yes, No, days left) as on Waiting on you. Only in decks: no press, the foot explains.
3. **Offer is Ask in reverse.** One press, no note, for the copies the friend still wants, capped at your spares. The ask's
   rules: one open request per card between two people, 14 days, expiry derived, ✕ in Your requests withdraws. The friend
   gets a Waiting on you row (`Spare offer`: `Max can spare you Lathliss` / `Max has 1 spare. You want 2.`) with Yes and
   No, Home's lead story and the push, as an ask. Their Yes is an accepted request on their side (Your requests:
   `Max can spare Lathliss`; their Wishlist tile's spare press ticks green). Offering reveals the spare even when your spares are
   not shared with their pods: the press is yours, on purpose.
4. **Phone and desktop:** one design.

## For Hugh

- **Q1 · Copies only in your decks:** show the committed dot with no Offer (recommended), or mark spares only.
- **Q2 · Offer, or the marker alone:** Offer (recommended), or a view-only sheet where you reach out yourself.
- **Q3 · Extras (Ideas board):** A, `you have 4` leading the key line; B, the shipped spare chip on /friends rows with how
  many of that friend's wanted cards you can spare; C, a `You can help` Waiting on you row when a friend adds a card you can
  spare (a reverse trade match). Recommended: A and B, hold C.

## Files

| File | What |
|---|---|
| `Main.dc.html` | The calls, the questions |
| `Wishlist.dc.html` | F0–F1 phone, D0–D1 desktop: loading, loaded, close up |
| `Sheet.dc.html` | F2–F6 phone, D2–D5 desktop: Offer, Offered, asked, only in decks, sparing |
| `Friend-side.dc.html` | C1–C2: the offer in the friend's Waiting on you |
| `Ideas.dc.html` | A, B, C (Q3) |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the verdict |
| `art/yh-*.webp` | The frames (2x), rendered from main f17ab2a |
| `scratch-gen/` | How the frames were made (`HOW.md`). Reference only; never import. |

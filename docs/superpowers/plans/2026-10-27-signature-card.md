# Signature card and spare asks outside Shopping: implementation plan

Handoff: `design/design_handoff_the99_avatar/` (R1b, Hugh approved 2026-10-27; merged as #2265). Audit against the rebased
tree, 2026-10-27: **Yellow**, with no substantive design gap. Every open item is engineering's. Backend start point: #2263
(`setCommander(viewer, oracleId, printingId?)`, `social_profiles.commander_printing_id`, the art chain).

## Rulings (Hugh, 2026-10-27, from the handoff)

- A face can be any game card in any of its printings. The printing is stored, and a printing that leaves the catalog
  falls back to the card's usual art without telling anyone. Only the picker says so (call 7, P8).
- The label is "Signature card" (call 1). The face is still drawn the same way: art, no frame, no name.
- Players are asked once: an unnumbered first-run row, or for an existing profile a Home strip. Skip, ✕ or any pick
  ends it for good (calls 4, 5). The face is edited only on /friends and opened in place everywhere else (call 6).
- A friend's Spares tab tile opens the shipped `SparesSheet` with that friend first. The trade-match push, its Home item
  and its Waiting row deep-link with `?spare=` (calls 8, 9).

## Engineering's calls (orchestrator's proxy, 2026-10-27)

- **The gap names follow #2263, not the handoff.** The handoff's `setFace` is `setCommander`, `face_printing_id` is
  `commander_printing_id`, and `notAPrinting` is `badPrinting`. Renaming shipped symbols buys nothing.
- **G1, the game-card rule.** `setCommander` adds `isGameCard`, so a token, emblem or art card is refused as `noCard`.
  The search offers only game cards, so the two agree.
- **G4, ask once.** `user_prefs.face_prompt_done_at` (nullable timestamp). It goes in `user_prefs` because `user_prefs`
  carries the `user_data_touch` trigger and `social_profiles` does not: Home's cached payload reads it, and a pick has to
  move Home's stamp. Every pick writes the flag in the same transaction as the face, and the write happens only while
  the flag is null (a no-op update would move the stamp anyway).
  - **No profile yet:** the checklist row's picker makes one first (`ensureProfile`, the /friends path), so a pick
    never answers `noProfile`.
- **The switch.** `SIGNATURE_CARD_ENABLED`, feature, needs `SOCIAL_FRIENDS_ENABLED`. It gates the any-card search, the
  printings screen, the label, the first-run row and the Home strip. All of these are new surfaces on Home, and a
  regression on Home is plausible. Off, the picker is exactly as shipped (commander search, "commander" words).
  - **Spares asks need no new switch.** They ride `SPARE_REQUESTS_ENABLED`, which is the asking feature itself. With
    it off, a Spares tile opens card details as shipped, and no link carries `?spare=`.
- **P8 is derived from the join the art uses.** `printingGone` is `commander_printing_id is not null and
  face_printing.art_crop_uri is null`, over `faceJoin`. So the note and the art can never disagree. That covers a
  printing that lost its crop, and one whose oracle id moved under it (the printings ingest overwrites both). A printing
  deleted outright is erased by `ON DELETE SET NULL` and can't be seen. The note's wording ("has left the catalog")
  goes to `/copy-review` with that in mind.
- **"From your decks" saves each deck's own printing.** `resolveCommanderPrintingsByDeck` gives a set code and
  collector number. The deck-tile read resolves those to a `scryfall_id`, and a deck with no pick saves null (the usual
  art).
- **Copy:** every string goes through `/copy-review` in the PR that draws it.
- **All features.** `SIGNATURE_CARD_ENABLED` sits in `ALL_FEATURES_EXCLUDED` from PR 1a until close-out. That way an
  `ALL_FEATURES` override never shows a half-built line.
- **Home's ask is decided outside the cached payload.** The face comes from `loadHomeFriends`, which runs per request
  (`src/app/page.tsx`). The row and the strip take "has a face" from that read, never from the cached load. The flag
  is read beside it.
  - **The strip shows with no profile, too.** That's the player who imported a deck first. Picking runs
    `ensureProfile` before the write, from the same action the checklist row uses.
- **`?spare=` goes only where there is one card.** That's the single-card trade-match push. The one-friend-many-cards
  push and the many-friends push keep their plain links. The feed item and the Waiting row follow the same rule.

## PRs (no stacking; each cut from main after the last merges)

1a. **Backend: switch, flag and the write.** Migration (the switch's `flag_overrides` constraint, plus
   `user_prefs.face_prompt_done_at`), the registry entry and its `ALL_FEATURES_EXCLUDED` line, and the flag
   function. `setCommander` adds `isGameCard` and sets the flag in the same transaction while it is null.
   `skipFacePrompt`/`facePromptDone` with an SQL test.

1b. **Backend: the reads and actions.** *(Folded into PR 2 on 2026-10-27, where its caller is: together they come to about 18 files, under the limit, so no action ships without a consumer.)*
   - `searchFaceCards(query)`: every game card, type line, printing count, 12 hits.
   - `listFacePrintings(oracleId)`: printings with an art crop, usual art first, then newest set, with set name,
     code, collector number and full-card image.
   - Deck tiles carry the deck's printing id. `OwnProfile.commander` carries `printingId` and `printingGone`.
   - Actions (`searchFaceCardsAction`, `listFacePrintingsAction`, `skipFacePromptAction`), each re-checking the switch.
   - `probe:face-printing` extended on a scratch branch (1a adds the game-card rule and the flag; 1b the reads).

   The actions have no caller until PR 2 and 3. That is planned, and it is why they land with a probe (which also
   covers 1a's write).
2. **The picker (with 1b).** `CommanderPicker` with the switch on draws the search over any card (type line, N printings ›),
   then a second screen: face preview, printing tiles from the printing picker's tile anatomy, set search over 12,
   Usual art first, and Shown now plus the note for P8. One press saves (`setCommanderAction(oracleId, printingId)`)
   and closes. The label sweep goes on /friends' head. Covers P1 to P8 at 390 and D1 to D2 at 1300.
3. **Ask once.** The first-run row (todo, done and skipped states) before Add your friends, and the Home strip in the
   welcome strip's shape with ✕. Both open the PR 2 picker in place. Home's cache key is unchanged, because the
   flag is in `user_prefs`.
4. **Spares asks outside Shopping.**
   - A Spares tile opens `SparesSheet`. The sheet gets a `leadFriend` prop (that friend first, then the rest by
     `orderSpares`) and a wishlist kicker in place of "Replacing" when the sheet is opened from a friend page.
   - The tab line gets "Press one to ask for it."
   - The tile's count line carries "· Requested" or "· ✓ Accepted".
   - `?spare={oracleId}` goes on `friendRoute` (trade-match push), the feed's trade-match href and the Waiting row.
     The friend page opens the modal on landing and strips the param through `mirrorUrl`. A spare that has gone
     shows the shared toast.

   Shopping's and the cart's callers are unchanged.
5. **Close-out.** The About edit to the `friends` entry (with the `keySwitches` pair) and the batched `ABOUT_VERSION`
   bump. Fix the entry's shipped "account menu, Press" defect. `docs/agents/social.md` and the AGENTS.md line. Turn the
   switch on for staging, dispatch Staging sync, walk both widths, and run `feature-acceptance` at line close.

## Inventory (feature-acceptance)

`docs/superpowers/inventories/signature-card.json`, rows by PR:

- PR 2: `/friends` head, picker search, printings screen.
- PR 3: Home first-run row, Home strip.
- PR 4: friend Spares tab, the sheet open from a tile, a `?spare=` landing.

Every row is photographed at 390 and 1300.

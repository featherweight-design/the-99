# Build prompt · Signature card and spare asks outside Shopping (R1b)

Paste into Claude Code on your machine. PR #2265 is merged.

---

Build the signature card (the face as any card in any printing) and spare asks from a friend's Spares tab and the trade-match notification.

Before you start:
- Read `design/design_handoff_the99_avatar/README.md` (calls 1 to 9, the states table, gaps G1 to G6), then `READINESS.md`. Open each `.dc.html` with `support.js` beside it.
- Work in a worktree under `.worktrees/`, as AGENTS.md says.
- Every string is a placeholder for /copy-review.
- Every cross-user read stays in `src/lib/social/` (`check:social-reads`).
- Add a feature switch only if you see a plausible regression (G6).

Decisions already made:
- **Label:** "Signature card" (call 1). The empty head press reads **Choose your signature card**, and the picker title reads **Your signature card**.
- **One place to edit:** /friends. Settings does not get the face (call 6).
- **Spare tiles:** Requested and ✓ Accepted sit on the tile's count line ("1 spare · Requested"). They never add a line, so the grid stays even (Hugh, R1b).

Order of work:

1. **Store (G1, G2, G4).**
   - `setCommander` becomes `setFace(viewer, oracleId, printingId | null)`.
   - Drop `canBeFace`'s commander rule. Any game card is allowed, but no tokens, emblems or art cards.
   - The printing must belong to that oracle id, otherwise refuse with `notAPrinting`. A null printing means the usual art.
   - Add `social_profiles.face_printing_id`, nullable. Face reads left-join the printing's art crop and fall back to the card's `art_crop_uri` when the printing is gone. The fallback writes nothing.
   - Add one account flag, `face_prompt_done_at`. Skip, the Home strip's ✕ and any pick each set it.
   - Run the purge coverage test and the probes the change touches.
2. **Reads (G3).**
   - `searchFaceCards(query)` searches every game card and returns a printing count.
   - `listFacePrintings(oracleId)` returns the printings that have an art crop: usual art first, then newest set first, each with set name, code and the full-card image.
3. **The picker (Picker board, P1 to P8, D1 and D2).**
   - Use the shipped `CommanderPicker` in `SocialModal`, keeping the **From your decks** row.
   - **Results:** show the type line under the name. A result with one printing saves on press.
   - **Several printings:** the result reads **N printings ›** where the pips sat. It opens a second screen with ‹ back, a face preview on top, then printing-picker tiles (63/88 full card, set name and code), with the shipped set search when there are more than 12.
   - **Saving:** one press saves and closes, with a spinner on the pressed tile and the rest dimmed. A failure keeps the sheet open and shows the shared toast.
   - **Gone printing (P8):** the printing screen shows a note box, and the usual-art tile reads **Shown now**.
   - **Crop:** the printing's art crop, for every card.
4. **Onboarding (Onboarding board).**
   - **Checklist row:** one unnumbered row in `first-run.tsx`, under the three steps and before Add your friends. It is live from the first visit and has Skip. Once done, it shows ✓, the face and "Change it any time on Friends.", and pressing it reopens the picker.
   - **Home strip:** existing profiles with no face that never skipped get one Home strip, in the welcome strip's shape, with a bare ✕.
5. **/friends head and About (Edit-About board).**
   - **Head:** use the new labels; the face itself is unchanged.
   - **About:** edit the `friends` entry's second paragraph in `about-entries.ts`, so "Pick a commander" becomes "Pick a signature card, any card in any printing,". It rides the next batched `ABOUT_VERSION` bump with no halo.
6. **Spare asks outside Shopping (Spares board, G5).**
   - **Tile press:** on a friend's Spares tab (`friend-spares-tab.tsx`), a tile press opens the shipped `SparesSheet` for that card.
     - The page's friend is listed first, then the rest, most spares first.
     - The box kicker reads **on your wishlist** (or nothing) instead of "replacing".
     - The tab's line adds "Press one to ask for it."
     - ✕ returns focus to the tile.
   - **Deep link:** `/friends/{publicId}?spare={oracleId}` goes on the trade-match push url, its Home item and the Waiting on you row.
     - On landing, open the modal with that tile ringed, if the friend still offers the card. Strip the parameter through `mirrorUrl`.
     - If the spare has gone since, open no modal and show the shared toast: "Colin no longer has a spare Ghalta, Primal Hunger."

Phone (390) and desktop (1300) ship together in each PR.

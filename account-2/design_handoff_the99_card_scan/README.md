# Card scanning · R1

Hugh's brief, 2026-10-16. Source of truth: `docs/superpowers/research/2026-10-15-card-scan-feasibility.md`
(branch `scan-real-photos`), with its Real photos section: 94% right on Hugh's own photos, sleeved and hazy weakest,
about 0.5s a frame, a margin gate that sorts sure from not sure.

## Locked by the brief

- The flow mirrors ManaBox: download the card index once, choose Fast or Normal, shoot a batch, review, then add.
- Photos are taken in our app.
- It matches the card, not the printing. The player picks the set (Normal) or it takes the first (Fast).
- A frame is confirmed before it counts. Nothing is added unseen.

## The calls

1. **Every result is a suggestion.** Above the gate: the card at card size and one press, *Add to the list* (V3).
   Below it: *Not sure. Which is it?* with the top three at card size and *None of these* (V6); in sleeves a line
   says to tilt the card away from the light. Nothing reaches the collection without a press in the camera, the
   review, then one Save.
2. **The review is the shipped Add cards list.** *Review N* closes the camera onto the sheet with the batch on it,
   newest first (L1). Every line is the shipped line. The one addition: on scanned lines the card's name is a press,
   which opens the line on the player's scan and its three closest cards (L2). Normal mode lands each card with the
   shipped required printing step, Save held until done (L3). One Save, one History entry, Revert takes it back (L4).
3. **The viewfinder.** *Looking* with dashed corners (V1); corners light pink and dots count while frames agree, no
   name yet (V2); three agreeing frames show the guess (V3). Pointerdown on the press freezes the guess and the
   frame (*Held*, V4): lift on the button adds, slide off cancels, so a moving card can't swap under a finger.
   Added cards fly to the tray (V5).
4. **Duplicate or second copy.** A card that never left the frame is never offered again; the panel reads *✓ On the
   list · ×1* with *Add another copy* as a deliberate press (R1). The same card after the frame was empty is offered
   again as *Add a second copy* (R2). Fast folds copies into one line ×2 (R3). Normal folds them when the same
   printing is chosen, with the shipped "already on the list" notice (R4).
5. **The index.** About 27 MB, once, on the first Scan (D1). A real bar in MB (D2); offline before starting (D3);
   paused when the connection drops, resuming by itself from where it stopped (D4); a server error is the shared
   toast with one Try again (D5). Ready opens straight into the camera (D7).
6. **Light.** After about a second of dark frames: one line naming the light control, which gets a ring (V7). No
   torch on the device: no control, and the line asks for a lamp (V8). On, the control fills (V9).
7. **Where it lives.** A *Scan* press beside the search in the Add cards sheet, both widths (E1, W1). Not a row and
   not a head button, so it stays there once the list has lines and a batch can be topped up.
8. **Fast or Normal** is one segmented control in the camera's top bar, remembered per device. Fast is the default.
9. **Desktop.** Scan turns the sheet's search into a webcam panel; cards land on the list below it, so the sheet is
   the review (W2, W3). No webcam or blocked: *Choose photos*, several files, one card each. Sure photos wait for one
   bulk press, Sync review's pattern; Not sure photos show their top three (W4, W6). The phone's blocked camera
   offers the same photos path (D6).

## Gaps for Hugh

- **G1 · One tap to fix. Settled by Hugh 2026-10-16:** one tap isn't needed. The name press opening the closest
  cards stands, with *Search for it instead* when none match (L2).
- **G9 · Card art or a graphic. Settled by Hugh 2026-10-16: B and T3.** D1–D5 show the scan mark, a blank 99 card
  inside the camera's pink corners, with a scan line that sweeps while the index downloads (still under reduced
  motion). The tray is a count card on the brand fan; on each add its front card flips to the card just added for a
  moment, then back to the count (V5). No fixed card art anywhere. The options are kept in
  `R1 - Options-Images.dc.html`.
- **G2 · Fast is the default.** Fewer steps for a batch; any printing can be changed on the list.
- **G3 · Index updates.** New sets mean new rows. Drawn as a quiet background top-up with no screen; engineering
  sizes it. (The research also recommends matching on our server, which would drop the download; the brief's
  download is what is drawn.)
- **G4 · "First printing"** is the first tile the shipped printing picker shows. Engineering confirms the order.
- **G5 · Fixtures.** Set codes and printings are placeholders, and printing tiles reuse the one image per card.
- **G6 · The empty Collection's group** ("No file? Start another way") gets no scan row; *Add cards by hand* already
  opens the sheet with Scan in it.
- **G7 · Steadiness** is three agreeing frames (about 1.5s at 0.5s a frame). The lab's cadence log tunes it.
- **G8 · About version.** A new entry bumps `ABOUT_VERSION` at launch: 15, or 16 if no-collection's entry took 15.

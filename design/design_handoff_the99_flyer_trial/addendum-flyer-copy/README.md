# The 99 · Flyer trial addendum: flyer copy (account 2, 2026-11-03)

Canvas: https://claude.ai/artifact/Y8qg3WM8HBQUsvLd8yENoY
Status: **B3 APPROVED by Hugh 2026-11-03**, with "Scan, sign up, tell us what you think." kept beside "Try it before it launches."

Hugh asked for flyer copy that says why The 99 is different, with light Commander humor and few words. The first pitch, "Build Commander decks from the cards you already own.", describes something every player already does. Round 1 drew five headlines on the shipped flyer. Round 2 rewrote B's points as full sentences in three registers, and Hugh picked B3.

`Flyer-Copy.html` is the approved sheet: the shipped `FlyerSheet` at 816 × 1056 with the shipped print styles. It needs no `support.js` or `art/`; it loads Cinzel and IBM Plex from Google Fonts.

## What changes

Only the words between the kicker and the card fan, and the fan's size. The wordmark, kicker, QR, typed address, footer facts and the Fan Content notice (locked) are unchanged.

| Slot | Was | Now |
|---|---|---|
| Pitch (`flyerCopy.pitch`, Cinzel 800 50px) | Build Commander decks from the cards you already own. | Search your library for a commander. |
| Points (new, `flyerCopy.points`) | none | Find the commanders hiding in your binder. · Learn which combo is only one card away. · Borrow a friend’s spare before you pay for one. |
| Sub (`flyerCopy.sub`, Plex Sans 20px) | We’re looking for players to try it before it launches. Scan, sign up, tell us what you think. | Try it before it launches. Scan, sign up, tell us what you think. |

- **The pitch** parodies a tutor's rules text ("search your library for a card"). Library is the player's word for a deck, so it reads as a joke to players and as a plain promise to everyone else.
- **The points** name three shipped features: For you's fit (commanders your collection already suits), Combos one piece away, and spare requests (Ask a friend for a spare). Each is one full sentence on one line.
- **The list**: Plex Sans 400 20px/1.35 in ink, 8px apart, 18px under the pitch. Each line leads with a 9px ink diamond rotated 45°, like the crown's, 14px before the text. The sub sits 16px under the list and stays on one line.
- **The card fan** drops from `zoom: 0.8` to `0.68` so the sheet still fits letter. The QR then prints about 1.5 in wide, which a phone reads from arm's length. `.fs-url` loses its 6px top margin.
- One black ink. The print page and `@media print` rules are unchanged.

## Copy

The three points and the new pitch are player-facing (a printed flyer). Hugh approved them in the thread on 2026-11-03; they still go through `/copy-review` with the code PR. "Library", "binder" and "combo" are plain game words.

## Superseded

`flyer-trial · copy strings.ts` and `Flyer.dc.html` / `Print.dc.html` still show the R1b pitch and sub. This addendum replaces those three strings; nothing else in the flyer trial handoff changes.

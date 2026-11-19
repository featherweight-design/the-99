# Readiness: Life tracker

**Verdict: Green to build.** Hugh approved the round on 2026-11-18. Checked against `origin/main` @c8fd948. No migration,
no schema change; the tracker is a client-side surface on the Rule 0 table. Suggest a feature switch (new full-screen
surface on a shipped page). New player-facing copy is DRAFT for `/copy-review`.

## For engineering

- **Entry:** `src/components/rule-zero/table-body.tsx` gains **Start the game** for the setter, beside `Log this game`.
  The tracker reads the table's seats and decks (`src/components/rule-zero/setup-sheet.tsx` is the setup pattern to match).
- **Seat cap:** `src/lib/social/client-rules.ts` has `SEATS_MAX = 8`. The tracker supports 2–6; at 7–8 seated, Start the
  game stays visible and disabled with the reason ("The tracker fits up to 6 players"). Don't change the table cap.
- **State:** a reducer for life, counters, commander damage (per commander, partners separately), tax, mana, monarch,
  initiative, day/night, active seat, round, history (by round) and undo. Persist to local storage keyed by table.
  Round rule: increment when the active seat passes the first player's seat (skip seats that are out).
- **Result → log:** prefill via `src/lib/social/rule-zero-log.ts` (`TablePrefillSeat`) with placements; no new endpoint.
- **Offline:** check `public/sw.js` caches the tracker route so a game survives a dropped connection; keep the screen
  awake (Wake Lock API) while a game runs; `src/app/manifest.ts` orientation stays as is (panels rotate themselves).
- **Icons:** `scripts/fetch-mana-symbols.ts` fetches only `appears_in_mana_costs` symbols from Scryfall symbology. Extend
  it to pull {E}, {TK} and the Phyrexian symbol, and fetch the LTR set symbol (Scryfall `sets/ltr` `icon_svg_uri`) for
  The Ring. DFC sun/moon from the same source. The rest are the drawn icons in `I1-Icons.dc.html` / `I2-IconsPass2.dc.html`.
- **Dice:** pick a small 3D dice library (physics roll, d6/d20, plus a coin); dynamic `import()` on the first dice tap
  or at setup with Random. Respect `prefers-reduced-motion` (show the result without the roll).
- **Partners:** split art and per-partner commander damage and tax need both commanders from the deck; the partners
  handoff already resolves them.

## Open
- Copy review for all new strings.
- Library choice for dice (bundle size budget).

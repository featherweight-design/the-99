# How the boards were made (account 1, 2026-11-23)

As `design_handoff_the99_you_have_it/scratch-gen/HOW.md` (scratch copy of main src at 7563036, npm install with the
query-core override, clerk stub, `use-min-width` server snapshot reads `globalThis.__VW`, export `HelpContext` /
`CardSearchContext`). Static-render hooks in the scratch copy only:
- `decks/tuning-tool-mark.tsx`: a `consider` mark. `decks/tuning-hub.tsx`: a `consider` spec and tile (`tileOf`), initial
  `tiles` / `opening` from `globalThis.__TILES` / `__OPEN`, `__INTAB` drops the h2 and the top rule, the Consider tile spans md.
- `collection/grid-view.tsx`: `GRID_EAGER_TILES = 99`; each tile wrapped in `div.relative` with `{globalThis.__FIT?.(c)}`.
- `social/social-modal.tsx`: renders inline when `globalThis.__INLINE` (no portal host in SSR).
- `welcome/where-credits-work.tsx`: `Row` exported; `{globalThis.__FREEBLOCK}` after the rows; `useLocalDay` ready under `__INLINE`.
R2 frames: `r-coll.tsx` writes f0–f2 (`r2: true`), `r-home.tsx` writes h1; shot with `specs-r2.json`. The scripts need a stub `DATABASE_URL`.
Fixtures: the landing demo's `projected()` (deck, Find a deck read re-pointed at Killian); art from other handoffs' large
`c-*.jpg` crops (no stamps). Then `node dz/css.mjs`; `npx tsx dz/r-deck.tsx all`, `dz/r-coll.tsx`, `dz/r-home.tsx`;
`node dz/shot.mjs dz/specs.json`; PNG to `art/td-*.webp` (crops in the converter); `python3 gen.py repo|canvas <out>`;
`node measure2.mjs <copy with support.js stripped>`.

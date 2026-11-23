# How the boards were made (account 1, 2026-11-23)

As `design_handoff_the99_you_have_it/scratch-gen/HOW.md`: a scratch copy of main's `src`, `package.json`, `tsconfig.json`,
`postcss.config.mjs`; `@fwd-stack/*` dropped, `overrides["@tanstack/query-core"]="5.108.2"`, a plain tsconfig with
`jsx: react-jsx` and `paths["@clerk/nextjs"] = ["./dz/clerk-stub.tsx"]`; `npm install --ignore-scripts`. Shell, css, page,
shot and clerk stub are R1's (`../design_handoff_the99_you_have_it/scratch-gen/`).

1. Apply `proposal.diff` to the scratch copy.
2. Static-render hooks (scratch only, not in the diff): export `CardSearchContext` and `HelpContext`; `use-min-width` server
   snapshot reads `globalThis.__VW`; `request-history.tsx` starts on `globalThis.__TAB`; `friend-wishlist.tsx` opens
   `globalThis.__OPEN` and `EAGER_TILES = 99`.
3. Card and face crops from other handoffs' `art/` and `public/mana` into `out/`.
4. `node dz/css.mjs`; `DATABASE_URL=postgres://s:s@localhost/s npx tsx dz/r-r2.tsx`; `node dz/shot.mjs dz/specs.json`;
   PNG to `art/yr2-*.webp`; `python3 gen.py repo <handoff>` and `python3 gen.py canvas <root>/project` (canvas reads `blobs.json`).

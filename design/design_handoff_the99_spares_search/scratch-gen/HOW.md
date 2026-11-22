# How the boards were made (account 1, 2026-11-22)

1. Copy main's `src`, `package.json`, `tsconfig.json`, `postcss.config.mjs` into a scratch folder. Drop `@fwd-stack/*` and
   `pnpm`, add `overrides["@tanstack/query-core"]="5.108.2"` (5.108.3's tarball 404'd), drop tsconfig `extends`, add
   `jsx: react-jsx` and `paths["@clerk/nextjs"] = ["./dz/clerk-stub.tsx"]`. `npm install --ignore-scripts`; symlink the global
   playwright into `node_modules`. Put these files in `dz/`.
2. Static-render hooks in the scratch copy (never in the app):
   - `ui/filter-panel.tsx`: `useState(false)` for `open` becomes `useState(() => globalThis.__OPEN_PANEL === copy.triggerLabel)`.
   - `ui/use-min-width.ts`: the server snapshot reads `globalThis.__VW` against the query's min-width.
   - `wishlist/wishlist-view.tsx`: `li` gets `relative`; `{globalThis.__SPARE?.(tile)}` after the trigger; `{globalThis.__META?.()}`
     after the meta count; the sort pill reads `globalThis.__SORT` when set.
   - `collection/grid-view.tsx`: `GRID_EAGER_TILES = 99`; export `CardSearchContext` and `HelpContext`.
3. Copy card crops (`c-*.jpg`, `face-*.jpg` from other handoffs' `art/`) and `public/mana` into `out/`.
4. `node dz/css.mjs`; `DATABASE_URL=postgres://s:s@localhost/s npx tsx dz/r-spares.tsx`; `node dz/shot.mjs dz/sp.json`;
   shots to webp `art/ss-*.webp`; `python3 gen.py repo|canvas <out>` (canvas reads `blobs.json`); `node measure2.mjs <dir>`
   on a copy with the support.js tag stripped checks images and sizes.

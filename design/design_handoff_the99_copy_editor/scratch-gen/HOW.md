# Copy editor R1 (2026-11-24): how the boards were made
Scratch copy of main 5a06e8c at /home/user/work (ephemeral): src, public, package.json without @fwd-stack, overrides
@tanstack/query-core 5.108.2, plain tsconfig (jsx react-jsx, paths @/* and @clerk/nextjs -> dz/clerk-stub.tsx), npm install --ignore-scripts --legacy-peer-deps.
Static-render hooks (scratch only): export HelpContext (help-root.tsx) and CardSearchContext (card-search.tsx); use-min-width
useMinWidth server snapshot reads globalThis.__VW against the query's px/rem.
Art: crop-{ghalta,gisa,lathliss,giada,zimone}.jpg from design/*/art into out/art; symlink public/mana to out/mana.
Run: node dz/css.mjs; DATABASE_URL=postgres://s:s@localhost/s npx tsx --tsconfig tsconfig.json dz/r-cpe.tsx (frames p, d, ph);
node dz/shot.mjs dz/specs.json (each spec appends overlay.js and calls CE(state, 'p'|'d')); PNG -> art/ce-*.webp
(phone 780w at 2x, desktop resized to 1950w). Boards: python3 gen.py canvas|repo <dir> (blobs.json = uploaded /_blob urls).
Canvas: https://claude.ai/artifact/L1Txt4qfTYSGciaRkshzoD

Insert addendum (2026-11-25): `gen_ins.py` and `shot-insert.js` built the Insert-* boards. Like the scripts above they take paths outside the repo (a scratch copy of main) and do not run from here.

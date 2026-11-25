# Collection quick filters (2026-11-24): how the boards were made
Scratch copy of main d5f1466 (ephemeral): src, public, package.json without @fwd-stack, overrides @tanstack/query-core 5.108.2,
plus tsx + postcss; tsconfig paths @clerk/nextjs -> clerk-stub.tsx; npm install --ignore-scripts --legacy-peer-deps.
Static-render hooks (scratch only): export HelpContext (help-root.tsx) and CardSearchContext (card-search.tsx); use-min-width
server snapshot reads globalThis.__VW; shell.tsx adds SearchParamsContext from globalThis.__SEARCH.
Card art: design/*/art clean card images only (card-*.jpg and c-*.jpg without baked-in markers) copied to out/art/c-<slug>.jpg.
Run: node css.mjs; DATABASE_URL=postgres://s:s@localhost/s npx tsx r-qf.tsx (frames {p,d}-{all,closed,free});
node shot.mjs specs.json r2- (overlay.js QF('r2-full'|'r2-sparse'|'r2-active'|'r2-combo-both'|'r2-combo-one', 'p'|'d'));
python3 towebp2.py -> art/qf-<p|d>-r2-<state>.webp.

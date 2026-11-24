# Quiet Home R1 (2026-11-24): how the boards were made
Scratch copy of main cc89ad77 at /home/user/work (ephemeral): src, public, package.json without @fwd-stack, overrides
@tanstack/query-core 5.108.2, plain tsconfig (jsx react-jsx, paths @/* and @clerk/nextjs -> dz/clerk-stub.tsx), npm install --ignore-scripts --legacy-peer-deps.
Static-render hooks (scratch only): export HelpContext / CardSearchContext; use-min-width server snapshot reads globalThis.__VW;
home-search-panel useFanArt server snapshot reads __FANRAW; where-credits-work useLocalDay ready under __INLINE;
shell.tsx context adds starters (__STARTERS), openSearchWith, warmStarters.
Proposal: apply proposal.diff (dashboard.tsx, whats-new.tsx). Scratch flags on top: __SHIPPED (no move), __WNPOS="above" (Q1 B), __ANY (Q2 B).
Fixture fix.tsx (busy-day fixture from tool-discovery r12.tsx). Art from design/*/art (c-*, a-*, face-*) into out/art; symlink public/mana to out/mana.
Run: node dz/css.mjs; DATABASE_URL=postgres://s:s@localhost/s npx tsx --tsconfig tsconfig.json dz/r-quiet.tsx (and r-tb.tsx);
node dz/shot.mjs dz/sp-q.json ("tall" sets the viewport to the page height); PNG -> art/qh-*.webp at 1x.
Canvas: https://claude.ai/artifact/L8HdCGmfcJ5FhPh9xPhKZX, boards in ../canvas/ (blob urls inline).

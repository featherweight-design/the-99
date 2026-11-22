# How the boards were made (account 1, 2026-11-22)

As `design_handoff_the99_spares_search/scratch-gen/HOW.md` (scratch copy of main src, npm install with the query-core
override, clerk stub, playwright symlink, export `HelpContext` / `CardSearchContext`, `use-min-width` server snapshot reads
`globalThis.__VW`). Static-render hooks in the scratch copy only:
- `social/friend-wishlist.tsx`: `EAGER_TILES = 99`; `li` gets `relative`; `{globalThis.__HAVE?.(line)}` after the trigger;
  `{globalThis.__HAVEKEY?.()}` after the `h2`.
- `social/waiting-on-you.tsx` `AskRow`: `ask.offer` swaps kind, title, detail and (optionally) the presses.
- `social/friend-wishlist.tsx` head count reads `globalThis.__HEADN` when set.
- `social/friends-list.tsx` `FriendRow`: `{globalThis.__FROW?.(friend)}` before the since date.
Then `node dz/css.mjs`; `DATABASE_URL=postgres://s:s@localhost/s npx tsx dz/r-have.tsx`; `node dz/shot.mjs dz/specs.json`;
PNG → `art/yh3-*.webp`; `python3 gen.py repo|canvas <out>`; `node measure2.mjs <copy with support.js stripped>`.

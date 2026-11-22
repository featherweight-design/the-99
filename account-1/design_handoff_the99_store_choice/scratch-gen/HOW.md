# How the boards were made (account 1, 2026-11-22)

1. Copy main's `src`, `package.json`, `tsconfig.json`, `postcss.config.mjs` into a scratch folder. Drop the `@fwd-stack/*`
   deps, drop `extends` from tsconfig, add `jsx: react-jsx` and `paths["@clerk/nextjs"] = ["./dz/clerk-stub.tsx"]`.
   `npm install --ignore-scripts`; symlink the global playwright into `node_modules`.
2. Copy `proposal/` into place and apply `proposal.diff` (new, in `proposal/`: `lib/store/stores.ts`, `lib/copy/store.ts`, `settings/store-section.tsx`,
   `decks/store-door.tsx`; patched: `price-strip.tsx`, `cart-checkout.tsx`, `demo-card-modal.tsx`, `feed-item.tsx`,
   `worth-card.tsx`; exported `CardSearchContext` and `HelpContext`; Wishlist tiles all eager for the shot).
   The store comes from a `globalThis.__STORE` hook; in the build it is a per-request read.
3. `node dz/css.mjs`; `DATABASE_URL=postgres://s:s@localhost/s npx tsx dz/r-settings.tsx` (and r-shop, r-card, r-bits).
4. `node dz/shot.mjs dz/sp-*.json`; shots to webp in `art/`; `python3 gen.py canvas|repo <out>` writes the boards
   (`blobs.json` maps each frame to its canvas upload); `node measure.mjs` checks every board's height and images.

# scratch-gen · Friend links R1

How every frame was made (the A3 recipe of the landing and precon rounds, extended to the whole shell):

1. Copy main (no `.git`) to a scratch folder; drop `@fwd-stack/*` from package.json; `npm install --ignore-scripts`.
2. Replace `tsconfig.json` with `tsconfig.scratch.json` (no `extends`, `jsx: react-jsx`, and `paths` that point
   `@clerk/nextjs` and `next/navigation` at `stubs/clerk.tsx` and `stubs/nav.ts`).
3. `patch -p1` with `friend-links.diff` (the proposal as code: friend-request rows in `waiting-on-you.tsx`,
   `friend-link-body.tsx`, the avatar override in `account-menu.tsx`, a static draw for `SocialModal`, the empty-copy edit).
4. `node css.mjs` (Tailwind over `src/app/globals.css` → `out/app.css`); copy the social R1 `art/*.png` into `out/art/`.
5. `DATABASE_URL=postgres://x:y@localhost/z npx tsx dz/render.tsx` → `dz/frames/*.html` and `frames.json`.
6. `node dz/shoot.cjs` → `out/shots/*.png` (2x, reduced motion; chromium at /opt/pw-browsers/chromium).
`blobs.json` maps the canvas's uploaded assets back to these file names.

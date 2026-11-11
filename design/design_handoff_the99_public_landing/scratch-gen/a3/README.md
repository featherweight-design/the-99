A3 generator (reference only, never shipped code). The boards are the shipped TopBar and Hero rendered with the
shipped CSS: copy main into a scratch folder, drop the @fwd-stack devDeps, `pnpm install --ignore-scripts`, apply
hero-variants.diff (a `v` prop picking shipped / stack / scale / rec classes, and Hero + TopBar exported), then
`tsx hero/render.tsx`, `node hero/css.mjs` (Tailwind over src/app/globals.css), `node hero/page.mjs` per theme and
`node hero/shoot.cjs "$(cat jobs.json)"`. a3gen.py writes the four boards (pass a folder for local image paths).

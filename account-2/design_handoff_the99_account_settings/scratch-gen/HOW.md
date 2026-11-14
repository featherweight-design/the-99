# How the boards were made (account 2, 2026-11-14)

1. `git archive` main into a scratch folder, `pnpm install` (drop the two `@fwd-stack/*` git deps; tsconfig without `extends`, `paths` gains `"@clerk/nextjs": ["./gen/clerk-stub.tsx"]`).
2. Apply `ssr-exports.diff` (exports the menu panels, the search and help contexts, the landing's TopBar and Hero; lets the sheet render without a portal; `__noManage` drops Manage account for the proposed menu).
3. Copy `proposal/` into `src/components/settings/` and `src/lib/copy/`.
4. `DATABASE_URL=postgres://s:s@localhost/s tsx gen/render.tsx`, `node gen/css.mjs`, `node gen/shoot.cjs <theme> [names]` (390 touch and 1300, scrolled to the Account section).
5. Shots to webp in `art/`; `python3 acc.py <out>` writes the boards (`blob` for the canvas's `/_blob` urls); `node render.js <out> <boards>` sizes and checks them.

# Re-rendering the boards

Scratch only: nothing here is imported by the app.

1. Check out main at the handoff's base, apply `proposal.diff` and `render-patches.diff` (static seeding of the spares
   provider via `globalThis.__SP*`, and eager art). Put these files in `dz/`, the stubs in `stubs/`, and
   `tsconfig.scratch.json` at the root. Card art is read from `out/art/<name>.jpg` (the clean `card-*.jpg` art in other
   handoffs works; avoid art with old UI markers baked in).
2. `DATABASE_URL=postgres://x:y@localhost/z npx tsx --tsconfig tsconfig.scratch.json dz/r5.tsx` writes `dz/frames/*.html`
   and `dz/frames.json`; `node dz/css.mjs` builds the CSS.
3. Page frames: `FULL=1 node dz/shoot.cjs` (A0 A1 L1 L2 E3 RH A2 N2 S0 S0w S4 S9 H1 ST).
   Sheet frames: `node dz/shoot_sheet.cjs S1,S2,S3,S3t,S3p,S5,S6,S7,S8,T5,T6,T8,T8b,T9,A3,D1,D2,D3,D4` (tall viewport,
   cropped under the sheet).
4. Convert to webp (q78) as `final/<id>-<desk|phone>.webp` with `final/sizes.json` (css px = shot px / 2).
5. `python3 dz/boards_final.py final handoff` writes the boards and `canvas.json` (images at `art/`).

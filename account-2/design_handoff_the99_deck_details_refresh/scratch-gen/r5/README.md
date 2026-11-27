# R5 render recipe (account 2, 2026-11-27)
Scratch copy of main 6f2c90e2 (src, package.json, lockfile, tsconfig), drop the private @fwd-stack devDeps, `pnpm install --ignore-scripts`,
symlink node_modules/postcss to the .pnpm copy, put these files in dz/ and tsconfig.render.json (from ../r4) at the root.
Harness-only patch (both BEFORE and AFTER): tuning-hub.tsx `baselineRead` starts true when `globalThis.__EAGER`, since SSR runs no effects and the hub
otherwise draws no tool body. BEFORE = main as shipped; AFTER = main + proposal.diff.
  DATABASE_URL=postgres://x:y@localhost/z node_modules/.bin/tsx --tsconfig tsconfig.render.json dz/k5.tsx && node dz/css.mjs && node dz/shoot.cjs
Card art in out/art/ = ../../art/c-*.jpg.

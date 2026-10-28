# Contact sheet (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- `scripts/contact-sheet.mjs` photographs every surface in a feature's inventory at both widths
  and lays them out as one image, so a route that never got the feature, or a phone that is wrong
  while the desktop is right, is visible in a glance. Inventories live in
  `docs/superpowers/inventories/*.json`.

  Every step verb — `click`, `clickRole`, `fill`, and the selector `wait` — reaches page
  content through `lib/surface.mjs` (`onPage`, `onPageRole`), so an inventory never spells
  `main` itself and the scope has ONE definition. A second prefix would chain `main` inside
  `main` and match nothing. `wait` is scoped for the same reason as the rest:
  `wait: "[role=dialog]"` is in every inventory, and the shell's account sheet is also a
  `role="dialog"` sitting before `<main>`.

  A row that exists at one width only says so with `"widths": ["phone"]` or `["desktop"]`;
  the other width is skipped and reported as such rather than counted a failure. There is
  deliberately no optional click: a step that may find nothing cannot fail, and a cell that
  photographs a closed route reads as coverage. And a run that photographs NOTHING fails,
  whatever the cause — no rows, an empty `widths`, every row skipped by its own.

  `pnpm check:shared <inventory>` answers the half a picture cannot: whether routes that are
  supposed to carry the same control do it by rendering the same component. It reads the same
  inventories, and does nothing for one with no `shares` block. When a `shares` block is present
  it passes only when each row's own `view` imports the named `binding` as a value AND references
  it — the module is not enough (a view can take a constant or a type out of it and render its
  own copy), the exported name is not the local alias, a default or namespace import binds
  something else, and nothing here flags an unused local.

  **`shares.module` names a component that is used as-is, and each row's `view` names the file
  that imports and uses it.** What the check proves is a value import plus a reference — not a
  render, so `const C = Thing` satisfies it. It reads that file directly and does not follow
  composition, so the two have to agree. `FilterChassis` takes its controls as props and is assembled by a
  route-level wrapper, so naming the chassis while the rows named route views failed three routes
  for composing it correctly — and naming a leaf while the rows still name route views would fail
  them again, because the wrapper owns the import. Pick the component first, then set `view` to
  wherever each route renders it, which may be a wrapper.

- **`openAccount`** opens the account menu (the popover at 1300, the sheet at 390) and waits for its credit chip
  (`"chip": false` waits for the open menu alone; `"chipLine": true` also waits for the line under an expiring chip).
  It is the one verb that does not go through `onPage`, because the menu is shell and `onPage` scopes to `<main>`: it
  finds the trigger by `data-account-trigger`, as `openHelp` finds the ? by `data-help-button`.
- **`THEME=<key>`** draws every row in one theme (`amonkhet`, `kamigawa`, `ixalan`, `phyrexia`, `eldraine`,
  `kaldheim`). It sets the `the99_theme` cookie the server reads, on the context before the first page loads, and
  writes the run into `<out>/<key>/`, so one theme's pass never overwrites another's. Unset, every run draws Low Sun
  (`amonkhet`): the theme lives only in that cookie, and each run's browser starts without one.
- Browser scripts reach the page through `scripts/lib/surface.mjs` — `onPage()` and `openSheet()`
  — never a bare selector. The shell renders `NavRail`, `MobileHeader` and `TabBar` around
  `<main>`, and its account menu is a `button[aria-haspopup="dialog"]` at phone width, first in
  document order: an unscoped query finds the shell's control on every route and then measures it
  while naming the surface it meant to measure. That produced two findings in `probe-sets.mjs`
  that looked real and were not. `openSheet()` also waits for whatever is animating on the sheet
  to finish — page sheets arrive under `anim-sheet-in`, the shell's menu under `anim-sheet-up`,
  both 180ms — because a box measured mid-transform reads as hanging below the fold.
  `scripts/lib/surface.test.mts` parses every `probe-*.mjs` and sweeps its string literals for
  the unscoped forms, the same way `env.test.mts` enforces the env convention.

## `"signedOut": true`: photographing a public surface

An inventory with `"signedOut": true` skips the Clerk sign-in, so a page that answers a reader with no session (`/privacy`, `/terms`) is photographed as that reader sees it, with the shell's bare signed-out branch around it. It cannot be combined with `clearAbout` (the run refuses). A `clearAbout` run writes the account's About row (captured first, restored in the `finally`) through `scripts/lib/about-clear.mjs`, which every probe shares: the database is `ABOUT_DB_URL` when set, else `.env`'s `DATABASE_URL`, and the branch it writes on is printed before the first write. When the dev server reads another database than `.env`'s (a scratch branch through `.env.local`), set `ABOUT_DB_URL` to it: `env.mjs` overrides an exported `DATABASE_URL` with `.env`'s. A walk on 2026-10-28 wrote local-dev's About row while its server read a scratch branch; its restore put it back. `legal-pages.json` (signed in) and `legal-pages-signed-out.json` are the pair for the legal pages (launch epic B1); the notice after the article is outside `<main>`, so a sheet cannot reach it and `pnpm probe:fan-content-notice` measures it on both pages.

## Browser state per width, and portalled sheets

A width may carry `"permissions"` (granted on its context), `"userAgent"`, `"channel": "chromium"` (Chromium's new
headless mode, launched for that width alone) and `"notificationPermission"`. The default headless shell reports
`Notification.permission` as `denied` whatever is granted, so a granted notification permission needs the `chromium`
channel; and no headless Chromium ever reports `default`, so `notificationPermission` STAGES that read with an init
script, and a row photographed under it says so in its label. `waitDialog: "<accessible name>"` waits for a sheet
portalled to `<body>` (outside `<main>`) by its name, so the shell's account sheet cannot stand in for it.
`push-settings.json` uses all of them.

## `hold`: photographing a loading state

- **`{ "hold": "<url glob>", "ms": 6000 }`** delays every request matching the glob by `ms`, from that step on, and
  then lets it through. A loading state that Slow 4G alone races past stays up long enough to photograph, and the real
  answer still arrives. `{ "unhold": "<url glob>" }` removes it, as `"throttle": "off"` ends a throttle; both last for
  the page, so the row after a held one takes them away. `sheet-loader-fill.json` holds the stand-ins read (a server
  action POST to the deck's own path).

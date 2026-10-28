# The 99 extension for feature-acceptance

> **In `the-99`:** `scripts/contact-sheet.mjs`, driven by
> `docs/superpowers/inventories/<feature>.json`. A row's `steps` are Playwright
> verbs, so a surface three clicks deep is one row rather than a new script.
> Adding a feature means adding an inventory, never another script. Browser
> scripts there reach the page via `scripts/lib/surface.mjs` — the app shell
> carries the same ARIA selectors as page controls and comes first in document
> order, so an unscoped query measures the shell.

> **In `the-99`:** `pnpm check:shared <inventory>`, reading a `shares` block on
> the same inventory. Absent that block it does nothing, which is the right state
> while the shared component is still being identified.

## Motivating incident (figures moved out of the generic skill)

The feature line behind "Why this exists": five PRs, 79 Copilot rounds, 71
findings, 33 hours of PR lifetime; Hugh then found three gaps in minutes. One
PR's probe absorbed nine review findings and still measured the wrong route; the
import-equality check pointed at a composed primitive gave a false report on
three routes. Under current `pr-review` rules that 79-round line has a plausible
floor near 25 rounds, roughly 20 hours of PR lifetime returned.

## Route inventory example (the-99 routes)

| Route         | 390px | 1300px | Shares with |
| ------------- | ----- | ------ | ----------- |
| `/decks`      | ☐     | ☐      | — (origin)  |
| `/commanders` | ☐     | ☐      | `/decks`    |
| `/discover`   | ☐     | ☐      | `/decks`    |
| `/collection` | ☐     | ☐      | `/decks`    |

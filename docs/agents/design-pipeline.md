# Design pipeline (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **A MULTI-ROUND FEATURE LINE BATCHES ITS ABOUT ENTRIES AT THE END OF THE LAUNCH.** Ruled
  2026-09-21. A line like deck analysis ships five rounds, each a piece of one capability — and
  an `ABOUT_VERSION` bump puts a line on Home's banner in front of every account (with
  `ABOUT_SHEET_ENABLED` on; plan `2026-10-15-about-on-the-banner.md`). For a returning account it
  names the new entries and offers the page; a brand-new account's line introduces the page in one
  sentence instead. With the switch off, a bump redirects every account to `/about` instead.
  Either way, bumping once per round spends that
  attention five times to announce fragments, and the early
  entries describe a surface the reader cannot use yet. One bump at the end describes the thing
  as it works.

  This moves WHEN, never whether. The entries are still owed, Design still draws them on the
  per-entry artboard, and the LINE's close-out does not pass without them. A readiness audit on
  round N of such a line should not report a missing entry as a finding — it should confirm the
  line's plan names the batched task, or the requirement quietly evaporates.

  **Everything below applies unchanged to a feature that ships in one round.**

- **No FEATURE launches without an About entry, in the same round that ships it.** `/about` is the
  app's own reference, and it is only true if a feature cannot land without one. Three places carry
  it, and the third is the one that catches what the first two miss:
  - **Design** — a UI handoff is not complete without its About entry, drawn on the per-entry
    template artboard in `design/design_handoff_the99_about/` (§8 of the R3 canvas; `STATES-about-r3.md`
    §G). Title, route, `opens`, caption, the specimen component and its fixture props, up to four
    key lines, and the phone reduction.
  - **The plan** — the entry and the `ABOUT_VERSION` bump are a named task, listed beside the PR
    boundaries rather than assumed. A feature whose entry is deferred says so there, with a reason.
  - **The close-out** — `feature-acceptance` does not pass until the entry exists on the page and
    the version moved. A copy edit is not a bump; a new entry always is.

  The version is what makes this matter: a bump puts a line on Home's banner in front of every
  account until they open `/about` or press ✕, naming the new entries for a returning account (a
  brand-new account's line introduces the page in one sentence). It reaches Home only (Hugh's Q1,
  2026-10-14): every other page shows nothing. With `ABOUT_SHEET_ENABLED` off, a bump redirects to
  `/about` instead. Either way, a feature with no entry reaches nobody who is not already
  exploring. The `about.test.ts` content hash does the mechanical half — touching the copy forces
  either a deliberate bump or a deliberate re-pin — but nothing can detect an entry that was never
  written, which is why it is a rule and not a check.

  The first case for it is already on record: the post-import summary merged as #639 and #643 on
  2026-09-14/15, in the middle of the About design round, and reached `main` with no entry.

  **A COSMETIC CHANGE IS NOT A FEATURE, and does not owe an entry.** The rule is about a reader
  discovering something the app can now do. Restyling a surface they already know — moving a mark,
  respacing a chip, changing where an edge is drawn — teaches them nothing they need, and an entry
  for it spends a version bump putting the page in front of every account to announce that a
  caption looks different. Where a cosmetic change is worth describing anyway it is an ORDINARY
  EDIT to the entry that already covers that surface, at whatever version comes next, not a new
  entry and not a bump of its own.

  Card captions is the case on record for this half: it moved every modifier off the card art on
  two routes and added no capability, and Hugh ruled on 2026-09-15 that it carries no entry. The
  ruling is his to make — **Design draws the entries and Hugh decides which features owe one**, and
  he may overrule a determination from either Design or this file.

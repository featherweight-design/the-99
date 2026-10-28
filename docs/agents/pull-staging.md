# Pull staging (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- `pnpm pull:staging` copies a player's real decks and collection from **staging** into a local
  database, so a browser probe measures the decks that actually get played rather than a fixture
  built by a script that never buys, never commits and never finishes one. It is the answer to
  the gap that let the card mark ship drawing nothing in the deck's card view: every signed-in
  surface is verified against whatever the fixture account happens to own, and no agent can sign
  in as Hugh.

  **Only the Clerk identity changes.** Every surface reads by `user_id`, so re-owning the rows to
  a local account leaves the data — the long deck names, the contested copies, the decks with
  three Game Changers and the decks with none — exactly as it is on staging.

  ```
  PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging [--dry-run] [--replace]
  ```

  **ONE WAY, AND IT FAILS CLOSED.** Source and target are separate variables
  (`THE_99_NEON_STAGING_DIRECT`, `PULL_TARGET_URL`), the target is never defaulted, and the
  caller must NAME the target with `PULL_TARGET_BRANCH` — checked against the branch the target
  actually reports, before anything is deleted. "Not the source" is not the same as "safe to
  delete from": a pasted or mistyped URL naming some other database passes a difference check
  and destroys what it finds. Naming it means a typo no longer matches and the run stops.

  The same-database guard compares `neon.branch_id`, not the URLs and not
  `system_identifier` — local-dev is a BRANCH of staging's project, so the cluster identifier is
  byte-identical on both and would wave the run through.

  **Whose decks:** named with `PULL_FROM_USER_ID`, or inferred only when the source holds decks
  for exactly one account. "The account with the most decks" is a silent choice on a shared
  database with ties broken by the planner. A named account that owns nothing is refused before
  any target write, because every read would come back empty and the run would delete the
  target's snapshot and report success.

  **REPLACING IS OPT-IN.** A run whose target account already holds decks REFUSES; `--replace`
  is how a caller says they meant it, and the common case — a fresh fixture account — has no
  destructive path at all. That is a scope decision rather than a guard: three review rounds ran
  on this file and every finding was about the delete, so the delete stopped being the default.

  **With `--replace` it REPLACES rather than merges** — a merge leaves decks from an older snapshot standing
  beside the new ones and quietly makes the fixture a thing that never existed on staging. Takes
  `--dry-run`, which prints the counts and writes nothing. It is a SNAPSHOT: re-run it before a
  measurement that matters.

  **Both ends are transactional.** The source reads are one `repeatable read` transaction, or
  they combine instants — a commit landing between the deck read and the version read produces a
  deck list that never existed. The target's delete and every insert are one transaction too, or
  a failing insert leaves the old snapshot deleted and a PREFIX of the new one behind. There is
  no `on conflict do nothing`: a conflict means the target already holds that id, probably under
  another user, and skipping the parent would attach these children to a stranger's deck.

  Inserts are batched 500 rows to a statement, because the first version issued one per row over
  ~6,400 rows and did not finish inside two minutes — the cost here is round trips to a
  serverless Postgres, not work.

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- `pnpm pull:staging` copies a player's real decks and collection from **staging** into a local database: `PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging [--dry-run] [--replace]`. ONE WAY and FAILS CLOSED: the target is never defaulted, `PULL_TARGET_BRANCH` must equal the `neon.branch_id` the target reports, and the source's account is named with `PULL_FROM_USER_ID` or inferred only when the source holds exactly one. A target account already holding decks REFUSES unless `--replace`, which replaces rather than merges. Both ends are transactional. It is a snapshot: re-run it before a measurement that matters.

# Handoff: Admin (switches and model costs), R2

**Build from R2:** `The 99 - Admin (R2).dc.html`, which imports `Admin R2.dc.html`. R1 is kept for reference. The sections below the R2 deltas are R1's, and the deltas win where they disagree.

## R2 deltas (Hugh's R1 notes)
1. **Pinned filters, scrolling tables.** Admin pages are viewport-height. The page head and its filters stay put: search and chips on Switches and Accounts, the month bar on Costs.
   - On Switches and Accounts, the table takes `flex:1; min-height:0; overflow-y:auto`, and its column head is `position: sticky; top: 0`.
   - Detail and cost pages scroll below the head.
2. **Copy.** It's "env var" throughout ("Off: the env var is off.", "Not set falls back to the env var."). The wording is terse because there is one reader.
3. **Notes.** The quoted lines are each override's optional note (`flag_overrides.note`, copied to `admin_events.note`): the reason Hugh gave when he set it. They're now drawn with a `Note:` label. The sample notes were rewritten to read as reasons.
4. **One group per account.** Add a unique constraint on `flag_group_members(user_id)`. Selecting a member who is in another group moves them, as one `member_removed` event plus one `member_added`, and the pending bar names the old group. Group disagreement can no longer happen, so the banners are removed. Locked rule 2's off-wins stays in the resolver as a backstop. Fixture change: `friends` = Theo, Jun, Priya, Sam, Odile; `testers` = Hugh, Mara.
5. **Clerk ids** sit under the email on member rows, account rows and account-override rows. The ids other than Hugh's are illustrative.
6. **Account search** runs the full width at 900.
7. **Month to date** now charts player presses, the series `BUDGET_USD` counts. It draws a solid `$10 plan` line and dashed `$8 · 80%` and `$5 · 50%` alarm lines. Free rewrites are system spend and are left out. The y scale always includes the plan.
8. **Where budgets are set.** Each cap row carries a tag.
   - `IN CODE`: `BUDGET_USD` $10, `OWNER_SHARE_USD` $5, the 50/80% alarms and `HARD_STOP_USD` $20, all in `spend-rule.ts:24-31`, changed by a commit.
   - `SET HERE`: the system ceiling, the Anthropic account cap and elsewhere, stored in the admin settings table (locked rule 11).
   - Moving the in-code four to settings is Hugh's call. Design's recommendation is still to keep them in code (Q5).
9. **By model.** A new block under the trend lists each model's total, share and calls, split into player, free-rewrite and label inks. Pre-parts composite rows are named as composites (locked rule 13). Evals are one unsplit row.

---

# R1

**Status:** R1, for audit. Brief: `docs/superpowers/design-briefs/2026-10-11-admin-ui.md` (main). Rulings 1–6 and locked rules 1–13 are taken as written.
**Canvas:** `The 99 - Admin (R1).dc.html`, A1–A16 at 900 and 390, plus TH (six themes).
**Scene component:** `Admin.dc.html`, props `scene`, `phone`, `theme`.
**Also here:** `STATES-admin.md`, `design-tables/admin.md` (commit to `docs/superpowers/design-tables/admin.md`), `admin · copy strings.ts`.
**No About entry.** The admin is Hugh-only and teaches a player nothing. No `ABOUT_VERSION` bump (brief §The About entry).

## Fixtures used
- **Production frames** (A2–A12): the brief's flags. `OVERVIEW_V2` is on for `testers`. `PROPOSED_CUTS` is off app-wide, with Hugh's account on. `SHOPPING_MARK_BOUGHT` is true while `COLLECTION_EDIT` is false. Three additions are illustrative, so each state gets drawn:
  - `DECK_BENCHMARKS_ENABLED=off` (the kill switch), with a refused account override for Mara.
  - `SWAP_TOOLS` off for `friends` and on for `testers` (the Q1 disagreement).
  - six friends, Mara, Theo, Jun, Priya, Sam and Odile, with Mara in both groups.
  Environment values were not read (encrypted), so every `true`/`false` here is illustrative.
- **Staging October** (A13): the brief's measured figures, unchanged.
- **Production November** (A14): illustrative, with the arithmetic kept. Player presses $7.84 (182 runs, 22 refunded, $0.96). Free rewrites $0.62. Labels $3.12. Evals $6.80. Elsewhere $18.40. Account cap $36.78 of $100.

## Information architecture
1. **Door.** One `Admin` row in the account menu, after About and before Manage account. Both open popover and sheet. It is a `<Link href="/admin">` like About, with the environment named in mono at the row's end. The server computes `isAdmin(userId)` against `ADMIN_USER_IDS` and passes the shell a boolean `adminDoor`. The list never reaches the client (locked rule 10). The rail and the tab bar are unchanged.
2. **Shell.** `/admin` renders inside the existing app shell. A separate shell would be a second chrome to maintain for one reader.
3. **Pages.** One tab strip under the page title: `Switches` (`/admin`), `Groups` (`/admin/groups`), `Accounts` (`/admin/accounts`), `Costs` (`/admin/costs`), `Models` (`/admin/models`). Detail pages are `/admin/switches/[name]`, `/admin/groups/[id]` and `/admin/accounts/[clerkId]`, each with a back link to its tab.
4. **Environment chip.** Every page head carries `staging` (warning dot) or `production` (danger dot), so Hugh always knows which database he is changing (locked rule 12).
5. **Phone.** It carries everything. The phone exists to check a figure or kill a feature away from a desk. Both need the full switch page and the cost tiles. The rest is the same page restacked: tables become rows, and grids become one column.

## Decisions Design made
- **Resolved is a count, not an assumed "most readers".** With 7 accounts, `On`, `Off` or `Mixed` with `N of 7 on` is exact. A "most readers" value would be wrong for `SWAP_TOOLS`, where the reader with no override barely exists.
- **The precedence ladder** leads every switch page: Account, Group, App-wide, Environment, then Needs (the parent) when there is one. Each rung shows what is set there and `decides for N`. The rungs that decide are raised and their labels take the accent. This is the prior art's precedence model, drawn for 7 accounts rather than a targeting UI for thousands.
- **App-wide is Not set / On / Off.** Not set deletes the row (absence is inheritance, locked rule 2). Group and account overrides are On/Off with Clear.
- **The money confirm (A5)** fires only when a change raises the on-count of a model feature (`HELP_ME_CHOOSE`, `OVERVIEW_V2`, `PROPOSED_CUTS`, `TUNING`). It names who, the reservation and credits, What's new, and the 30-second window. Turning something off, or turning on a non-model feature, applies in one press.
- **Group membership is staged (A9).** Selecting a member can change their switches and show them What's new, so the editor says what saving will do before Save. Override changes are a single press, since the switch page already shows their effect.
- **Freshness.** Every page says "takes effect within 30 seconds", never "instantly" (locked rule 7).
- **History** lists admin_events for the subject, newest first, with times in UTC. It says outright that environment changes arrive by deploy and aren't listed.
- **Charts.** Caps are horizontal bars with tick lines. The month to date is a cumulative line, with a dashed pace line to month end and daily bars underneath on their own scale. Player against system is one stacked bar. Reserved against spent is a dashed reservation box with the mean filled in. The trend draws `model_calls` only, so the label backfills don't flatten it. Labels and evals get their own tables.
- **Inks.** Fixed across themes: `--success` for on, `--warning` for a disagreement or an alarm, `--danger` for the kill switch and the hard lines, `--fact` for card labels. `--accent` marks the model tag and the player series.

## Open questions: answers and recommendations
1. **Group disagreement.** *Show the result with its source, and name both groups in the source:* `friends says off, testers says on; off wins`. It is drawn in warning ink, not as an error. It appears wherever it applies: the switch page (A4), the groups page (A8) and the account (A12), each with the account override that would settle it.
2. **Infrastructure switches.** *Listed with the rest, under their own Plumbing head, and app-wide only.* `LIST_CACHE`, `ABOUT_SHEET` and `HOW_IT_WORKS` get no group or account section. Recommend the server action refuse a non-app scope for them too. The schema allows it, but nothing is gained.
3. **Job switches.** *Show them read-only on Models (A15), with where each is read.* Values come from GitHub's repository-variables API, read server-side. If no token is configured, the table shows names and locations without values. Writing them stays out of scope.
4. **Finding an account.** *Names and emails from Clerk, server-side* (`users.getUserList({ query })`), shown beside the id. There is no admin-typed nickname. Clerk already holds the name, and a nickname is one more thing to keep true.
5. **What a cap does.** *`BUDGET_USD`, `OWNER_SHARE_USD`, the alarms and `HARD_STOP_USD` stay code constants, drawn read-only with their file and line.* Those values gate player presses. Changing one should be a reviewed commit, not a field. The settings table holds only the caps outside the code: the account cap, the system ceiling and elsewhere.
6. **The sheet on a flip.** *Warn, and never offer a silent change.* The money confirm names it (A5), and so does the membership pending bar (A9). A silent path would need per-account About suppression, which locked rule 9 doesn't provide. Recommend the non-model on-flip for a group also carry a one-line inline warning under the control (STATES F12).
7. **Concert Crawl.** *Draw the account cap now, with an `elsewhere` figure Hugh types in from Anthropic's console, labelled with who entered it and when.* Elsewhere is everything this ledger can't see: Concert Crawl, and the other environment of this app, since staging and production share the key. Replace it with the Usage and Cost API when that admin key is wired.
8. **Labels in the ledger.** *Read both tables. No backfill.* Labels come from `card_label_batches`, and each table is labelled where it is drawn. A backfill would make one source by writing history, and `model_calls` rows are never deleted, so a mistake would be permanent.
9. **Periods.** *UTC calendar month only, with a daily trend, ‹ › to step months and a one-line comparison to the previous month.* The bill and the spend cap count by month. No week or custom range in R1.

## Engineering notes
- Each switch's description is a placeholder line. The feature owners should confirm them, and they go through /copy-review.
- **Tuning hub tile.** It counts Suggested changes, Mana Balance and Proposed cuts as the hub's tools. Confirm that against `tuningHubEnabled`.
- **Check an account** calls the same resolver as the request path, so it can't drift.
- **Per-run mean and p90 on staging** are all-time figures, as measured in the brief. From the parts table on, they are the month's.
- **Signed-out readers** resolve app-wide, then the environment. The list's footnote says so.
- **Link styles** in the canvas are defined (`a`, `a:hover`) for the editor.

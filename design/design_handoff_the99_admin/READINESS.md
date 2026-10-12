# READINESS: Admin (R2)

**Build from:** `The 99 - Admin (R2).dc.html`, which imports `Admin R2.dc.html`. The R1 files are kept as history only. Brief: `docs/superpowers/design-briefs/2026-10-11-admin-ui.md`. No About entry: the admin is admin-only.

## Files
| File | Role |
|---|---|
| `The 99 - Admin (R2).dc.html` | canvas: A1–A16 at 900 and 390, and TH in six themes |
| `Admin R2.dc.html` | scene component (`scene`, `phone`, `theme`) with every fixture and its resolver |
| `README.md` | IA, decisions, the R2 deltas, answers to the nine open questions |
| `STATES-admin.md` | state rows: D, L, F, G, A, C, M, plus the R2 deltas |
| `design-tables/admin.md` | measurements; commit to `docs/superpowers/design-tables/admin.md` |
| `admin · copy strings.ts` | `adminCopy`, placeholder wording for /copy-review |
| `The 99 - Admin (R1).dc.html`, `Admin.dc.html` | R1, superseded |

## Readiness
| Area | Ready | Note |
|---|---|---|
| Door + 404 (A1, A16) | high | One `<Link>` row in `account-menu.tsx`, gated by a server boolean. The 404 is unchanged |
| Switches list (A2) | high | Reads the registry plus overrides. The resolved count runs the resolver over 7 accounts |
| Switch page (A3–A7) | high | The ladder and Check an account reuse the request-path resolver |
| Model confirm (A5) | medium | Needs the on-count delta computed before the write (G3) |
| Groups (A8, A9) | medium | One group per account needs a schema constraint and move semantics (G1) |
| Accounts (A10–A12) | medium | Needs the Clerk lookup (G4). Check the Tuning hub tile (G6) |
| Costs (A13, A14) | medium | Needs the parts table for effort and the by-model split (G5). Caps settings table (G7) |
| Models (A15) | medium | Job switch values need a GitHub token (G8) |
| Copy | low | All placeholders until /copy-review |

## Gap report
- **G1 · One group per account.** A unique constraint on `flag_group_members(user_id)`. Selecting a member who belongs to another group moves them on Save, logged as `member_removed` then `member_added` in one transaction. The resolver keeps locked rule 2's off-wins as a backstop.
- **G2 · Viewport layout.** Admin pages are columns that fill `ShellMain` with `flex:1; min-height:0` (audit finding 14 replaces `100dvh`). The pinned bar and table rules are in the design table's R2 deltas. At 390 the app tab bar stays below the scroll region.
- **G3 · Money confirm trigger.** Fires when a write raises the on-count of a switch tagged as a model feature (`HELP_ME_CHOOSE`, `OVERVIEW_V2`, `PROPOSED_CUTS`, `TUNING`). Compute the count with the resolver over all accounts, before and after. **Superseded by audit finding 2:** `ANALYSIS_TAB` is a model feature too (it gates the Overview), and the trigger is a rise in accounts for whom any model-spending capability resolves on, evaluated through the flag functions. The cost line reads the feature's reservation constant and its priced mean, if it has one.
- **G4 · Clerk lookup.** `users.getUserList({ query })` runs server-side. If it fails, ids show with `Names didn’t load from Clerk.` (STATES A3). Nothing from Clerk is stored.
- **G5 · By model.** From the parts table on, sum `model_call_parts` by model and origin. Earlier rows are shown under their composite model name and never split (locked rule 13). Card labels come from `card_label_batches` and from `model_calls` rows with `feature = 'labels'` (the manual collector), summed; label and prose runs happen on staging only, so production draws neither (audit findings 3, 8). Evals stay one unsplit row. In A13 the per-day player series is illustrative; the brief gives per-day totals only.
- **G6 · Tuning hub tile.** It assumes the hub's tools are Suggested changes, Mana Balance and Proposed cuts. Confirm that against `tuningHubEnabled`.
- **G7 · Caps in settings.** Only the system ceiling, the Anthropic account cap and elsewhere (amount, as-of date, who entered it) live in the settings table. `BUDGET_USD`, `OWNER_SHARE_USD`, the alarms and `HARD_STOP_USD` stay as code constants, shown as `in code`.
- **G8 · Job switches.** Read from the GitHub repository variables API, server-side, read-only. With no token, the value column reads `—` (STATES M2).
- **G9 · Switch descriptions.** The one-line descriptions are placeholders. Feature owners should confirm them before /copy-review.
- **G10 · Fixtures.** Environment values, the six friends, their Clerk ids, `DECK_BENCHMARKS=off`, the `SWAP_TOOLS` group overrides and the November month are all illustrative. Staging's October cost figures are as measured in the brief.

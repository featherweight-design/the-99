# Plan: admin PR 9, Groups and Accounts (lane 04, 2026-10-13)

Source: `boards/lane-handoffs/admin-plan-2026-10-12.md` PR 9 (Hugh approved), `design/design_handoff_the99_admin/`
(STATES G1–G7 and A1–A7; design table, Groups and Accounts; copy keys `groups` and `accounts`), and the group
allowance plan (`plan-group-allowance-2026-10-13.md`, PR B). It builds on #1657/#1658/#1659 (Switches),
#1664 (Costs fixes) and #1665 (allowance data).

## Split (no stacking; each under about 20 files)

**9a: Groups** (about 16 files)

- **Routes:**
  - `/admin/groups`: the cards (G1), or `No groups yet.` with `New group` (G5).
  - `/admin/groups/new`: G3.
  - `/admin/groups/[id]`: G2 and G4.
- **The tab strip** gains Groups, between Switches and Accounts.
- **The editor:**
  - Fields: Name (lowercase, unique, required), Description, and the **Daily credits** field, which is new.
  - Daily credits is optional, 1 to 1000. Empty means the default. Its helper line says this group's members get that many credits in a rolling 24 hours.
  - The member multi-select draws from the account universe, showing name, email, Clerk id, and the current group (`moves from friends`).
  - A pending bar holds Save and Undo, and names what an account gains or loses, through `riseBetween` and the switch explanations, without gendered pronouns.
  - The page also shows the overrides the group carries, and its history.
- **Writes:** one `requireAdmin()` action per form, and each runs one transaction under the `admin_switches` advisory lock, because membership moves the switch rise.
  - Create writes `group_created`.
  - A rename writes `group_renamed`. A description change writes `group_described`. An allowance change writes `group_allowance_set`, a new `admin_events` kind added by migration.
  - Adding a member writes `member_added`. Moving one is `member_removed` from the old group, then `member_added` (G7).
  - A save that raises model access for a member goes through the same confirm as 8c.
  - The memo clears after the commit.
- **Probe:** `probe:admin-groups` on a scratch branch.
- **Must-not:** an account in two groups. The primary key already forbids it.
- **PR body line (orchestrator's ask):** an account is in at most one group, so placing Hugh in `friends` gives him friends' allowance (5), not his own.

**9b: Accounts** (about 14 files)

- **Routes:** `/admin/accounts` (A1–A3: search by name, email or id prefix; Clerk down) and `/admin/accounts/[clerkId]` (A4–A7).
- **The detail page:**
  - Tiles: credits now from `readAllowance`, spend this month against the owner share, presses, and Tuning hub.
  - The group, with `Change group`.
  - The account's switches in three groups: set by an override, off by a rule, from the environment. Sources come from `explainAccount`.
  - Spend by feature, or `No presses in ‹Month›.`
- No writes beyond `Change group`, which reuses 9a's move action.

**9c: credits copy per reader** (about 6 files). This must ship before `MODEL_DAILY_ALLOWANCE=1` is set.

- How it works (`copy/how-it-works.ts`) and the About credits entry stop stating "five" and read the reader's own `dailyLimitFor`.
- The About fixture still draws the default.
- The wording goes through /copy-review. The `about.test.ts` hash is re-pinned. There is no `ABOUT_VERSION` bump.

## About entry

None. The admin is admin-only, and nothing in 9a or 9b is a player feature. 9c edits an existing entry's
wording, which is a copy edit, not a bump.

## Open points (none blocking)

The handoff's `pendingMove` copy genders players ("He gains"). It is rebuilt with the account's name or
"they", and the wording goes to /copy-review.

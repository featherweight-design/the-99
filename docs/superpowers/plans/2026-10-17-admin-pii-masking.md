# Admin PII Masking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` names every person masked (`Colin R.`, `c•••@g•••.com`), computed on the server, with a logged per-account Show that re-masks after 5 minutes or on leaving the view, and an exact-email lookup that reveals nothing else.

**Architecture:** Masking happens at the one place Clerk's user records enter the app, `listAccounts` in `src/lib/admin/accounts.ts`: it returns masked accounts only, so every loader, rule and page downstream already receives masked values and no page payload can carry a raw one. The raw name and email leave the server in exactly one answer, `revealAccount`, which writes its `admin_events` row before it returns anything. The exact-email lookup is a second server action that answers only an account id or a miss.

**Tech Stack:** Next.js 16 server actions, Drizzle on Neon (one migration), `@clerk/nextjs/server` backend client, Vitest, Playwright (`scripts/contact-sheet.mjs`, one probe).

**Spec:** `docs/superpowers/design-briefs/2026-10-17-admin-pii-masking.md` (rulings 1 to 6) and `design/design_handoff_the99_admin/` R3: `README-R3.md` (D1 to D14), `STATES-admin-R3.md` (A1 to A10, B1, B2, C1 to C5, must-nots), `READINESS-R3.md` (Yellow; Y1, Y2, G1 to G7), `design-tables/admin-r3.md`, `admin-r3 · copy strings.ts`. Boards: `R3/AdminR3.dc.html` scenes.

## Global Constraints

- Masked name (D1): first name and last initial (`Colin R.`); no Clerk first name: the Clerk username as is (`chrisplays`); neither: `Account ·<last four of the Clerk id>`. No email fallback (G6).
- Masked email (D2): mailbox's first letter, `•••`, `@`, the domain's first label's first letter, `•••`, then the domain from its LAST dot (`c•••@g•••.com`, `m•••@p•••.me`, `a•••@m•••.uk` for `a@mail.co.uk`).
- The Clerk id is never DRAWN on a masked row, head, choice or member row (D3); it stays in URLs and as the actions' key (G1), and is drawn only under a revealed account.
- Avatars (D4): initials from the masked name; the diamond mark for an account with no name and for the owner row.
- Show lives on accounts-list rows and the account head only; none on the owner row (D5). No bulk reveal.
- Revealed state (D6): full name, full email, Clerk id, `Shown and logged · hides at HH:MM UTC`; only that account's own fields change.
- Re-mask (D7): on leaving the view (unmount: navigation, reload, tab close), 5 minutes after the Show, or at once on Hide; quiet, no toast. A list reveal does not carry to the account page.
- Every Show writes one `admin_events` row of kind `account_revealed` (actor, `user_id` = the revealed account, `at`) BEFORE any raw value is returned; a failed write returns `failed` and nothing is shown (must-not, A6).
- Exact-email lookup (D10 to D12): the whole address, trimmed and case-folded; a hit answers one account, a miss answers nothing else; a partial address never matches.
- Waiting-invite recipient emails are masked always and never revealable (D9, G2).
- Failures (D13): the shared `ToastFrame` (`src/components/collection/edit-toast.tsx`), centre placement, `role="alert"`, action `Try again`.
- Every admin action's first statement is `requireAdmin()` (`src/app/admin/actions.test.ts` checks it).
- Copy: new strings from `admin-r3 · copy strings.ts` land in `src/lib/copy/admin.ts` and go through `/copy-review` (US English, no em dashes). No About entry (brief).
- Measure on staging, mutate on local-dev or a scratch branch. Never write to staging or production.

## Review Focus

1. **Names that do not split cleanly.** One-word Clerk names (`Cher`), a last name only, multi-word last names (`de la Cruz`), non-Latin and accented letters (`Ñúñez` gives `Ñ.`): no last name ever appears whole, and a last name with no first name falls to the username, else `Account ·tail`. Tests in Task 1.
2. **Emails that do not split cleanly.** Single-letter mailbox, plus-addressing (`a+x@`), multi-label domains, a domain with no dot, upper case: D2's output never contains more than two letters of the address before the last dot. Tests in Task 1.
3. **A partial or differently-cased email.** `Colin@Gmail.com ` hits; `colin@gmail` and `olin@gmail.com` miss; Clerk's own filter is not trusted alone, the action re-checks equality on every returned address. Tests in Task 9.
4. **A reveal that lands after the reader left.** The Show resolves after navigation or after Hide: nothing is set, no timer survives the unmount. Tests in Task 7.
5. **Clerk down.** `listAccounts` falls back to stored ids: every name reads `Account ·tail`, emails are null, a Show answers `failed` with no `admin_events` row, a lookup answers `failed`. Tests in Tasks 2, 6, 9.

---

## PR boundaries

| PR | Title | Tasks | Est. files / lines |
|---|---|---|---|
| 1 | Masked at the source | 1 to 4 | ~16 / ~650 |
| 2 | Masked surfaces drawn | 5 | ~14 / ~500 |
| 3 | Show, the reveal log and its re-mask | 6 to 8 | ~14 / ~750 |
| 4 | Exact-email lookup | 9 to 10 | ~7 / ~400 |

Each PR merges before the next is cut from `main` (no stacking). PR 1 alone already stops every raw name and email reaching a page payload; PR 2 is how it looks; PR 3 and 4 give back the access ruling 6 needs.

### Route × viewport inventory

`docs/superpowers/inventories/admin-masking.json`, one row per cell, photographed on a scratch branch with `ADMIN_USER_IDS` naming the signed-in account. Ticked per PR against the running app.

| Route | State | 390 | 1300 | PR |
|---|---|---|---|---|
| `/admin/accounts` | A1 masked list | ☐ | ☐ | 1, 2 |
| `/admin/accounts` | A7 name filter, A8 `@` typed | ☐ | ☐ | 4 |
| `/admin/accounts` | A2 one row revealed | ☐ | ☐ | 3 |
| `/admin/accounts` | A3 hit, A4 miss, A5 lookup failed | ☐ | ☐ | 4 |
| `/admin/accounts` | A6 reveal failed | ☐ | ☐ | 3 |
| `/admin/accounts/[clerkId]` | B1 masked head, Invites, History | ☐ | ☐ | 1, 2 |
| `/admin/accounts/[clerkId]` | B2 revealed, History line | ☐ | ☐ | 3 |
| `/admin/invites` | C1 tree masked | ☐ | ☐ | 1, 2 |
| `/admin/groups` | Y1 member line masked | ☐ | ☐ | 1 |
| `/admin/groups/[id]` | C2 members, pending, history | ☐ | ☐ | 1, 2 |
| `/admin/switches/[name]` | C3 overrides, picker, check, Y2 result, history | ☐ | ☐ | 1, 2 |
| `/admin/costs` | C5 per account, cap set by | ☐ | ☐ | 2 |

The existing `admin.json` and `invites-admin.json` rows keep running; PR 2 updates any row whose `wait` selector named an email.

---

## PR 1 · Masked at the source

### Task 1: The masking rule

**Files:**
- Create: `src/lib/admin/mask.ts`, `src/lib/admin/mask.test.ts`

**Interfaces:**
- Produces: `maskName(u: { id: string; firstName: string | null; lastName: string | null; username: string | null }): { name: string; named: boolean }`, `maskEmail(email: string): string`, `maskInitials(name: string, named: boolean): string | null` (null means draw the diamond).

- [ ] **Step 1: Write the failing tests** in `mask.test.ts`:
  - `maskName({ firstName: "Colin", lastName: "Reyes" })` → `{ name: "Colin R.", named: true }`; `"Cher", null` → `"Cher"`; `"José", "Ñúñez"` → `"José Ñ."`; `"Ana", "de la Cruz"` → `"Ana D."`; `null, "Reyes", username "chrisplays"` → `"chrisplays"`; all null with id `user_2abc9xQe` → `{ name: "Account ·9xQe", named: false }`; whitespace-only names count as null.
  - `maskEmail`: `colin@gmail.com` → `c•••@g•••.com`; `m@p.me` → `m•••@p•••.me`; `a+x@mail.co.uk` → `a•••@m•••.uk`; `Colin@Gmail.COM` → `c•••@g•••.com`; `root@localhost` → `r•••@l•••`.
  - `maskInitials("Colin R.", true)` → `"CR"`; `("chrisplays", true)` → `"CH"`; `("Account ·9xQe", false)` → `null`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/admin/mask.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement the three functions** in `mask.ts`. Case-fold the email before masking; the last initial is the first grapheme of the last name's first word, upper-cased with `toLocaleUpperCase("en-US")`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `Admin masking: the masked name, email and initials (D1, D2, D4)`.

### Task 2: `listAccounts` returns masked accounts only

**Files:**
- Modify: `src/lib/admin/accounts.ts`, `src/lib/admin/accounts.test.ts`, `src/lib/admin/names.ts`
- Create: `src/lib/admin/clerk-pii.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `type Account = { id: string; name: string; email: string | null; named: boolean }` where `name` and `email` are MASKED; `accountName(a) => a.name`. Server-only raw readers, used by PR 3 and 4 only: `readIdentity(id: string, deps?): Promise<{ id: string; fullName: string | null; email: string | null } | null>` and `findAccountIdByEmail(email: string, deps?): Promise<string | null>`, both in `accounts.ts`, both behind `withDeadline`.

- [ ] **Step 1: Write the failing tests.** In `accounts.test.ts`: a stub Clerk user `{ firstName: "Colin", lastName: "Reyes", username: null, primaryEmailAddress: "colin@gmail.com" }` lists as `{ name: "Colin R.", email: "c•••@g•••.com", named: true }`, and `JSON.stringify(result)` contains neither `Reyes` nor `colin@gmail.com`; Clerk down lists `{ name: "Account ·<tail>", email: null, named: false }`. In `clerk-pii.test.ts`: read every `.ts`/`.tsx` under `src/` except `accounts.ts` and tests, and fail on any of `primaryEmailAddress`, `emailAddresses`, `.firstName`, `.lastName`, `.fullName` together with an import from `@clerk/nextjs/server` or of `ClerkUser` (the guard that keeps raw Clerk PII to one module; `src/lib/invites/clerk.ts` is listed with its reason: it handles invitations, not users).
- [ ] **Step 2: Run** both. Expected: FAIL.
- [ ] **Step 3: Implement.** Map each Clerk user through `maskName`/`maskEmail` inside `listAccounts`; `orderAccounts` sorts on the masked name. Add `readIdentity` (`users.getUser(id)`) and `findAccountIdByEmail` (`users.getUserList({ emailAddress: [normalized], limit: 2 })`, then keep only a user one of whose `emailAddresses` equals the normalized address; two or more matches answer null and log). `accountName` returns `a.name`.
- [ ] **Step 4: Run** `pnpm vitest run src/lib/admin` and fix every test that pinned a raw name or email to its masked form. Expected: PASS.
- [ ] **Step 5: Commit** `Admin masking: listAccounts masks on the server; raw Clerk PII stays in one module`.

### Task 3: Rules and searches read masked names only

**Files:**
- Modify: `src/lib/admin/account-page-rule.ts` (`matchesAccount`), `invite-tree-rule.ts` + `invite-tree.ts` (drop `searchable`'s raw universe: search the tree's own masked nodes), `groups-rule.ts` (member search key), `switch-page-rule.ts` (people search key; override `sub` = masked email, else nothing), `rise-confirm.ts` (`names` = `accountName`), `invites-rule.ts` (waiting `email` masked with `maskEmail`), each `.test.ts`.

**Interfaces:**
- Consumes: Task 2's `Account`.
- Produces: `matchesAccount(row, q)` matching the masked name only, case-insensitive substring; no email or id match (D10, D14).

- [ ] **Step 1: Write the failing tests:** `matchesAccount` on a row named `Colin R.` matches `col` and `r.`, and does NOT match `gmail`, `c•••` or a prefix of the id; the group editor and override picker keys likewise; a waiting invite's email reads `n•••@g•••.com`; the switch override row's `sub` is the masked email; `ConfirmPreview.names` never falls back to an email or id.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/admin`. Expected: FAIL on the new cases.
- [ ] **Step 3: Implement** the key changes in each rule.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Admin masking: searches and history lines read masked names (D14, Y1, Y2, G2)`.

### Task 4: Copy and the PR 1 proof

**Files:**
- Modify: `src/lib/copy/admin.ts` (+ test): `accounts.sub`, `accounts.search` placeholder (no-`@` part only until PR 4), `findByName`, `noName` from `admin-r3 · copy strings.ts`, through `/copy-review`.
- Create: `scripts/probe-admin-pii.mjs` + `pnpm probe:admin-pii`.

- [ ] **Step 1:** Run `/copy-review` on the four strings; write the reviewed text.
- [ ] **Step 2: Write the probe.** Signed in through `scripts/lib/surface.mjs` as an `ADMIN_USER_IDS` account against a local `next start`, it reads, from Clerk's dev instance in the script, every user's raw first name, last name and primary email, then loads each route in the inventory, including the account page head and every picker (the group editor's members, the override picker, Check an account) with each one opened, and fails if the HTML or any RSC flight response body contains one (case-insensitive, names of 3+ letters). Read-only.
- [ ] **Step 3: Run** `pnpm probe:admin-pii` on local-dev before Task 2 (expected: FAIL, emails found) and after (expected: PASS). Put both outputs in the PR body.
- [ ] **Step 4:** Contact sheet rows for PR 1's cells; `pnpm typecheck && pnpm lint && pnpm test`, stub build.
- [ ] **Step 5: Commit** `Admin masking: copy and probe:admin-pii`.

---

## PR 2 · Masked surfaces drawn

### Task 5: Every surface per the R3 design table

**Files:**
- Modify: `src/components/admin/accounts-list.tsx` (no id line; column head `2.1fr 0.6fr 78 104 0.7fr 52`; phone: spend to the end of the meta line), `account-page.tsx` (head: no id), `avatar` use in both (diamond when `maskInitials` is null and for the owner row), `invite-tree.tsx` (diamond; `aria-label` `Open <masked name>`; placeholder `findByName`), `group-editor.tsx` + `override-picker.tsx` (second line = masked email; no id; placeholder `findByName`), `switch-page.tsx`, `check-account.tsx`, `src/lib/admin/costs.ts` (`loadCosts` takes the masked universe: `listAccounts` once), `costs-detail.tsx:286-288` and `costs-view.tsx:315` (masked name, `You` for the viewer), each component test, `docs/superpowers/inventories/admin-masking.json` (new) and any `admin.json` row whose selector named an email.

- [ ] **Step 1: Write the failing component tests:** no element on A1/B1/C1 to C3 renders a Clerk id; the owner row and a `named: false` account draw the diamond (`data-mark="diamond"`); costs rows read `Colin R.` for a known id and the raw id only for an id outside the universe.
- [ ] **Step 2: Run** `pnpm vitest run src/components/admin src/lib/admin`. Expected: FAIL.
- [ ] **Step 3: Implement** against `design-tables/admin-r3.md` (properties) and the boards A1, B1, C1 to C3.
- [ ] **Step 4: Run.** Expected: PASS. Then `design-review` against the R3 boards and the contact sheet at 390 and 1300 for PR 2's cells.
- [ ] **Step 5: Commit** `Admin masking: the masked rows, heads, pickers and costs as R3 draws them`.

---

## PR 3 · Show, the reveal log and its re-mask

### Task 6: `account_revealed` and `revealAccount`

**Files:**
- Create: `drizzle/0148_admin_reveal_event.sql` (number at generation time), `src/lib/admin/reveal.ts` + test
- Modify: `src/db/schema.ts` (both CHECKs gain `account_revealed`, fields: `user_id is not null`), `src/app/admin/accounts/actions.ts` (+ test)

**Interfaces:**
- Consumes: Task 2's `readIdentity`.
- Produces: `revealAccountIn(actorId: string, accountId: string, deps): Promise<RevealResult>` in `reveal.ts`; action `revealAccount(accountId: string): Promise<RevealResult>`; `type RevealResult = { ok: true; name: string | null; email: string | null; id: string; hidesAt: string } | { ok: false; error: "invalid" | "failed" }`. `hidesAt` = the insert's `at` + 5 minutes, ISO.

- [ ] **Step 1: Write the failing tests:** a non-string or empty id → `invalid`, no Clerk call, no insert; Clerk answers null or throws → `failed`, no insert; the insert throws → `failed` and the result carries no name or email; success inserts exactly one row `{ kind: "account_revealed", actor_id, user_id }` and only then returns the raw values; `actions.test.ts` still finds `requireAdmin()` first.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement:** read the identity first (a Clerk failure shows nothing and logs nothing), insert the event, return. The migration drops and re-adds `admin_events_kind_check` and `admin_events_fields_check` with the new kind (template `drizzle/0143_invite_admin_events.sql`); `pnpm db:generate`, then apply on local-dev only.
- [ ] **Step 4: Run** the tests and `pnpm db:migrate` on local-dev. Expected: PASS.
- [ ] **Step 5: Commit** `Admin masking: revealAccount writes account_revealed before it answers`.

### Task 7: Show and Hide, and the re-mask

**Files:**
- Create: `src/components/admin/use-reveal.ts` + test, `src/components/admin/show-button.tsx`
- Modify: `accounts-list.tsx` (Show beside the row's link, never inside it; revealed row: accent inset ring, `--surface-raised`, full name, email, id, shown line, `Hide`), `account-page.tsx` (head Show/Hide; phone under the head, 44px), `invites-section.tsx` (set-invites help names the full name only while revealed), `src/lib/copy/admin.ts` (`reveal.*`, via `/copy-review`), `admin-masking.json` rows A2, A6, B2.

**Interfaces:**
- Consumes: Task 6's `revealAccount`.
- Produces: `useReveal(): { revealed: Map<string, Revealed>; show(id: string, masked: string): Promise<void>; hide(id: string): void }`, `type Revealed = { name: string | null; email: string | null; id: string; hidesAt: Date }`, holding state in the component that mounts it (one per view, so the list and the account page never share one).

- [ ] **Step 1: Write the failing tests** (fake timers): `show` sets the entry from the action's answer; 5 minutes after `hidesAt` is reached the entry is gone with no toast; `hide` removes it at once; unmount clears every timer and a `show` resolving after unmount sets nothing; a `failed` answer sets nothing and raises the toast `Couldn’t show <masked>. Nothing was shown.` with `Try again` that calls `show` again; a pending `show` holds the button's pressed state (`aria-pressed`/`data-pending`) and the row stays masked.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the hook (a `setTimeout` to `hidesAt`, cleared on hide and unmount; a mounted ref guards late answers) and the button; wire both surfaces per boards A2, B2 and the design table rows.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Admin masking: Show and Hide on the list and the account head, re-masked at 5 minutes or on leaving`.

### Task 8: The reveal in the account page's History, and the PR 3 proof

**Files:**
- Modify: `src/lib/invites/admin.ts` or `src/lib/admin/invites.ts` (the history query's `kind in (...)` gains `account_revealed` for `user_id` = the account), `invites-rule.ts` (line `<actor> showed <masked name>’s name and email`, `You` for the viewer; `reveal: true` for the diamond), `invites-section.tsx` (6px accent diamond before a reveal line), tests.

- [ ] **Step 1: Write the failing tests:** an `account_revealed` row renders the D8 line with the masked name, the viewer as `You`, newest first among the invite lines; the switch and group histories still ignore it (their queries are scoped by switch and group).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `pnpm probe:admin-pii` (still PASS: the payload before a Show is masked), and a probe step that presses Show on one row and finds that account's raw email exactly once in the action's response and nowhere in any other row. Contact sheet A2, A6, B2; `design-review` against A2, A6, B1, B2.
- [ ] **Step 5: Commit** `Admin masking: reveal lines in the account's History (D8)`.

---

## PR 4 · Exact-email lookup

### Task 9: `lookUpAccount`

**Files:**
- Create: `src/lib/admin/lookup.ts` + test
- Modify: `src/app/admin/accounts/actions.ts` (+ test)

**Interfaces:**
- Consumes: Task 2's `findAccountIdByEmail`.
- Produces: action `lookUpAccount(email: string): Promise<LookUpResult>`, `type LookUpResult = { kind: "hit"; id: string } | { kind: "miss" } | { kind: "failed" }`; `normalizeEmail(raw: string): string | null` (trim, case-fold, exactly one `@` with text on both sides, else null).

- [ ] **Step 1: Write the failing tests:** `" Colin@Gmail.com "` → hit; `colin@gmail`, `olin@gmail.com`, `@gmail.com`, `colin` → miss with no Clerk call for the last three (null from `normalizeEmail`); Clerk returning a user whose addresses do not equal the input exactly → miss; two matches → miss; Clerk throwing → `failed`; the result never carries a name or email.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** No `admin_events` row: a hit reveals nothing beyond what was typed (D11).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Admin masking: exact-email lookup answers an id or nothing`.

### Task 10: The one search field

**Files:**
- Modify: `src/components/admin/accounts-list.tsx`, `src/lib/copy/admin.ts` (`enterToLookUp`, `hit`, `miss`, `lookUpFailed`, full `search` placeholder; `/copy-review`), tests, `admin-masking.json` rows A3 to A5, A7, A8.

- [ ] **Step 1: Write the failing tests:** without `@` the field filters masked names as you type (A7, `No account matches <q>.`); with `@` the list stays whole and the help reads `Press Enter to look up this exact email.` (A8); Enter calls `lookUpAccount` once; a hit shows `One account holds this email.` and only that row, masked, with its Show (A3); a miss shows `No account holds this email.`, no rows and no column head (A4); `failed` keeps the field and the full list and raises the toast with `Try again` (A5); the ✕ clears the field and brings the list back.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** per boards A3 to A5 (phone: the keyboard's search key submits: `enterKeyHint="search"`, `type="search"`).
- [ ] **Step 4: Run.** Expected: PASS. Contact sheet A3 to A5, A7, A8; `design-review` against A3 to A5; `feature-acceptance` close-out walk of the whole inventory.
- [ ] **Step 5: Commit** `Admin masking: one field for a name or a whole email (D10 to D13)`.

---

## Rulings (orchestrator, 2026-10-17)

- **Owed: ruling 5's privacy-page line** ("admins can see account emails for support and access, and each view is logged"). No privacy page exists in `src/app`; the line ships with that page, which is on Hugh's decisions list (it is also needed for payments and the FCP notice). Not built by this plan.
- **The account URL keeps the Clerk id** (G1): rulings 1 and 4 cover names and emails, and the id identifies no one outside Clerk.

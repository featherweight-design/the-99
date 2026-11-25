# On-page copy editor

An admin on staging turns on an edit mode, clicks any piece of text in the app, rewrites it, batches the edits and presses **Open pull request**. The result is the same PR the copy sheet makes (`copy:import` is the only commit path; see [copy-sheet.md](copy-sheet.md)). Design: `design/design_handoff_the99_copy_editor/` (its READINESS verdict was Yellow; the nine gaps were resolved from the nearest drawn pattern and are 🔸 rows in each PR's design-review table).

## The gate (server-side, every route and the door)

`src/lib/copy-editor/gate.ts`, `copyEditorOpen(userId)`. Three legs, all required, any one failing is a bare 404:

1. the user is on the admin allowlist (`isAdmin`),
2. `ADMIN_ENV_LABEL` reads `staging`,
3. `VERCEL_PROJECT_PRODUCTION_URL === "staging.the-99.dev"` (`staging-host.ts`).

Leg 3 is an allowlist, never "not production": staging's own deployment reports `VERCEL_ENV=production`, so a not-production test shuts the editor on staging itself (shipped that way once, fixed in #3313). The variable is a Vercel system variable per project (its shortest production domain, only while system variables are exposed). A shorter alias on the staging project, or system variables turned off, shuts the editor silently; change `STAGING_HOST` to match. A local dev server sets it by hand. No feature switch: the gate is the switch.

## Data

- Rows come from `pnpm copy:rows` (`scripts/copy-editor-rows.mts`), run before `next build` and `predev`, written to `.generated/copy-rows.json` and served by `GET /api/copy-edit/rows`. The build step skips only when the deployment is production AND not the staging project.
- The browser therefore knows the text as deployed, not main. Each edit carries `from` (the deployed text); the submit route compares it with main and answers `409 {error:"stale", keys}` for lines that changed since.
- **Matching** (`src/lib/copy-editor/match.ts`): exact text first, then templates. A template needs `MIN_LITERAL` (3) LETTERS of fixed text, so a template whose only words are one or two letters (`{h1} of {h2}`, `in {deck}`) is not matched either, a known cost: that rendered line gets no outline (its row is still editable in the copy sheet), and `{h1} · {h2}` or `{question}. {date}, {tail}.` never match page text (150 rows were that shape; they claimed any line with a dot or comma). The scan (`scan.ts`) tries the parts of an element that mixes text with child elements (a bold lead plus a body) before accepting a whole-text template fit, so each part keeps its own row. `node scripts/probe-copy-editor-steps.mjs` presses the landing's step parts (injected into `/decks`: the landing is signed-out, the editor admin-only) and reads the key the tag shows.
- Data text (card names, theme names) is not copy and gets no marker. Hidden text (aria, alt, placeholders) is out of the UI.
- Edits live in `localStorage` (`the99.copyEdits`); the submission record in `the99.copySubmitted` so a reload keeps following the PR.

## Rules: one set

Client checks call `problems()`, `wordCap`, `wordCount` from `scripts/lib/copy-sheet/validate.mts` (`src/lib/copy-editor/edits.ts`). There is no second rule set. The route re-validates, the workflow re-validates, and `copy:import` validates again.

## Submit path

`POST /api/copy-edit/submit` (gate, `readCapped`, `parseSubmission`, stale check, `problems()`, rate limit `copy-edit-submit`, then dispatch). Caps: `MAX_EDITS` 40, `MAX_TEXT` 600 per text, `MAX_EDITS_CHARS` 60,000. The route never creates a branch or writes content; it names a branch (`copy-edit-YYYYMMDD-HHMMSS-xxxx`, hex suffix) and dispatches `.github/workflows/copy-edit.yml` with it and the edits JSON. The workflow builds the sheet (`scripts/copy-edit-csv.mts`, which checks again), runs `pnpm copy:import`, and opens the PR with CI.

Tokens (names only; Hugh sets values):

- `COPY_EDIT_DISPATCH_TOKEN`: fine-grained PAT, Actions write and Pull requests read, staging Vercel project only, Production scope, Sensitive. Starts workflows and reads PR state, nothing else.
- `COPY_EDIT_PR_TOKEN`: Actions repo secret, Contents and Pull requests write. Reaches one workflow step (the import). A PR opened with `GITHUB_TOKEN` would not start CI.

## Status and the tray

`GET /api/copy-edit/status?branch=` finds the PR for the branch (`open` with link), else the workflow run by display title `Copy edit <branch>` (the workflow's `run-name`; without it no run could be found): queued or running is `pending`, a failed run is `failed` (the tray says the edits were not sent, restores them and offers Try again), no run or a success with no PR yet is `none`, a read error is `unknown`. The tray (`tray.tsx`, `use-submission.ts`) polls every 4 s (30 s once a PR is open) and gives up after 15 minutes; `lagging` shows after 3.

## Proof

`node scripts/probe-copy-editor.mjs` (needs a dev server with `ADMIN_USER_IDS`, `ADMIN_ENV_LABEL=staging`, `VERCEL_PROJECT_PRODUCTION_URL=staging.the-99.dev`): door, outlines, targeting, editor, tray (submit and status mocked), and `PROBE_GATE=closed` with one leg missing at a time. Live dispatch proof: the workflow half was run on main with `gh workflow run copy-edit.yml` (opened a PR with CI; closed unmerged, branch deleted). **The route-side dispatch (the submit route calling GitHub with `COPY_EDIT_DISPATCH_TOKEN`) is proven only once an admin presses Open pull request on staging and a PR appears.** That needs a signed-in admin session, and there is no sanctioned headless sign-in to staging, so it waits on Hugh's one real press. Until then it is unproven end to end.

## Files

`src/lib/copy-editor/` (gate, rows, match, edits, key-label, github, submit), `src/components/copy-editor/` (provider, overlay, scan, editor, fill-field, tray, use-submission), `src/app/api/copy-edit/{rows,submit,status}/`, `src/lib/copy/copy-editor.ts` (the editor's own copy), `scripts/copy-editor-rows.mts`, `scripts/copy-edit-csv.mts`, `.github/workflows/copy-edit.yml`.

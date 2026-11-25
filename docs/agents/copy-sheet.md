# Copy sheet

A non-engineer edits the app's wording in Google Sheets or Excel; an import turns the changed rows into a PR. Every user-facing string lives in `src/lib/copy/`, so the sheet is a table over those files.

## Run it

- `pnpm copy:sheet [out.csv]` writes the sheet to `~/Downloads/copy-sheet-<date>.csv` (a path inside the repo is refused: the sheet is working material and is never committed). Open it in Sheets or Excel and edit only the **new text** column. Leave a cell blank to leave a string alone.
- `pnpm copy:import <edited.csv>` can run from any checkout, branch or dirty tree. It makes its own worktree and branch (`copy-sheet-<utc date-time>`) from `origin/main`, applies the changed rows, runs typecheck and lint there, pushes, opens the PR with the old -> new list, and removes the worktree. It needs no published-sheet URL and no Sheets API key. `--dry` validates and prints the list without pushing; `--no-pr` stops after the commit; `--local [--root <dir>]` applies in place to a tree with no git (tests, a hand edit).
- **The on-page copy editor submits through the same import** (admin, staging only). `POST /api/copy-edit/submit` checks the edits with `problems()` and starts `.github/workflows/copy-edit.yml`, which builds a sheet from them (`scripts/copy-edit-csv.mts`) and runs `pnpm copy:import <sheet> --branch copy-edit-YYYYMMDD-HHMMSS-xxxx`; the `--branch` flag exists only so the editor can find the PR by branch. Tokens: `COPY_EDIT_DISPATCH_TOKEN` (staging Vercel project, Actions write + Pull requests read) and `COPY_EDIT_PR_TOKEN` (Actions secret, Contents + Pull requests write); inside the import only `git fetch`, `git push` and `gh pr create` see a token.
- **The import keeps the tests passing** (`scripts/lib/copy-sheet/test-rewrite.mts`). For every changed row it finds test literals (`src/**` and `scripts/**` `*.test.ts|tsx|mts`) equal to the row's OLD text and rewrites each to read the copy leaf: an import of the copy module (an existing import is reused or extended, an alias honoured) and a reference to the key, so the test follows the sheet. The PR body's `## Tests` section lists every rewritten file and, as **Test needs a hand edit**, every match it would not rewrite: a one-word text (may be a fixture), a text shared by two leaves (ambiguous), a function or computed leaf, a literal inside a snapshot call, a hoisted `vi.mock`, a test title or a `+` built string, a name already used in the file, a copy module's own test, a script test. The import still opens the PR with those listed. **Limits:** a snapshot file (`.snap`), an inline snapshot's formatted text, a regex, and a string a test assembles from pieces are not seen, so CI can still go red on them; `check:test-copy-literals` keeps new tests from adding more.
- **Copy-review before the PR lands.** The PR body's old -> new table is the review input (voice, vocabulary, the rules a machine cannot decide). The import only checks what a machine can.

## The sheet

Columns: `key` (`src/lib/copy/<file>#path.to.leaf`), `file`, `kind` (`text`, `branch`, `edit in code`), `current text`, `placeholders` (the row's fill-ins: every `{name}` it may use), `context (read only)`, `new text`.

- A function leaf (`(ago) => \`Last active ${ago}\``) is a template: `Last active {ago}`. The arrow function stays.
- Each text node of a function is its own row: a ternary's two arms, the two words of `plural(n, "card", "cards")`. They get keys `...#t1`, `#t2`; the condition is in `context`, read only.
- A computed hole (`${xs.length > 1 ? ... : ...}`) is an opaque `{h1}` token. Keep it in the text; its source is in `context`.
- **Fill-ins** (`CopyRow.fills`, `walk.mts`): the row's own `{name}` holes plus each parameter of its function that prints as text (typed `string`, `number`, a string or number literal, or a union of those; not an array, object, nullable or untyped one). Every variation of a function gets the same set. A row may drop, repeat or move any of them; a row with a hole it does not have is refused. A plain string arm that gains a fill-in is written back as a template, with backtick, backslash and `${` escaped (`copy-sheet.test.mts` evaluates a hostile edit). A dropped fill-in leaves its parameter unused, so `eslint.config.mjs` turns off the unused-argument check in `src/lib/copy/**` and nowhere else (`lint-scope.test.mts`). Renaming a parameter renames its fill-in, so a sheet or editor edit holding the old name is refused as unknown.
- **Read-only ("edit in code")**: text a row cannot express: a helper call that carries text (`cartPanel("Friend")`), a function body with statements or a `switch`, text joined by a call (`names.join(" and ")`). 22 leaves today; change them in code.
- A lowercase single token in a bare leaf (`"md"`, `"asc"`) is a code value, not copy, and gets no row. Inside a function leaf every written string is shown text.

## What the import refuses (every bad row at once, with its row number; nothing is applied)

A fill-in the row does not have (dropping one is allowed), a brace outside a fill-in, an em dash (a bare `—` meaning no value is allowed), an exclamation mark, a short list of British spellings, a length cap where the key names the kind of string (label/cta/button/chip 3 words, eyebrow 5, title/head 8; a hole counts as one word), a read-only row, a key that is not in the files, and a **stale sheet** (the row's current text no longer matches the code: export again).

## Guards

- `pnpm check:inline-copy` (CI): no source file under `src/` may hold an inline user-facing string (whole tree, no allowlist); see `guards.md` for what it flags. It was diff-based until the last of the four move PRs (#3288 to this one) emptied the tree.
- `pnpm copy:tests <path>... [--write]` converts the existing test literals under a path to leaf references (bracket access for hyphenated keys; twin text resolves to the twin whose access path the component under test writes) and lists the ones that need a hand edit. Dry by default.
- `pnpm check:test-copy-literals` (CI): no test in the tree may hold a literal of two or more words equal to a copy leaf; the test imports the leaf. Whole tree, no allowlist; `src/lib/copy/**` is the one scope skip. See `guards.md`.
- `pnpm check:copy-sheet-roundtrip` (CI, `checks` list in ci.yml): an unedited export must import to zero changes. It fails on a copy shape the walker and the writer disagree about.
- `scripts/lib/copy-sheet/*.test.mts` pin each refusal above and an in-place edit per shape (quote kept, template, branch, computed hole, escaping).

Code: `scripts/lib/copy-sheet/{csv,walk,validate,sheet,land}.mts`, `scripts/copy-sheet-{export,import}.mts`.

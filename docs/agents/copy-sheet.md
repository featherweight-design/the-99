# Copy sheet

A non-engineer edits the app's wording in Google Sheets or Excel; an import turns the changed rows into a PR. Every user-facing string lives in `src/lib/copy/`, so the sheet is a table over those files.

## Run it

- `pnpm copy:sheet [out.csv]` writes the sheet to `~/Downloads/copy-sheet-<date>.csv` (a path inside the repo is refused: the sheet is working material and is never committed). Open it in Sheets or Excel and edit only the **new text** column. Leave a cell blank to leave a string alone.
- `pnpm copy:import <edited.csv>` can run from any checkout, branch or dirty tree. It makes its own worktree and branch (`copy-sheet-<utc date-time>`) from `origin/main`, applies the changed rows, runs typecheck and lint there, pushes, opens the PR with the old -> new list, and removes the worktree. It needs no published-sheet URL and no Sheets API key. `--dry` validates and prints the list without pushing; `--no-pr` stops after the commit; `--local [--root <dir>]` applies in place to a tree with no git (tests, a hand edit).
- **The import keeps the tests passing** (`scripts/lib/copy-sheet/test-rewrite.mts`). For every changed row it finds test literals (`src/**` and `scripts/**` `*.test.ts|tsx|mts`) equal to the row's OLD text and rewrites each to read the copy leaf: an import of the copy module (an existing import is reused or extended, an alias honoured) and a reference to the key, so the test follows the sheet. The PR body's `## Tests` section lists every rewritten file and, as **Test needs a hand edit**, every match it would not rewrite: a one-word text (may be a fixture), a text shared by two leaves (ambiguous), a function or computed leaf, a literal inside a snapshot call, a hoisted `vi.mock`, a test title or a `+` built string, a name already used in the file, a copy module's own test, a script test. The import still opens the PR with those listed. **Limits:** a snapshot file (`.snap`), an inline snapshot's formatted text, a regex, and a string a test assembles from pieces are not seen, so CI can still go red on them; `check:test-copy-literals` keeps new tests from adding more.
- **Copy-review before the PR lands.** The PR body's old -> new table is the review input (voice, vocabulary, the rules a machine cannot decide). The import only checks what a machine can.

## The sheet

Columns: `key` (`src/lib/copy/<file>#path.to.leaf`), `file`, `kind` (`text`, `branch`, `edit in code`), `current text`, `placeholders`, `context (read only)`, `new text`.

- A function leaf (`(ago) => \`Last active ${ago}\``) is a template: `Last active {ago}`. The arrow function stays.
- Each text node of a function is its own row: a ternary's two arms, the two words of `plural(n, "card", "cards")`. They get keys `...#t1`, `#t2`; the condition is in `context`, read only.
- A computed hole (`${xs.length > 1 ? ... : ...}`) is an opaque `{h1}` token. Keep it in the text; its source is in `context`.
- **Read-only ("edit in code")**: text a row cannot express: a helper call that carries text (`cartPanel("Friend")`), a function body with statements or a `switch`, text joined by a call (`names.join(" and ")`). 22 leaves today; change them in code.
- A lowercase single token in a bare leaf (`"md"`, `"asc"`) is a code value, not copy, and gets no row. Inside a function leaf every written string is shown text.

## What the import refuses (every bad row at once, with its row number; nothing is applied)

Placeholders that differ from the original's, an em dash (a bare `—` meaning no value is allowed), an exclamation mark, a banned tell word (`simply`, `just`, `easily`, `seamlessly`, `effortlessly`), a short list of British spellings, a length cap where the key names the kind of string (label/cta/button/chip 3 words, eyebrow 5, title/head 8; a hole counts as one word), a read-only row, a key that is not in the files, and a **stale sheet** (the row's current text no longer matches the code: export again).

## Guards

- `pnpm check:inline-copy` (CI): a diff may not add an inline user-facing string; see `guards.md` for what it flags. It flips from added-lines to the whole tree when the last move PR lands.
- `pnpm check:test-copy-literals` (CI): a diff may not add a test literal of two or more words equal to a copy leaf; the test imports the leaf. Added-lines only, no allowlist; see `guards.md`.
- `pnpm check:copy-sheet-roundtrip` (CI, `checks` list in ci.yml): an unedited export must import to zero changes. It fails on a copy shape the walker and the writer disagree about.
- `scripts/lib/copy-sheet/*.test.mts` pin each refusal above and an in-place edit per shape (quote kept, template, branch, computed hole, escaping).

Code: `scripts/lib/copy-sheet/{csv,walk,validate,sheet,land}.mts`, `scripts/copy-sheet-{export,import}.mts`.

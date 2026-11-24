// The parts of `pnpm copy:import` that decide what the PR says and what the branch is called. Kept pure so a test can
// pin them; the git and gh calls live in scripts/copy-sheet-import.mts.
import type { Change } from "./sheet.mjs";

const pad = (n: number) => String(n).padStart(2, "0");

/** `copy-sheet-20261124-1835`, in UTC, so two people on two machines cannot collide on a day. */
export function branchName(now: Date): string {
  const d = now;
  return `copy-sheet-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function commitMessage(changes: readonly Change[], files: number): string {
  return `Copy sheet: ${changes.length} wording change${changes.length === 1 ? "" : "s"} in ${files} file${files === 1 ? "" : "s"}\n\nApplied from an edited copy sheet by pnpm copy:import. Wording only; the CSV is not committed.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`;
}

/** The PR body: every old -> new pair, for the copy-review pass that runs before the PR lands. */
export function prBody(changes: readonly Change[], files: readonly string[]): string {
  const rows = changes.map((c) => `| \`${c.key.replace("src/lib/copy/", "")}\` | ${cell(c.from)} | ${cell(c.to)} |`);
  return [
    "## Summary",
    "",
    `Wording changes from an edited copy sheet (\`pnpm copy:import\`): ${changes.length} string${changes.length === 1 ? "" : "s"} in ${files.length} file${files.length === 1 ? "" : "s"}. Only the strings below changed; the import checked placeholders, em dashes, banned words, US spelling and length caps on every row.`,
    "",
    "## Design review",
    "",
    "Not applicable: wording only, no layout or component change.",
    "",
    "## Copy review",
    "",
    "Needed before this lands: read each pair against the voice and vocabulary rules (`/copy-review`). Record the result here.",
    "",
    "| Key | Old | New |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "Files: " + files.map((f) => `\`${f}\``).join(", "),
    "",
    "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
  ].join("\n");
}

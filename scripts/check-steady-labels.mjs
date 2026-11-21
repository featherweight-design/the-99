// Fails when a button swaps to a shorter label while pending and is not drawn through `SteadyLabel`. See
// scripts/lib/steady-labels.mjs for what counts as a swap; `pnpm probe:pending-width` proves the fix on a real button.
import { steadyFindings } from "./lib/steady-labels.mjs";

// Buttons that hold their width by their own means (stacked labels in one grid cell).
const OWN = new Set(["src/components/social/invite-new.tsx", "src/components/intake/intake-form.tsx"]);

// Not yet wrapped: the follow-up PR wraps these and deletes this list, so the guard then has no exceptions.
const NOT_YET = new Set([
  "src/components/admin/launch-email-card.tsx",
  "src/components/admin/override-controls.tsx",
  "src/components/collection/confirm-modal.tsx",
  "src/components/collection/history-list.tsx",
  "src/components/collection/revert-confirm.tsx",
  "src/components/collection/short-deck-warning.tsx",
  "src/components/decks/commit-sheet.tsx",
  "src/components/decks/game-log-form.tsx",
  "src/components/decks/got-it-confirm.tsx",
  "src/components/decks/got-it-receipt.tsx",
  "src/components/decks/mana-improve-door.tsx",
  "src/components/decks/notes/note-field.tsx",
  "src/components/decks/pass-sheet.tsx",
  "src/components/decks/pull-control.tsx",
  "src/components/decks/spine-desktop.tsx",
  "src/components/decks/suggested-changes-confirm.tsx",
  "src/components/decks/suggested-changes-run.tsx",
  "src/components/decks/suggestion-card.tsx",
  "src/components/decks/suggestion-line.tsx",
  "src/components/decks/suggestion-lists.tsx",
  "src/components/feedback/check-in-form.tsx",
  "src/components/settings/delete-account.tsx",
  "src/components/ui/delete-confirm.tsx",
]);

const { files, findings } = await steadyFindings();
const bare = findings.filter((f) => !OWN.has(f.path) && !NOT_YET.has(f.path));
if (bare.length === 0) {
  console.log(`every pending label swap is steady — ${files} files read`);
  process.exit(0);
}
for (const { path, line } of bare) console.error(`${path}:${line} a button swaps label while pending without SteadyLabel (it shrinks under the pointer)`);
console.error(`\n${bare.length} bare label swap(s): wrap the label in <SteadyLabel hold={[every string it can show]}>`);
process.exit(1);

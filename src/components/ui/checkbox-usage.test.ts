// One checkbox: the app draws a checkbox with `ui/checkbox.tsx` and nowhere else, except for the controls named below,
// each with the reason it is not that box. A new `type="checkbox"` or `role="checkbox"` outside the list fails here, so
// a seventh way of drawing one is a decision made in this file rather than found on a phone. Reads the tree
// (`readFileSync`, `readdirSync`), so it is in the CI selector's always set.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");
const SHARED = "src/components/ui/checkbox.tsx";

const OTHER: Record<string, string> = {
  "src/components/decks/game-log-form.tsx": "the axis tile: a worked or hurt box inside a tile, inked by its polarity, not a plain box",
  "src/components/decks/top-off-list.tsx": "the top-off row's tick column: 26px on a phone (the tap target) and a `+` when empty, geometry pinned by its design table and tests",
  "src/components/decks/resolution-expander.tsx": "the Owned only toggle: a 30px switch track, not a box",
  "src/components/decks/quick-add-bar.tsx": "the Owned only toggle: a 30px switch track, not a box",
  "src/components/admin/group-editor.tsx": "an admin member row, `role=\"checkbox\"` on a custom row",
  "src/components/decks/notes/note-row.tsx": "a note's done mark, `role=\"checkbox\"` on a custom row",
  "src/components/decks/deck-card-overflow.tsx": "the ⋯ menu's Hidden from friends row, `role=\"checkbox\"` on a menu row: a 16px box at desktop at the row's right end, a dashed border, and a locked fill when Settings set it (friend decks README 4b)",
  "src/components/rule-zero/setup-sheet.tsx": "a member's art seat in Rule 0's setup: the whole tile is the checkbox, its 24px check in the art's corner",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe("the shared checkbox", () => {
  const drawers = walk(join(ROOT, "components"))
    .filter((f) => /type="checkbox"|role="checkbox"/.test(readFileSync(f, "utf8")))
    .map((f) => f.slice(process.cwd().length + 1))
    .sort();

  it("is the only file that draws a native checkbox, beyond the named exceptions", () => {
    expect(drawers.filter((f) => f !== SHARED)).toEqual(Object.keys(OTHER).sort());
  });

  it("is imported by every surface that draws one of the app's plain checkboxes", () => {
    const users = [
      "src/components/ui/opt-in-checkbox.tsx",
      "src/components/decks/precons/precon-pick-view.tsx",
      "src/components/decks/cart/deck-select.tsx",
      "src/components/decks/cart/cart-deck-group.tsx",
      "src/components/social/pod-card.tsx",
      "src/components/social/pod-add-friends.tsx",
      "src/components/scan-lab/scan-controls.tsx",
      "src/components/scan-lab/scan-lab.tsx",
    ];
    for (const f of users) {
      expect(readFileSync(join(process.cwd(), f), "utf8"), f).toMatch(/import \{ Checkbox \} from "[./]+(?:ui\/)?checkbox"/);
    }
  });
});

// A legend's mark must come from a copy module, not be typed here.
//
// Three consecutive review rounds found retyped strings in this file — four
// tab labels, the version rail's `current`, three sort labels, the two
// grouping labels, the export dialog's two tabs, and a role label that said
// `Board wipes` where the deck page says `Wipes`. Every one was correct when
// written and stale the moment someone renamed the real thing, and every one
// was found by a human reading the diff.
//
// The instances were fixed three times. This is the class: a `mark:` in a
// legend row may not be a bare string literal. It has to be an expression —
// `gameLogCopy.form.won`, a template built from one — so a rename reaches the
// figure. A mark that is genuinely this page's own annotation goes in the
// `meaning`, which is prose and may be written here.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(join(process.cwd(), "src/components/about/figures.tsx"), "utf8");

/** Every `mark:` value in the file, with the line it sits on.
 *
 *  A row is written either on one line — `{ mark: X, meaning: "…" }` — or
 *  across several. The first version of this only matched the multi-line form,
 *  because it required the line to END after the value; it reported clean over
 *  a dozen single-line literals, which is the failure this whole file is about
 *  happening to the check itself. */
function marks(): { line: number; value: string }[] {
  return SOURCE.split("\n").flatMap((text, i) => {
    const match = text.match(/\bmark:\s*(.+?)(?:,\s*meaning:|,\s*$|\s*$)/);
    return match ? [{ line: i + 1, value: match[1].trim() }] : [];
  });
}

/** Every string the app's copy modules ship. */
function shippedStrings(): Set<string> {
  const dir = join(process.cwd(), "src/lib/copy");
  const out = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const src = readFileSync(join(dir, file), "utf8");
    for (const m of src.matchAll(/["'`]([^"'`$\n]{2,60})["'`]/g)) out.add(m[1]);
  }
  return out;
}

describe("legend marks", () => {
  it("retypes no string the app already ships", () => {
    // The rule is NOT "no literals". Plenty of marks are this page's own
    // shorthand — `draft`, `63 / 99`, `a shelf` — and those are annotation,
    // which the grammar allows and which no copy module owns.
    //
    // What is a defect is a literal that DUPLICATES a shipped string:
    // `Decklist`, `Shopping list`, `Board wipes`, `By type`. Those are correct
    // when written and stale the moment the real one is renamed, and three
    // consecutive review rounds found one each. A machine cannot tell an
    // annotation from a label by shape — but it can tell whether the app
    // already says it.
    // A one-word annotation can collide with an unrelated shipped word — the
    // log figure's mark was `optional`, which some copy module also says. The
    // answer is a fuller annotation rather than a looser check: `marks are
    // optional` is both clearer and unambiguous, and loosening this would give
    // back the three rounds it was written to stop.
    const shipped = shippedStrings();
    const retyped = marks()
      .map(({ line, value }) => ({ line, text: value.trim().replace(/^["'`]|["'`]$/g, ""), raw: value }))
      .filter(({ raw, text }) => /^["'`][^$]*["'`]$/.test(raw.trim()) && shipped.has(text));
    expect(
      retyped.map((l) => `figures.tsx:${l.line} "${l.text}"`),
      "this mark duplicates a shipped string — read it from its copy module",
    ).toEqual([]);
  });

  it("finds marks at all", () => {
    // The check above is vacuous if the regex stops matching — a rename of the
    // `mark` field, a formatter change — so the subject is asserted too.
    //
    // The floor FALLS as figures are rebuilt on real components: every legend
    // that becomes a mounted specimen takes its `mark` fields with it, and the
    // page is deliberately converting them. It was 20 when most of chapter 03
    // was legends and is 10 now that four entries still are. Lower it
    // deliberately when a conversion lands; never remove it, because a regex
    // matching nothing is exactly what it exists to catch.
    expect(marks().length).toBeGreaterThan(10);
  });
});

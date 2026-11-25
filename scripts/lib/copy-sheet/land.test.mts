import { describe, expect, it } from "vitest";
import { branchName, commitMessage, prBody } from "./land.mjs";

const changes = [
  { key: "src/lib/copy/a.ts#a.title", from: "Fixture title", to: "Decks" },
  { key: "src/lib/copy/a.ts#a.note", from: "a | b", to: "a\nb" },
];

describe("copy:import landing text", () => {
  it("names the branch by UTC minute", () => {
    expect(branchName(new Date("2026-11-24T18:35:59Z"))).toBe("copy-sheet-20261124-1835");
  });
  it("lists every old -> new pair, escaping a pipe and flattening a line break so the table holds", () => {
    const body = prBody(changes, ["src/lib/copy/a.ts"]);
    expect(body).toContain("| `a.ts#a.title` | Fixture title | Decks |");
    expect(body).toContain("| `a.ts#a.note` | a \\| b | a b |");
  });
  it("asks for the copy-review pass and states there is no Design round", () => {
    const body = prBody(changes, ["src/lib/copy/a.ts"]);
    expect(body).toMatch(/## Copy review/);
    expect(body).toMatch(/## Design review\n\nNot applicable/);
  });
  it("counts in the commit subject and carries no author attribution (whoever runs the import owns the commit)", () => {
    expect(commitMessage(changes, 1).split("\n")[0]).toBe("Copy sheet: 2 wording changes in 1 file");
    expect(commitMessage([changes[0]], 1).split("\n")[0]).toBe("Copy sheet: 1 wording change in 1 file");
    expect(commitMessage(changes, 1)).not.toContain("Co-Authored-By");
  });
});

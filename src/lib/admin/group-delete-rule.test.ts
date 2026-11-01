// Delete a group (small items 9, item 7), the pure half: which refusal the foot draws (only a LIVE flyer code
// blocks), the confirm's lead and facts with their plurals, and the bounded `?deleted=` name the toast reads.
import { describe, expect, it } from "vitest";
import { adminCopy } from "../copy/admin";
import { deleteConfirm, deletedParam, deleteLine, deleteState, type GroupCard } from "./groups-rule";

const copy = adminCopy.groups.delete;
const live = (code: string) => ({ code, revoked: false });
const revoked = (code: string) => ({ code, revoked: true });

describe("deleteState and deleteLine", () => {
  it("lets an empty group go, a revoked code included, and draws the hint", () => {
    expect(deleteState(0, [])).toEqual({ kind: "open" });
    expect(deleteState(0, [revoked("MOXB7K")])).toEqual({ kind: "open" });
    expect(deleteLine({ kind: "open" })).toEqual({ text: "Only an empty group can go: no members, no flyer codes.", refused: false, codesLink: false });
  });

  it("refuses members alone, with the count", () => {
    expect(deleteState(2, [revoked("MOXB7K")])).toEqual({ kind: "members", members: 2 });
    expect(deleteLine(deleteState(2, []))).toEqual({ text: "It still has 2 members. Unselect them above and save, then delete it.", refused: true, codesLink: false });
    expect(deleteLine(deleteState(1, [])).text).toBe("It still has 1 member. Unselect that member above and save, then delete it.");
  });

  it("refuses a live code alone, naming the first live one, with the Flyer codes link", () => {
    expect(deleteState(0, [revoked("AAAAAA"), live("MOXB7K"), live("K2P9QX")])).toEqual({ kind: "code", code: "MOXB7K" });
    expect(deleteLine(deleteState(0, [live("MOXB7K")]))).toEqual({ text: "It has the live flyer code MOXB7K. Revoke it on Invites first.", refused: true, codesLink: true });
  });

  it("refuses both in one line", () => {
    expect(deleteLine(deleteState(2, [live("MOXB7K")]))).toEqual({
      text: "It still has 2 members and the live flyer code MOXB7K. Only an empty group can go: no members, no flyer codes.",
      refused: true,
      codesLink: true,
    });
  });
});

describe("deleteConfirm", () => {
  const o = (label: string): GroupCard["overrides"][number] => ({ name: "FEEDBACK_ENABLED", label, value: "on" });

  it("draws the board's confirm: two overrides in words, named, and no codes", () => {
    const c = deleteConfirm("1337-testers", [o("Overview v2"), o("Suggested changes v2")], []);
    expect(c.title).toBe("Delete 1337-testers?");
    expect(c.lead).toBe(
      "It’s empty, so deleting it changes nothing for any account. Its two feature-flag settings are removed with it, and the name is free to use again.",
    );
    expect(c.facts).toEqual([
      ["Members", "None."],
      ["Flyer codes", "None."],
      ["Overrides", "Overview v2 on and Suggested changes v2 on go with it. They reach nobody now."],
      ["History", "Kept in the admin log, under the group’s name."],
    ]);
  });

  it("handles none and one override, and lists revoked codes", () => {
    const none = deleteConfirm("beta", [], [revoked("MOXB7K"), revoked("K2P9QX")]);
    expect(none.lead).toBe("It’s empty, so deleting it changes nothing for any account. It has no feature-flag settings, and the name is free to use again.");
    expect(none.facts[1]).toEqual(["Flyer codes", "MOXB7K and K2P9QX, revoked. They stay on Invites with no group."]);
    expect(none.facts[2]).toEqual(["Overrides", "None."]);
    const one = deleteConfirm("beta", [o("Overview v2")], [revoked("MOXB7K")]);
    expect(one.lead).toContain("Its one feature-flag setting is removed with it");
    expect(one.facts[1][1]).toBe("MOXB7K, revoked. It stays on Invites with no group.");
    expect(one.facts[2][1]).toBe("Overview v2 on goes with it. It reaches nobody now.");
    expect(copy.lead(12)).toContain("Its 12 feature-flag settings");
  });

  it("carries no em dash in any delete string", () => {
    const strings = [copy.action, copy.hint, copy.refusedMembers(2), copy.refusedCode("X"), copy.refusedBoth(2, "X"), copy.lead(2), copy.raced("g"), copy.failed, copy.lost, copy.toast("g")];
    for (const s of strings) expect(s).not.toContain("—");
  });
});

describe("deletedParam", () => {
  it("takes only a name a group could have held", () => {
    expect(deletedParam("1337-testers")).toBe("1337-testers");
    expect(deletedParam(undefined)).toBeNull();
    expect(deletedParam(["a", "b"])).toBeNull();
    expect(deletedParam("<script>")).toBeNull();
    expect(deletedParam("a".repeat(41))).toBeNull();
    expect(deletedParam("Founders")).toBeNull();
  });
});
